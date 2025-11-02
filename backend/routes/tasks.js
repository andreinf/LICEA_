const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { auditLogger } = require('../middleware/auditLogger');
const { body, validationResult, param } = require('express-validator');
const { executeQuery } = require('../config/database');
const router = express.Router();

// Validaciones
const validateTask = [
  body('title').trim().isLength({ min: 3, max: 255 }).withMessage('El título debe tener entre 3 y 255 caracteres'),
  body('description').trim().isLength({ min: 10 }).withMessage('La descripción debe tener al menos 10 caracteres'),
  body('course_id').isInt().withMessage('ID de curso inválido'),
  body('due_date').isISO8601().withMessage('Fecha de entrega inválida'),
  body('max_grade').optional().isFloat({ min: 0 }).withMessage('Calificación máxima inválida'),
  body('submission_type').optional().isIn(['file', 'text', 'both']).withMessage('Tipo de envío inválido'),
  body('late_submission_allowed').optional().isBoolean().withMessage('Permitir envíos tardíos debe ser booleano'),
  body('late_penalty').optional().isFloat({ min: 0, max: 100 }).withMessage('Penalización por retraso inválida')
];

const validateTaskId = [
  param('id').isInt().withMessage('ID de taller inválido')
];

// Obtener todos los talleres
router.get('/', verifyToken, asyncHandler(async (req, res) => {
  const { course_id, status, limit = 50, offset = 0 } = req.query;
  let query = `
    SELECT t.*, c.name as course_name, c.code as course_code,
           COUNT(s.id) as submission_count,
           COUNT(CASE WHEN s.status = 'submitted' THEN 1 END) as submitted_count
    FROM tasks t
    JOIN courses c ON t.course_id = c.id
    LEFT JOIN submissions s ON t.id = s.task_id
    WHERE 1=1
  `;
  const params = [];

  // Filtros según rol
  if (req.user.role === 'student') {
    query += ` AND EXISTS (
      SELECT 1 FROM course_enrollments ce 
      WHERE ce.course_id = t.course_id AND ce.student_id = ? AND ce.status = 'active'
    )`;
    params.push(req.user.id);
  } else if (req.user.role === 'instructor') {
    query += ` AND c.instructor_id = ?`;
    params.push(req.user.id);
  }

  if (course_id) {
    query += ` AND t.course_id = ?`;
    params.push(course_id);
  }

  if (status === 'published') {
    query += ` AND t.is_published = TRUE`;
  } else if (status === 'unpublished') {
    query += ` AND t.is_published = FALSE`;
  }

  query += ` GROUP BY t.id ORDER BY t.due_date ASC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), parseInt(offset));

  const tasks = await executeQuery(query, params);
  
  // Si es estudiante, agregar su entrega a cada tarea
  if (req.user.role === 'student' && tasks.length > 0) {
    const taskIds = tasks.map(t => t.id);
    if (taskIds.length > 0) {
      // Construir placeholders para IN clause
      const placeholders = taskIds.map(() => '?').join(',');
      const submissions = await executeQuery(
        `SELECT * FROM submissions WHERE task_id IN (${placeholders}) AND student_id = ?`,
        [...taskIds, req.user.id]
      );
      const submissionMap = {};
      submissions.forEach(sub => {
        submissionMap[sub.task_id] = sub;
      });
      tasks.forEach(task => {
        task.my_submission = submissionMap[task.id] || null;
      });
    }
  }
  
  res.json({ success: true, data: tasks });
}));

// Obtener taller por ID
router.get('/:id', verifyToken, validateTaskId, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const taskId = req.params.id;
  let query = `
    SELECT t.*, c.name as course_name, c.code as course_code, 
           u.name as instructor_name
    FROM tasks t
    JOIN courses c ON t.course_id = c.id
    JOIN users u ON c.instructor_id = u.id
    WHERE t.id = ?
  `;
  const params = [taskId];

  // Verificar permisos
  if (req.user.role === 'student') {
    query += ` AND EXISTS (
      SELECT 1 FROM course_enrollments ce 
      WHERE ce.course_id = t.course_id AND ce.student_id = ? AND ce.status = 'active'
    )`;
    params.push(req.user.id);
  } else if (req.user.role === 'instructor') {
    query += ` AND c.instructor_id = ?`;
    params.push(req.user.id);
  }

  const tasks = await executeQuery(query, params);
  if (tasks.length === 0) {
    return res.status(404).json({ success: false, message: 'Taller no encontrado' });
  }

  // Si es estudiante, obtener su envío
  if (req.user.role === 'student') {
    const submissions = await executeQuery(
      'SELECT * FROM submissions WHERE task_id = ? AND student_id = ?',
      [taskId, req.user.id]
    );
    tasks[0].my_submission = submissions[0] || null;
  }

  // Si es instructor, obtener estadísticas de envíos
  if (req.user.role === 'instructor' || req.user.role === 'admin') {
    const stats = await executeQuery(`
      SELECT 
        COUNT(*) as total_students,
        COUNT(s.id) as total_submissions,
        COUNT(CASE WHEN s.status = 'submitted' THEN 1 END) as submitted_count,
        COUNT(CASE WHEN s.status = 'graded' THEN 1 END) as graded_count,
        AVG(CASE WHEN s.grade IS NOT NULL THEN s.grade END) as average_grade
      FROM course_enrollments ce
      LEFT JOIN submissions s ON s.task_id = ? AND s.student_id = ce.student_id
      WHERE ce.course_id = ? AND ce.status = 'active'
    `, [taskId, tasks[0].course_id]);
    tasks[0].statistics = stats[0];
  }

  res.json({ success: true, data: tasks[0] });
}));

// Crear nuevo taller
router.post('/', verifyToken, validateTask, auditLogger, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const {
    title,
    description,
    instructions,
    course_id,
    due_date,
    max_grade = 100,
    submission_type = 'both',
    is_published = false,
    late_submission_allowed = true,
    late_penalty = 0
  } = req.body;

  // Verificar permisos
  if (req.user.role !== 'admin') {
    const courses = await executeQuery(
      'SELECT id FROM courses WHERE id = ? AND instructor_id = ?',
      [course_id, req.user.id]
    );
    if (courses.length === 0) {
      return res.status(403).json({ success: false, message: 'No tienes permisos para crear talleres en este curso' });
    }
  }

  const result = await executeQuery(`
    INSERT INTO tasks (title, description, instructions, course_id, due_date, max_grade, 
                      submission_type, is_published, late_submission_allowed, late_penalty)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [title, description, instructions, course_id, due_date, max_grade, 
      submission_type, is_published, late_submission_allowed, late_penalty]);

  // No intentar crear eventos en schedules, esa tabla tiene otra estructura

  res.status(201).json({
    success: true,
    message: 'Taller creado exitosamente',
    data: { id: result.insertId }
  });
}));

