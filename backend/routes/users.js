const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { executeQuery, getPaginatedResults } = require('../config/database');
const { verifyToken, requireAdmin, requireOwnerOrRole } = require('../middleware/auth');
const { APIError, asyncHandler } = require('../middleware/errorHandler');

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
  })
);

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
