const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult, query, param } = require('express-validator');
const { executeQuery, getPaginatedResults } = require('../config/database');
const { verifyToken, requireAdmin, requireOwnerOrRole } = require('../middleware/auth');
const { APIError, asyncHandler } = require('../middleware/errorHandler');
const { auditLogger } = require('../middleware/auditLogger');
const db = require('../config/database');

const router = express.Router();

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [admin, instructor, student]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       403:
 *         description: Insufficient permissions
 */
router.get('/',
  verifyToken,
  requireAdmin,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('role').optional().isIn(['admin', 'instructor', 'student']),
    query('search').optional().isString().trim()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new APIError('Validation failed', 400, 'VALIDATION_ERROR');
    }

    const { page = 1, limit = 10, role, search } = req.query;

    let whereConditions = [];
    let params = [];

    if (role) {
      whereConditions.push('role = ?');
      params.push(role);
    }

    if (search) {
      whereConditions.push('(name LIKE ? OR email LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const baseQuery = `
      SELECT id, name, email, role, email_verified, is_active, 
             registration_date, last_login
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
    `;

    const countQuery = `SELECT COUNT(*) as count FROM users ${whereClause}`;

    const result = await getPaginatedResults(baseQuery, countQuery, params, page, limit);

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  })
);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id',
  verifyToken,
  requireOwnerOrRole('id', 'admin'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const users = await executeQuery(
      `SELECT id, name, email, role, email_verified, is_active, 
              registration_date, last_login, privacy_consent, terms_accepted
       FROM users WHERE id = ?`,
      [id]
    );

    if (users.length === 0) {
      throw new APIError('User not found', 404, 'USER_NOT_FOUND');
    }

    res.json({
      success: true,
      data: users[0]
    });
  })
);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id',
  verifyToken,
  requireOwnerOrRole('id', 'admin'),
  [
    body('name').optional().trim().isLength({ min: 2, max: 255 }),
    body('email').optional().isEmail().normalizeEmail(),
    body('role').optional().isIn(['admin', 'instructor', 'student'])
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new APIError('Validation failed', 400, 'VALIDATION_ERROR');
    }

    const { id } = req.params;
    const updates = req.body;

    // Check if user exists
    const existingUsers = await executeQuery('SELECT id, role FROM users WHERE id = ?', [id]);
    if (existingUsers.length === 0) {
      throw new APIError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Only admins can change roles
    if (updates.role && req.user.role !== 'admin') {
      delete updates.role;
    }

    // Only admins can update other users' basic info
    if (req.user.id !== parseInt(id) && req.user.role !== 'admin') {
      // Students can only update their own basic info
      const allowedFields = ['name'];
      Object.keys(updates).forEach(key => {
        if (!allowedFields.includes(key)) {
          delete updates[key];
        }
      });
    }

    // Check if email is already taken by another user
    if (updates.email) {
      const emailCheck = await executeQuery(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [updates.email, id]
      );
      if (emailCheck.length > 0) {
        throw new APIError('Email already exists', 409, 'EMAIL_EXISTS');
      }
    }

    // Build update query
    const updateFields = Object.keys(updates);
    if (updateFields.length === 0) {
      throw new APIError('No valid fields to update', 400, 'NO_UPDATE_FIELDS');
    }

    const setClause = updateFields.map(field => `${field} = ?`).join(', ');
    const values = updateFields.map(field => updates[field]);

    await executeQuery(
      `UPDATE users SET ${setClause}, updated_at = NOW() WHERE id = ?`,
      [...values, id]
    );

    // Get updated user
    const updatedUsers = await executeQuery(
      `SELECT id, name, email, role, email_verified, is_active, 
              registration_date, last_login
       FROM users WHERE id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUsers[0]
    });
  })
);

// Crear nuevo usuario (solo admins)
router.post('/',
  verifyToken,
  requireAdmin,
  [
    body('name').trim().isLength({ min: 2, max: 255 }).withMessage('Name must be 2-255 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['admin', 'instructor', 'student']).withMessage('Invalid role'),
    body('is_active').optional().isBoolean().withMessage('is_active must be boolean')
  ],
  auditLogger,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, password, role, is_active = true } = req.body;

    // Check if email already exists
    const [existingUsers] = await db.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: 'Email already exists' 
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const [result] = await db.execute(`
      INSERT INTO users (name, email, password_hash, role, is_active, email_verified, 
                        privacy_consent, terms_accepted)
      VALUES (?, ?, ?, ?, ?, TRUE, TRUE, TRUE)
    `, [name, email, hashedPassword, role, is_active]);

    // Get created user (without password)
    const [newUsers] = await db.execute(`
      SELECT id, name, email, role, email_verified, is_active, 
             registration_date, last_login
      FROM users WHERE id = ?
    `, [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: newUsers[0]
    });
  })
);

