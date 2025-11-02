const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { executeQuery } = require('../config/database');
const { verifyToken, requireRole } = require('../middleware/auth');
const { APIError, asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Helper function for validation
const validateRequest = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new APIError('Validation failed', 400, 'VALIDATION_ERROR');
  }
};

/**
 * @swagger
 * /api/groups:
 *   get:
 *     summary: Get all groups
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', verifyToken, asyncHandler(async (req, res) => {
  const { course_id } = req.query;
  const userId = req.user.id;
  const userRole = req.user.role;
  
  let query = `
    SELECT 
      g.*,
      c.name as course_name,
      c.code as course_code,
      u.name as instructor_name,
      COUNT(DISTINCT gm.student_id) as member_count
    FROM course_groups g
    LEFT JOIN courses c ON g.course_id = c.id
    LEFT JOIN users u ON c.instructor_id = u.id
    LEFT JOIN group_members gm ON g.id = gm.group_id
    WHERE 1=1
  `;
  const params = [];
  
  // Filtrar según rol
  if (userRole === 'student') {
    query += ` AND EXISTS (
      SELECT 1 FROM group_members gm2 
      WHERE gm2.group_id = g.id AND gm2.student_id = ?
    )`;
    params.push(userId);
  } else if (userRole === 'instructor') {
    query += ` AND c.instructor_id = ?`;
    params.push(userId);
  }
  
  if (course_id) {
    query += ` AND g.course_id = ?`;
    params.push(course_id);
  }
  
  query += ` GROUP BY g.id ORDER BY c.name, g.name`;
  
  const groups = await executeQuery(query, params);
  
  res.json({
    success: true,
    data: groups
  });
}));

/**
 * @swagger
 * /api/groups/{id}:
 *   get:
 *     summary: Get group by ID with members
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id',
  verifyToken,
  [param('id').isInt().withMessage('Group ID must be an integer')],
  asyncHandler(async (req, res) => {
    validateRequest(req);
    
    const groupId = req.params.id;
    
    // Obtener información del grupo
    const groups = await executeQuery(`
      SELECT 
        g.*,
        c.name as course_name,
        c.code as course_code,
        c.instructor_id,
        u.name as instructor_name
      FROM course_groups g
      JOIN courses c ON g.course_id = c.id
      JOIN users u ON c.instructor_id = u.id
      WHERE g.id = ?
    `, [groupId]);
    
    if (groups.length === 0) {
      throw new APIError('Group not found', 404, 'GROUP_NOT_FOUND');
    }
    
    const group = groups[0];
    
    // Verificar permisos
    if (req.user.role === 'student') {
      const [isMember] = await executeQuery(
        'SELECT 1 FROM group_members WHERE group_id = ? AND student_id = ?',
        [groupId, req.user.id]
      );
      if (!isMember) {
        throw new APIError('Unauthorized', 403, 'UNAUTHORIZED');
      }
    } else if (req.user.role === 'instructor' && group.instructor_id !== req.user.id) {
      throw new APIError('Unauthorized', 403, 'UNAUTHORIZED');
    }
    
    // Obtener miembros del grupo
    const members = await executeQuery(`
      SELECT 
        u.id,
        u.name,
        u.email,
        gm.joined_at,
        gm.role as member_role
      FROM group_members gm
      JOIN users u ON gm.student_id = u.id
      WHERE gm.group_id = ?
      ORDER BY u.name
    `, [groupId]);
    
    group.members = members;
    
    res.json({
      success: true,
      data: group
    });
  })
);

/**
 * @swagger
 * /api/groups:
 *   post:
 *     summary: Create new group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 */
