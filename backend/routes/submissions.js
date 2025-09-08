const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { verifyToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { auditLogger } = require('../middleware/auditLogger');
const { body, validationResult, param } = require('express-validator');
const db = require('../config/database');
const router = express.Router();

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'submissions');
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `submission-${req.user.id}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Permitir PDF, imágenes y documentos comunes
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se permiten PDF, imágenes, documentos Word y archivos de texto.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB máximo
  }
});

// Validaciones
const validateSubmission = [
  body('task_id').isInt().withMessage('ID de taller inválido'),
  body('submission_text').optional().isLength({ min: 1, max: 5000 }).withMessage('El texto debe tener entre 1 y 5000 caracteres'),
  body('file_url').optional().isURL().withMessage('URL de archivo inválida')
];

const validateSubmissionId = [
  param('id').isInt().withMessage('ID de evidencia inválido')
];

const validateTaskId = [
  param('task_id').isInt().withMessage('ID de taller inválido')
];

// Obtener todas las evidencias (con filtros)
router.get('/', verifyToken, asyncHandler(async (req, res) => {
  const { task_id, student_id, status, limit = 50, offset = 0 } = req.query;
  
  let query = `
    SELECT s.*, t.title as task_title, t.due_date, t.max_grade,
           u.name as student_name, u.email as student_email,
           c.name as course_name
    FROM submissions s
    JOIN tasks t ON s.task_id = t.id
    JOIN users u ON s.student_id = u.id
    JOIN courses c ON t.course_id = c.id
    WHERE 1=1
  `;
  const params = [];

  // Control de acceso por rol
  if (req.user.role === 'student') {
    query += ` AND s.student_id = ?`;
    params.push(req.user.id);
  } else if (req.user.role === 'instructor') {
    query += ` AND c.instructor_id = ?`;
    params.push(req.user.id);
  }

  // Filtros adicionales
  if (task_id) {
    query += ` AND s.task_id = ?`;
    params.push(task_id);
  }
  
  if (student_id && req.user.role !== 'student') {
    query += ` AND s.student_id = ?`;
    params.push(student_id);
  }
  
  if (status) {
    query += ` AND s.status = ?`;
    params.push(status);
  }

  query += ` ORDER BY s.submitted_at DESC, s.created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), parseInt(offset));

  const [submissions] = await db.execute(query, params);
  res.json({ success: true, data: submissions });
}));

// Obtener evidencias por taller
router.get('/task/:task_id', verifyToken, validateTaskId, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const taskId = req.params.task_id;
  
  // Verificar permisos para acceder al taller
  let permissionQuery = `
    SELECT t.*, c.instructor_id FROM tasks t 
    JOIN courses c ON t.course_id = c.id 
    WHERE t.id = ?
  `;
  const [tasks] = await db.execute(permissionQuery, [taskId]);
  
  if (tasks.length === 0) {
    return res.status(404).json({ success: false, message: 'Taller no encontrado' });
  }
  
  if (req.user.role === 'instructor' && tasks[0].instructor_id !== req.user.id) {
    return res.status(403).json({ success: false, message: 'No tienes permisos para ver estas evidencias' });
  }

  let query = `
    SELECT s.*, u.name as student_name, u.email as student_email
    FROM submissions s
    JOIN users u ON s.student_id = u.id
    WHERE s.task_id = ?
  `;
  const params = [taskId];

  if (req.user.role === 'student') {
    query += ` AND s.student_id = ?`;
    params.push(req.user.id);
  }

  query += ` ORDER BY s.submitted_at DESC, u.name ASC`;

  const [submissions] = await db.execute(query, params);
  res.json({ success: true, data: submissions });
}));

// Obtener evidencia específica
router.get('/:id', verifyToken, validateSubmissionId, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const submissionId = req.params.id;
  
  let query = `
    SELECT s.*, t.title as task_title, t.due_date, t.max_grade,
           u.name as student_name, u.email as student_email,
           c.name as course_name, c.instructor_id
    FROM submissions s
    JOIN tasks t ON s.task_id = t.id
    JOIN users u ON s.student_id = u.id
    JOIN courses c ON t.course_id = c.id
    WHERE s.id = ?
  `;
  
  const [submissions] = await db.execute(query, [submissionId]);
  
  if (submissions.length === 0) {
    return res.status(404).json({ success: false, message: 'Evidencia no encontrada' });
  }
  
  const submission = submissions[0];
  
  // Control de acceso
  if (req.user.role === 'student' && submission.student_id !== req.user.id) {
    return res.status(403).json({ success: false, message: 'No tienes permisos para ver esta evidencia' });
  }
  
  if (req.user.role === 'instructor' && submission.instructor_id !== req.user.id) {
    return res.status(403).json({ success: false, message: 'No tienes permisos para ver esta evidencia' });
  }

  res.json({ success: true, data: submission });
}));