// Eliminar usuario (solo admins)
router.delete('/:id',
  verifyToken,
  requireAdmin,
  [
    param('id').isInt().withMessage('Invalid user ID')
  ],
  auditLogger,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const userId = req.params.id;

    // Check if user exists
    const [users] = await db.execute(
      'SELECT id, role, name, email FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const user = users[0];

    // Prevent self-deletion
    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete your own account' 
      });
    }

    // Check if user has active enrollments or courses
    const [enrollmentCheck] = await db.execute(
      'SELECT COUNT(*) as count FROM course_enrollments WHERE student_id = ? AND status = "active"',
      [userId]
    );

    const [instructorCheck] = await db.execute(
      'SELECT COUNT(*) as count FROM courses WHERE instructor_id = ? AND is_active = TRUE',
      [userId]
    );

    if (enrollmentCheck[0].count > 0 || instructorCheck[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete user with active enrollments or courses. Please transfer or complete them first.'
      });
    }

    // Soft delete by deactivating user
    await db.execute(
      'UPDATE users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [userId]
    );

    res.json({
      success: true,
      message: `User ${user.name} has been deactivated successfully`
    });
  })
);

// Cambiar contraseña
router.patch('/:id/password',
  verifyToken,
  requireOwnerOrRole('id', 'admin'),
  [
    param('id').isInt().withMessage('Invalid user ID'),
    body('current_password').if((value, { req }) => {
      return req.user.role !== 'admin' || parseInt(req.params.id) === req.user.id;
    }).notEmpty().withMessage('Current password required'),
    body('new_password').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
    body('confirm_password').custom((value, { req }) => {
      if (value !== req.body.new_password) {
        throw new Error('Password confirmation does not match');
      }
      return true;
    })
  ],
  auditLogger,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const userId = req.params.id;
    const { current_password, new_password } = req.body;
    const isOwnPassword = parseInt(userId) === req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Get user
    const [users] = await db.execute(
      'SELECT id, password_hash FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const user = users[0];

    // Verify current password (required if user is changing own password or admin is changing their own)
    if (isOwnPassword || (isAdmin && parseInt(userId) === req.user.id)) {
      const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password_hash);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ 
          success: false, 
          message: 'Current password is incorrect' 
        });
      }
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(new_password, saltRounds);

    // Update password
    await db.execute(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedNewPassword, userId]
    );

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  })
);

// Activar/Desactivar usuario (solo admins)
router.patch('/:id/toggle-active',
  verifyToken,
  requireAdmin,
  [
    param('id').isInt().withMessage('Invalid user ID')
  ],
  auditLogger,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const userId = req.params.id;

    // Check if user exists
    const [users] = await db.execute(
      'SELECT id, is_active, name FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const user = users[0];
    const newStatus = !user.is_active;

    // Prevent self-deactivation
    if (parseInt(userId) === req.user.id && !newStatus) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot deactivate your own account' 
      });
    }

    // Update status
    await db.execute(
      'UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newStatus, userId]
    );

    res.json({
      success: true,
      message: `User ${user.name} has been ${newStatus ? 'activated' : 'deactivated'} successfully`,
      is_active: newStatus
    });
  })
);

// Obtener estadísticas de usuarios (solo admins)
router.get('/stats/overview',
  verifyToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const [stats] = await db.execute(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_users,
        COUNT(CASE WHEN role = 'student' THEN 1 END) as total_students,
        COUNT(CASE WHEN role = 'instructor' THEN 1 END) as total_instructors,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as total_admins,
        COUNT(CASE WHEN email_verified = TRUE THEN 1 END) as verified_users,
        COUNT(CASE WHEN registration_date >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as recent_registrations
      FROM users
    `);

    // Registrations by month (last 12 months)
    const [registrationTrend] = await db.execute(`
      SELECT 
        DATE_FORMAT(registration_date, '%Y-%m') as month,
        COUNT(*) as registrations
      FROM users
      WHERE registration_date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(registration_date, '%Y-%m')
      ORDER BY month
    `);

    // Most active users (by last login)
    const [activeUsers] = await db.execute(`
      SELECT 
        id,
        name,
        email,
        role,
        last_login
      FROM users
      WHERE is_active = TRUE AND last_login IS NOT NULL
      ORDER BY last_login DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        overview: stats[0],
        registrationTrend: registrationTrend,
        recentActiveUsers: activeUsers
      }
    });
  })
);