router.post('/',
  verifyToken,
  // Permitir que estudiantes también creen grupos
  [
    body('name').trim().isLength({ min: 3, max: 255 }).withMessage('Name must be between 3 and 255 characters'),
    body('course_id').isInt().withMessage('Course ID must be an integer'),
    body('description').optional().isString(),
    body('max_members').optional().isInt({ min: 1, max: 100 })
  ],
  asyncHandler(async (req, res) => {
    validateRequest(req);
    
    const { name, course_id, description, max_members } = req.body;
    
    // Verificar que el curso existe
    const courses = await executeQuery(
      'SELECT id, instructor_id FROM courses WHERE id = ?',
      [course_id]
    );
    
    if (courses.length === 0) {
      throw new APIError('Course not found', 404, 'COURSE_NOT_FOUND');
    }
    
    // Si es estudiante, verificar que esté inscrito en el curso
    if (req.user.role === 'student') {
      const enrollment = await executeQuery(
        'SELECT 1 FROM course_enrollments WHERE course_id = ? AND student_id = ? AND status = "active"',
        [course_id, req.user.id]
      );
      if (enrollment.length === 0) {
        throw new APIError('You must be enrolled in this course to create a group', 403, 'NOT_ENROLLED');
      }
    } else if (req.user.role === 'instructor' && courses[0].instructor_id !== req.user.id) {
      throw new APIError('Unauthorized to create group for this course', 403, 'UNAUTHORIZED');
    }
    
    // Verificar que no exista un grupo con el mismo nombre en el curso
    const existingGroups = await executeQuery(
      'SELECT id FROM course_groups WHERE course_id = ? AND name = ?',
      [course_id, name]
    );
    
    if (existingGroups.length > 0) {
      throw new APIError('A group with this name already exists in the course', 409, 'GROUP_EXISTS');
    }
    
    // Generar código único
    const join_code = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    const result = await executeQuery(`
      INSERT INTO course_groups (name, course_id, description, max_members, join_code, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [name, course_id, description || null, max_members || 30, join_code, req.user.id]);
    
    const groupId = result.insertId;
    
    // Si es estudiante, agregarlo automáticamente como miembro del grupo
    if (req.user.role === 'student') {
      await executeQuery(`
        INSERT INTO group_members (group_id, student_id, role)
        VALUES (?, ?, 'leader')
      `, [groupId, req.user.id]);
    }
    
    res.status(201).json({
      success: true,
      message: 'Group created successfully',
      data: { groupId, join_code }
    });
  })
);

/**
 * @swagger
 * /api/groups/{id}:
 *   put:
 *     summary: Update group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id',
  verifyToken,
  requireRole('admin', 'instructor'),
  [
    param('id').isInt().withMessage('Group ID must be an integer'),
    body('name').optional().trim().isLength({ min: 3, max: 255 }),
    body('description').optional().isString(),
    body('max_members').optional().isInt({ min: 1, max: 100 })
  ],
  asyncHandler(async (req, res) => {
    validateRequest(req);
    
    const groupId = req.params.id;
    const updates = req.body;
    
    // Verificar que el grupo existe y el usuario tiene permisos
    const groups = await executeQuery(`
      SELECT g.*, c.instructor_id
      FROM course_groups g
      JOIN courses c ON g.course_id = c.id
      WHERE g.id = ?
    `, [groupId]);
    
    if (groups.length === 0) {
      throw new APIError('Group not found', 404, 'GROUP_NOT_FOUND');
    }
    
    const group = groups[0];
    
    if (req.user.role === 'instructor' && group.instructor_id !== req.user.id) {
      throw new APIError('Unauthorized', 403, 'UNAUTHORIZED');
    }
    
    // Construir query de actualización
    const updateFields = [];
    const updateValues = [];
    
    Object.keys(updates).forEach(key => {
      if (['name', 'description', 'max_members'].includes(key) && updates[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        updateValues.push(updates[key]);
      }
    });
    
    if (updateFields.length === 0) {
      throw new APIError('No fields to update', 400, 'NO_UPDATES');
    }
    
    updateValues.push(groupId);
    
    await executeQuery(`
      UPDATE course_groups SET ${updateFields.join(', ')} WHERE id = ?
    `, updateValues);
    
    res.json({
      success: true,
      message: 'Group updated successfully'
    });
  })
);

/**
 * @swagger
 * /api/groups/{id}:
 *   delete:
 *     summary: Delete group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id',
  verifyToken,
  requireRole('admin', 'instructor'),
  [param('id').isInt().withMessage('Group ID must be an integer')],
  asyncHandler(async (req, res) => {
    validateRequest(req);
    
    const groupId = req.params.id;
    
    // Verificar permisos
    const groups = await executeQuery(`
      SELECT g.*, c.instructor_id
      FROM course_groups g
      JOIN courses c ON g.course_id = c.id
      WHERE g.id = ?
    `, [groupId]);
    
    if (groups.length === 0) {
      throw new APIError('Group not found', 404, 'GROUP_NOT_FOUND');
    }
    
    const group = groups[0];
    
    if (req.user.role === 'instructor' && group.instructor_id !== req.user.id) {
      throw new APIError('Unauthorized', 403, 'UNAUTHORIZED');
    }
    
    // Eliminar grupo (los miembros se eliminan por CASCADE)
    await executeQuery('DELETE FROM course_groups WHERE id = ?', [groupId]);
    
    res.json({
      success: true,
      message: 'Group deleted successfully'
    });
  })
);

/**
 * @swagger
 * /api/groups/{id}/members:
 *   post:
 *     summary: Add member to group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/members',
  verifyToken,
  requireRole('admin', 'instructor'),
  [
    param('id').isInt().withMessage('Group ID must be an integer'),
    body('student_id').isInt().withMessage('Student ID must be an integer'),
    body('role').optional().isIn(['member', 'leader']).withMessage('Role must be member or leader')
  ],
  asyncHandler(async (req, res) => {
    validateRequest(req);
    
    const groupId = req.params.id;
    const { student_id, role } = req.body;
    
    // Verificar permisos sobre el grupo
    const groups = await executeQuery(`
      SELECT g.*, c.instructor_id, c.id as course_id
      FROM course_groups g
      JOIN courses c ON g.course_id = c.id
      WHERE g.id = ?
    `, [groupId]);
    
    if (groups.length === 0) {
      throw new APIError('Group not found', 404, 'GROUP_NOT_FOUND');
    }
    
    const group = groups[0];
    
    if (req.user.role === 'instructor' && group.instructor_id !== req.user.id) {
      throw new APIError('Unauthorized', 403, 'UNAUTHORIZED');
    }
    
    // Verificar que el estudiante existe y está inscrito en el curso
    const [enrollment] = await executeQuery(`
      SELECT 1 FROM course_enrollments 
      WHERE course_id = ? AND student_id = ? AND status = 'active'
    `, [group.course_id, student_id]);
    
    if (!enrollment) {
      throw new APIError('Student not enrolled in course', 400, 'NOT_ENROLLED');
    }
    
    // Verificar que no sea miembro ya
    const [existingMember] = await executeQuery(
      'SELECT 1 FROM group_members WHERE group_id = ? AND student_id = ?',
      [groupId, student_id]
    );
    
    if (existingMember) {
      throw new APIError('Student is already a member of this group', 409, 'ALREADY_MEMBER');
    }
    
    // Verificar límite de miembros
    const [memberCount] = await executeQuery(
      'SELECT COUNT(*) as count FROM group_members WHERE group_id = ?',
      [groupId]
    );
    
    if (memberCount.count >= group.max_members) {
      throw new APIError('Group is full', 409, 'GROUP_FULL');
    }
    
    // Agregar miembro
    await executeQuery(`
      INSERT INTO group_members (group_id, student_id, role)
      VALUES (?, ?, ?)
    `, [groupId, student_id, role || 'member']);
    
    res.status(201).json({
      success: true,
      message: 'Member added successfully'
    });
  })
);

/**
 * @swagger
 * /api/groups/{id}/members/{studentId}:
 *   delete:
 *     summary: Remove member from group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id/members/:studentId',
  verifyToken,
  requireRole('admin', 'instructor'),
  [
    param('id').isInt().withMessage('Group ID must be an integer'),
    param('studentId').isInt().withMessage('Student ID must be an integer')
  ],
  asyncHandler(async (req, res) => {
    validateRequest(req);
    
    const groupId = req.params.id;
    const studentId = req.params.studentId;
    
    // Verificar permisos
    const groups = await executeQuery(`
      SELECT g.*, c.instructor_id
      FROM course_groups g
      JOIN courses c ON g.course_id = c.id
      WHERE g.id = ?
    `, [groupId]);
    
    if (groups.length === 0) {
      throw new APIError('Group not found', 404, 'GROUP_NOT_FOUND');
    }
    
    const group = groups[0];
    
    if (req.user.role === 'instructor' && group.instructor_id !== req.user.id) {
      throw new APIError('Unauthorized', 403, 'UNAUTHORIZED');
    }
    
    // Eliminar miembro
    const result = await executeQuery(
      'DELETE FROM group_members WHERE group_id = ? AND student_id = ?',
      [groupId, studentId]
    );
    
    if (result.affectedRows === 0) {
      throw new APIError('Member not found in group', 404, 'MEMBER_NOT_FOUND');
    }
    
    res.json({
      success: true,
      message: 'Member removed successfully'
    });
  })
);

/**
 * @swagger
 * /api/groups/my-groups:
 *   get:
 *     summary: Get user's groups
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 */
router.get('/my/groups', verifyToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  
  let groups = [];
  
  if (userRole === 'student') {
    // Obtener grupos donde es miembro
    groups = await executeQuery(`
      SELECT 
        g.*,
        c.name as course_name,
        c.code as course_code,
        u.name as instructor_name,
        gm.role as my_role,
        gm.joined_at,
        COUNT(DISTINCT gm2.student_id) as member_count
      FROM group_members gm
      JOIN course_groups g ON gm.group_id = g.id
      JOIN courses c ON g.course_id = c.id
      JOIN users u ON c.instructor_id = u.id
      LEFT JOIN group_members gm2 ON g.id = gm2.group_id
      WHERE gm.student_id = ?
      GROUP BY g.id
      ORDER BY c.name, g.name
    `, [userId]);
  } else if (userRole === 'instructor') {
    // Obtener grupos de sus cursos
    groups = await executeQuery(`
      SELECT 
        g.*,
        c.name as course_name,
        c.code as course_code,
        COUNT(DISTINCT gm.student_id) as member_count
      FROM course_groups g
      JOIN courses c ON g.course_id = c.id
      LEFT JOIN group_members gm ON g.id = gm.group_id
      WHERE c.instructor_id = ?
      GROUP BY g.id
      ORDER BY c.name, g.name
    `, [userId]);
  } else if (userRole === 'admin') {
    // Obtener todos los grupos
    groups = await executeQuery(`
      SELECT 
        g.*,
        c.name as course_name,
        c.code as course_code,
        u.name as instructor_name,
        COUNT(DISTINCT gm.student_id) as member_count
      FROM course_groups g
      JOIN courses c ON g.course_id = c.id
      JOIN users u ON c.instructor_id = u.id
      LEFT JOIN group_members gm ON g.id = gm.group_id
      GROUP BY g.id
      ORDER BY c.name, g.name
    `);
  }
  
  res.json({
    success: true,
    data: groups
  });
}));

/**
 * @swagger
 * /api/groups/join-by-code:
 *   post:
 *     summary: Join a group using invite code
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 */
router.post('/join-by-code',
  verifyToken,
  [body('join_code').trim().isLength({ min: 6, max: 10 }).withMessage('Invalid join code')],
  asyncHandler(async (req, res) => {
    validateRequest(req);
    
    const { join_code } = req.body;
    const userId = req.user.id;
    
    // Buscar grupo por código
    const groups = await executeQuery(`
      SELECT g.*, c.id as course_id, c.name as course_name
      FROM course_groups g
      JOIN courses c ON g.course_id = c.id
      WHERE g.join_code = ? AND g.is_active = TRUE
    `, [join_code.toUpperCase()]);
    
    if (groups.length === 0) {
      throw new APIError('Invalid join code', 404, 'INVALID_CODE');
    }
    
    const group = groups[0];
    
    // Verificar que el estudiante esté inscrito en el curso
    if (req.user.role === 'student') {
      const [enrollment] = await executeQuery(
        'SELECT 1 FROM course_enrollments WHERE course_id = ? AND student_id = ? AND status = "active"',
        [group.course_id, userId]
      );
      
      if (!enrollment) {
        throw new APIError('You must be enrolled in the course to join this group', 403, 'NOT_ENROLLED');
      }
    }
    
    // Verificar que no sea miembro ya
    const [existingMember] = await executeQuery(
      'SELECT 1 FROM group_members WHERE group_id = ? AND student_id = ?',
      [group.id, userId]
    );
    
    if (existingMember) {
      throw new APIError('You are already a member of this group', 409, 'ALREADY_MEMBER');
    }
    
    // Verificar límite de miembros
    const [memberCount] = await executeQuery(
      'SELECT COUNT(*) as count FROM group_members WHERE group_id = ?',
      [group.id]
    );
    
    if (memberCount.count >= group.max_members) {
      throw new APIError('Group is full', 409, 'GROUP_FULL');
    }
    
    // Agregar al grupo
    await executeQuery(
      'INSERT INTO group_members (group_id, student_id, role) VALUES (?, ?, "member")',
      [group.id, userId]
    );
    
    res.status(201).json({
      success: true,
      message: `Successfully joined group: ${group.name}`,
      data: {
        group_id: group.id,
        group_name: group.name,
        course_name: group.course_name
      }
    });
  })
);

/**
 * @swagger
 * /api/groups/{id}/messages:
 *   get:
 *     summary: Get group chat messages
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id/messages',
  verifyToken,
  [param('id').isInt().withMessage('Group ID must be an integer')],
  asyncHandler(async (req, res) => {
    validateRequest(req);
    
    const groupId = req.params.id;
    const { limit = 100, before } = req.query;
    
    // Verificar que el usuario es miembro del grupo
    const [membership] = await executeQuery(
      'SELECT 1 FROM group_members WHERE group_id = ? AND student_id = ?',
      [groupId, req.user.id]
    );
    
    if (!membership && req.user.role !== 'admin') {
      throw new APIError('You must be a member to view messages', 403, 'NOT_MEMBER');
    }
    
    let query = `
      SELECT 
        m.*,
        u.name as user_name,
        u.email as user_email
      FROM group_messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.group_id = ?
    `;
    const params = [groupId];
    
    if (before) {
      query += ' AND m.id < ?';
      params.push(before);
    }
    
    query += ' ORDER BY m.created_at DESC LIMIT ?';
    params.push(parseInt(limit));
    
    const messages = await executeQuery(query, params);
    
    res.json({
      success: true,
      data: messages.reverse()
    });
  })
);

/**
 * @swagger
 * /api/groups/{id}/messages:
 *   post:
 *     summary: Send message to group chat
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/messages',
  verifyToken,
  [
    param('id').isInt().withMessage('Group ID must be an integer'),
    body('message').optional().trim().isLength({ min: 1, max: 5000 }).withMessage('Message must be between 1 and 5000 characters')
  ],
  asyncHandler(async (req, res) => {
    validateRequest(req);
    
    const groupId = req.params.id;
    const { message } = req.body;
    const userId = req.user.id;
    
    // Verificar que el usuario es miembro del grupo
    const [membership] = await executeQuery(
      'SELECT 1 FROM group_members WHERE group_id = ? AND student_id = ?',
      [groupId, userId]
    );
    
    if (!membership && req.user.role !== 'admin') {
      throw new APIError('You must be a member to send messages', 403, 'NOT_MEMBER');
    }
    
    if (!message || message.trim() === '') {
      throw new APIError('Message cannot be empty', 400, 'EMPTY_MESSAGE');
    }
    
    // Insertar mensaje
    const result = await executeQuery(
      'INSERT INTO group_messages (group_id, user_id, message) VALUES (?, ?, ?)',
      [groupId, userId, message]
    );
    
    // Obtener el mensaje creado con información del usuario
    const [newMessage] = await executeQuery(`
      SELECT 
        m.*,
        u.name as user_name,
        u.email as user_email
      FROM group_messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.id = ?
    `, [result.insertId]);
    
    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: newMessage
    });
  })
);

module.exports = router;