// Crear nueva evidencia
router.post('/', verifyToken, upload.single('file'), validateSubmission, auditLogger, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { task_id, submission_text, file_url } = req.body;
  
  // Solo los estudiantes pueden crear evidencias
  if (req.user.role !== 'student') {
    return res.status(403).json({ success: false, message: 'Solo los estudiantes pueden enviar evidencias' });
  }

  // Verificar que el estudiante esté inscrito en el curso del taller
  const [enrollmentCheck] = await db.execute(`
    SELECT 1 FROM tasks t
    JOIN course_enrollments ce ON t.course_id = ce.course_id
    WHERE t.id = ? AND ce.student_id = ? AND ce.status = 'active'
  `, [task_id, req.user.id]);
  
  if (enrollmentCheck.length === 0) {
    return res.status(403).json({ success: false, message: 'No estás inscrito en el curso de este taller' });
  }

  // Verificar que el taller esté publicado
  const [taskCheck] = await db.execute(`
    SELECT id, due_date, late_submission_allowed FROM tasks 
    WHERE id = ? AND is_published = TRUE
  `, [task_id]);
  
  if (taskCheck.length === 0) {
    return res.status(404).json({ success: false, message: 'Taller no encontrado o no publicado' });
  }
  
  const task = taskCheck[0];
  const now = new Date();
  const dueDate = new Date(task.due_date);
  
  // Verificar fechas de entrega
  if (now > dueDate && !task.late_submission_allowed) {
    return res.status(400).json({ success: false, message: 'La fecha de entrega ha pasado y no se permiten envíos tardíos' });
  }

  // Verificar si ya existe una evidencia para este taller
  const [existingSubmission] = await db.execute(
    'SELECT id FROM submissions WHERE task_id = ? AND student_id = ?',
    [task_id, req.user.id]
  );
  
  if (existingSubmission.length > 0) {
    return res.status(400).json({ success: false, message: 'Ya has enviado una evidencia para este taller' });
  }
  
  // Validar que haya al menos texto, archivo o URL
  if (!submission_text && !req.file && !file_url) {
    return res.status(400).json({ success: false, message: 'Debes proporcionar al menos texto, un archivo o una URL' });
  }

  let file_path = null;
  if (req.file) {
    file_path = path.relative(path.join(__dirname, '..'), req.file.path);
  }
  
  const [result] = await db.execute(`
    INSERT INTO submissions (task_id, student_id, submission_text, file_path, file_url, status, submitted_at)
    VALUES (?, ?, ?, ?, ?, 'submitted', CURRENT_TIMESTAMP)
  `, [task_id, req.user.id, submission_text, file_path, file_url]);

  res.status(201).json({
    success: true,
    message: 'Evidencia enviada exitosamente',
    data: { id: result.insertId }
  });
}));