// Actualizar taller
router.put('/:id', verifyToken, validateTaskId, validateTask, auditLogger, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const taskId = req.params.id;
  const {
    title,
    description,
    instructions,
    due_date,
    max_grade,
    submission_type,
    is_published,
    late_submission_allowed,
    late_penalty
  } = req.body;

  // Verificar permisos
  let permissionQuery = 'SELECT t.*, c.instructor_id FROM tasks t JOIN courses c ON t.course_id = c.id WHERE t.id = ?';
  const tasks = await executeQuery(permissionQuery, [taskId]);
  
  if (tasks.length === 0) {
    return res.status(404).json({ success: false, message: 'Taller no encontrado' });
  }

  if (req.user.role !== 'admin' && tasks[0].instructor_id !== req.user.id) {
    return res.status(403).json({ success: false, message: 'No tienes permisos para editar este taller' });
  }

  await executeQuery(`
    UPDATE tasks SET 
      title = ?, description = ?, instructions = ?, due_date = ?, max_grade = ?,
      submission_type = ?, is_published = ?, late_submission_allowed = ?, late_penalty = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [title, description, instructions, due_date, max_grade, submission_type, 
      is_published, late_submission_allowed, late_penalty, taskId]);

  res.json({ success: true, message: 'Taller actualizado exitosamente' });
}));

// Eliminar taller
router.delete('/:id', verifyToken, validateTaskId, auditLogger, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const taskId = req.params.id;

  // Verificar permisos
  const tasks = await executeQuery(`
    SELECT t.*, c.instructor_id FROM tasks t 
    JOIN courses c ON t.course_id = c.id 
    WHERE t.id = ?
  `, [taskId]);
  
  if (tasks.length === 0) {
    return res.status(404).json({ success: false, message: 'Taller no encontrado' });
  }

  if (req.user.role !== 'admin' && tasks[0].instructor_id !== req.user.id) {
    return res.status(403).json({ success: false, message: 'No tienes permisos para eliminar este taller' });
  }

  // Eliminar taller (las submissions se eliminan por CASCADE)
  await executeQuery('DELETE FROM tasks WHERE id = ?', [taskId]);

  res.json({ success: true, message: 'Taller eliminado exitosamente' });
}));

// Publicar/despublicar taller
router.patch('/:id/toggle-publish', verifyToken, validateTaskId, auditLogger, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const taskId = req.params.id;

  // Verificar permisos
  const tasks = await executeQuery(`
    SELECT t.*, c.instructor_id FROM tasks t 
    JOIN courses c ON t.course_id = c.id 
    WHERE t.id = ?
  `, [taskId]);
  
  if (tasks.length === 0) {
    return res.status(404).json({ success: false, message: 'Taller no encontrado' });
  }

  if (req.user.role !== 'admin' && tasks[0].instructor_id !== req.user.id) {
    return res.status(403).json({ success: false, message: 'No tienes permisos para modificar este taller' });
  }

  const newPublishStatus = !tasks[0].is_published;
  
  await executeQuery(
    'UPDATE tasks SET is_published = ? WHERE id = ?',
    [newPublishStatus, taskId]
  );

  res.json({ 
    success: true, 
    message: `Taller ${newPublishStatus ? 'publicado' : 'despublicado'} exitosamente`,
    is_published: newPublishStatus
  });
}));

module.exports = router;