// Buscar usuarios (mejorado)
router.get('/search/advanced',
  verifyToken,
  requireAdmin,
  [
    query('q').optional().isString().trim(),
    query('role').optional().isIn(['admin', 'instructor', 'student']),
    query('status').optional().isIn(['active', 'inactive', 'all']),
    query('verified').optional().isBoolean(),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { q, role, status = 'all', verified, limit = 20 } = req.query;
    
    let conditions = [];
    let params = [];

    if (q) {
      conditions.push('(name LIKE ? OR email LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }

    if (role) {
      conditions.push('role = ?');
      params.push(role);
    }

    if (status === 'active') {
      conditions.push('is_active = TRUE');
    } else if (status === 'inactive') {
      conditions.push('is_active = FALSE');
    }

    if (verified !== undefined) {
      conditions.push('email_verified = ?');
      params.push(verified);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const [users] = await db.execute(`
      SELECT 
        id,
        name,
        email,
        role,
        is_active,
        email_verified,
        registration_date,
        last_login,
        (
          SELECT COUNT(*) FROM course_enrollments ce 
          WHERE ce.student_id = users.id AND ce.status = 'active'
        ) as active_enrollments,
        (
          SELECT COUNT(*) FROM courses c 
          WHERE c.instructor_id = users.id AND c.is_active = TRUE
        ) as active_courses
      FROM users
      ${whereClause}
      ORDER BY registration_date DESC
      LIMIT ?
    `, [...params, parseInt(limit)]);

    res.json({
      success: true,
      data: users,
      total: users.length
    });
  })
);

// Obtener cursos de un instructor
router.get('/:id/courses',
  verifyToken,
  [
    param('id').isInt().withMessage('Invalid user ID')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const userId = req.params.id;

    // Check permissions
    if (req.user.role !== 'admin' && req.user.id !== parseInt(userId)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions' 
      });
    }

    // Verify user exists and is instructor or admin
    const [users] = await db.execute(
      'SELECT id, role FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const user = users[0];
    if (user.role !== 'instructor' && user.role !== 'admin') {
      return res.status(400).json({ 
        success: false, 
        message: 'User is not an instructor' 
      });
    }

    // Get instructor's courses
    const [courses] = await db.execute(`
      SELECT 
        c.id,
        c.name,
        c.code,
        c.description,
        c.start_date,
        c.end_date,
        c.is_active,
        COUNT(DISTINCT ce.student_id) as enrolled_students,
        COUNT(DISTINCT t.id) as total_tasks
      FROM courses c
      LEFT JOIN course_enrollments ce ON c.id = ce.course_id AND ce.status = 'active'
      LEFT JOIN tasks t ON c.id = t.course_id AND t.is_published = TRUE
      WHERE c.instructor_id = ?
      GROUP BY c.id
      ORDER BY c.is_active DESC, c.created_at DESC
    `, [userId]);

    res.json({
      success: true,
      data: courses
    });
  })
);

module.exports = router;
      [...values, id]
    ;

    // Get updated user
    const updatedUser = await executeQuery(
      `SELECT id, name, email, role, email_verified, is_active, 
              registration_date, last_login
       FROM users WHERE id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser[0]
    });
  
;

/**
 * @swagger
 * /api/users/{id}/deactivate:
 *   patch:
 *     summary: Deactivate user account (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/deactivate',
  verifyToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check if user exists
    const users = await executeQuery('SELECT id, is_active FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      throw new APIError('User not found', 404, 'USER_NOT_FOUND');
    }

    if (!users[0].is_active) {
      throw new APIError('User is already deactivated', 400, 'ALREADY_DEACTIVATED');
    }

    await executeQuery('UPDATE users SET is_active = false WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  })
);

/**
 * @swagger
 * /api/users/{id}/activate:
 *   patch:
 *     summary: Activate user account (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/activate',
  verifyToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check if user exists
    const users = await executeQuery('SELECT id, is_active FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      throw new APIError('User not found', 404, 'USER_NOT_FOUND');
    }

    if (users[0].is_active) {
      throw new APIError('User is already active', 400, 'ALREADY_ACTIVE');
    }

    await executeQuery('UPDATE users SET is_active = true WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'User activated successfully'
    });
  })
);

/**
 * @swagger
 * /api/users/stats:
 *   get:
 *     summary: Get user statistics (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.get('/stats',
  verifyToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const stats = await executeQuery(`
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_count,
        SUM(CASE WHEN role = 'instructor' THEN 1 ELSE 0 END) as instructor_count,
        SUM(CASE WHEN role = 'student' THEN 1 ELSE 0 END) as student_count,
        SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active_users,
        SUM(CASE WHEN email_verified = true THEN 1 ELSE 0 END) as verified_users,
        SUM(CASE WHEN last_login >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as active_last_30_days
      FROM users
    `);

    // Recent registrations (last 30 days)
    const recentRegistrations = await executeQuery(`
      SELECT DATE(registration_date) as date, COUNT(*) as count
      FROM users 
      WHERE registration_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(registration_date)
      ORDER BY date ASC
    `);

    res.json({
      success: true,
      data: {
        overview: stats[0],
        recentRegistrations
      }
    });
  })
);

module.exports = router;