// Actualizar evidencia (solo antes de enviar)
router.put('/:id', verifyToken, upload.single('file'), validateSubmissionId, validateSubmission, auditLogger, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const submissionId = req.params.id;
  const { submission_text, file_url } = req.body;
  
  // Solo los estudiantes pueden actualizar sus evidencias
  if (req.user.role !== 'student') {
    return res.status(403).json({ success: false, message: 'Solo los estudiantes pueden actualizar evidencias' });
  }

  // Verificar que la evidencia existe y pertenece al estudiante
  const [submissions] = await db.execute(
    'SELECT * FROM submissions WHERE id = ? AND student_id = ?',
    [submissionId, req.user.id]
  );
  
  if (submissions.length === 0) {
    return res.status(404).json({ success: false, message: 'Evidencia no encontrada' });
  }
  
  const submission = submissions[0];
  
  // Solo se puede actualizar si está en estado 'draft'
  if (submission.status !== 'draft') {
    return res.status(400).json({ success: false, message: 'Solo se pueden actualizar evidencias en borrador' });
  }

  let file_path = submission.file_path;
  if (req.file) {
    // Eliminar archivo anterior si existe
    if (submission.file_path) {
      try {
        await fs.unlink(path.join(__dirname, '..', submission.file_path));
      } catch (error) {
        console.error('Error eliminando archivo anterior:', error);
      }
    }
    file_path = path.relative(path.join(__dirname, '..'), req.file.path);
  }
  
  await db.execute(`
    UPDATE submissions SET 
      submission_text = ?, file_path = ?, file_url = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [submission_text, file_path, file_url, submissionId]);

  res.json({ success: true, message: 'Evidencia actualizada exitosamente' });
}));

// Enviar evidencia (cambiar de draft a submitted)
router.patch('/:id/submit', verifyToken, validateSubmissionId, auditLogger, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const submissionId = req.params.id;
  
  if (req.user.role !== 'student') {
    return res.status(403).json({ success: false, message: 'Solo los estudiantes pueden enviar evidencias' });
  }

  const [submissions] = await db.execute(`
    SELECT s.*, t.due_date, t.late_submission_allowed
    FROM submissions s
    JOIN tasks t ON s.task_id = t.id
    WHERE s.id = ? AND s.student_id = ?
  `, [submissionId, req.user.id]);
  
  if (submissions.length === 0) {
    return res.status(404).json({ success: false, message: 'Evidencia no encontrada' });
  }
  
  const submission = submissions[0];
  
  if (submission.status !== 'draft') {
    return res.status(400).json({ success: false, message: 'Esta evidencia ya fue enviada' });
  }
  
  const now = new Date();
  const dueDate = new Date(submission.due_date);
  
  if (now > dueDate && !submission.late_submission_allowed) {
    return res.status(400).json({ success: false, message: 'La fecha de entrega ha pasado y no se permiten envíos tardíos' });
  }
  
  await db.execute(
    'UPDATE submissions SET status = "submitted", submitted_at = CURRENT_TIMESTAMP WHERE id = ?',
    [submissionId]
  );

  res.json({ success: true, message: 'Evidencia enviada exitosamente' });
}));

// Calificar evidencia (solo instructores)
router.patch('/:id/grade', verifyToken, validateSubmissionId, auditLogger, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const submissionId = req.params.id;
  const { grade, feedback } = req.body;
  
  if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Solo los instructores pueden calificar evidencias' });
  }
  
  // Validar calificación
  if (grade !== null && (isNaN(grade) || grade < 0 || grade > 100)) {
    return res.status(400).json({ success: false, message: 'La calificación debe ser un número entre 0 y 100' });
  }

  // Verificar permisos
  const [submissions] = await db.execute(`
    SELECT s.*, t.max_grade, c.instructor_id
    FROM submissions s
    JOIN tasks t ON s.task_id = t.id
    JOIN courses c ON t.course_id = c.id
    WHERE s.id = ?
  `, [submissionId]);
  
  if (submissions.length === 0) {
    return res.status(404).json({ success: false, message: 'Evidencia no encontrada' });
  }
  
  const submission = submissions[0];
  
  if (req.user.role !== 'admin' && submission.instructor_id !== req.user.id) {
    return res.status(403).json({ success: false, message: 'No tienes permisos para calificar esta evidencia' });
  }
  
  if (submission.status !== 'submitted') {
    return res.status(400).json({ success: false, message: 'Solo se pueden calificar evidencias enviadas' });
  }
  
  // Validar que la calificación no exceda la máxima del taller
  if (grade !== null && grade > submission.max_grade) {
    return res.status(400).json({ 
      success: false, 
      message: `La calificación no puede exceder ${submission.max_grade} puntos` 
    });
  }
  
  await db.execute(`
    UPDATE submissions SET 
      grade = ?, feedback = ?, status = 'graded', graded_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [grade, feedback, submissionId]);

  res.json({ success: true, message: 'Evidencia calificada exitosamente' });
}));

// Descargar archivo de evidencia
router.get('/:id/download', verifyToken, validateSubmissionId, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const submissionId = req.params.id;
  
  const [submissions] = await db.execute(`
    SELECT s.*, c.instructor_id
    FROM submissions s
    JOIN tasks t ON s.task_id = t.id
    JOIN courses c ON t.course_id = c.id
    WHERE s.id = ?
  `, [submissionId]);
  
  if (submissions.length === 0) {
    return res.status(404).json({ success: false, message: 'Evidencia no encontrada' });
  }
  
  const submission = submissions[0];
  
  // Verificar permisos
  if (req.user.role === 'student' && submission.student_id !== req.user.id) {
    return res.status(403).json({ success: false, message: 'No tienes permisos para descargar esta evidencia' });
  }
  
  if (req.user.role === 'instructor' && submission.instructor_id !== req.user.id) {
    return res.status(403).json({ success: false, message: 'No tienes permisos para descargar esta evidencia' });
  }
  
  if (!submission.file_path) {
    return res.status(404).json({ success: false, message: 'No hay archivo asociado a esta evidencia' });
  }
  
  const filePath = path.join(__dirname, '..', submission.file_path);
  
  try {
    await fs.access(filePath);
    res.download(filePath);
  } catch (error) {
    res.status(404).json({ success: false, message: 'Archivo no encontrado en el servidor' });
  }
}));

// Eliminar evidencia
router.delete('/:id', verifyToken, validateSubmissionId, auditLogger, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const submissionId = req.params.id;
  
  const [submissions] = await db.execute(
    'SELECT * FROM submissions WHERE id = ? AND student_id = ?',
    [submissionId, req.user.id]
  );
  
  if (submissions.length === 0) {
    return res.status(404).json({ success: false, message: 'Evidencia no encontrada' });
  }
  
  const submission = submissions[0];
  
  // Solo se puede eliminar si está en draft
  if (submission.status !== 'draft') {
    return res.status(400).json({ success: false, message: 'Solo se pueden eliminar evidencias en borrador' });
  }
  
  // Eliminar archivo si existe
  if (submission.file_path) {
    try {
      await fs.unlink(path.join(__dirname, '..', submission.file_path));
    } catch (error) {
      console.error('Error eliminando archivo:', error);
    }
  }
  
  await db.execute('DELETE FROM submissions WHERE id = ?', [submissionId]);
  
  res.json({ success: true, message: 'Evidencia eliminada exitosamente' });
}));

module.exports = router;
