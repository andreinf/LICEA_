const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { executeQuery } = require('../config/database');
const router = express.Router();

// Obtener todas las notificaciones del usuario
router.get('/', verifyToken, asyncHandler(async (req, res) => {
  const { limit = 20, unread_only = false } = req.query;
  
  let query = `
    SELECT 
      n.*,
      CASE 
        WHEN n.type = 'task_assigned' THEN CONCAT('Nueva tarea: ', n.title)
        WHEN n.type = 'task_graded' THEN CONCAT('Tarea calificada: ', n.title)
        WHEN n.type = 'task_reminder' THEN CONCAT('Recordatorio: ', n.title)
        WHEN n.type = 'course_enrolled' THEN CONCAT('Inscrito en: ', n.title)
        WHEN n.type = 'announcement' THEN n.title
        ELSE n.title
      END as formatted_title
    FROM notifications n
    WHERE n.user_id = ?
  `;
  
  const params = [req.user.id];
  
  if (unread_only === 'true') {
    query += ` AND n.is_read = FALSE`;
  }
  
  query += ` ORDER BY n.created_at DESC LIMIT ?`;
  params.push(parseInt(limit));
  
  const notifications = await executeQuery(query, params);
  
  // Contar no leídas
  const unreadCount = await executeQuery(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
    [req.user.id]
  );
  
  res.json({
    success: true,
    data: notifications,
    unread_count: unreadCount[0]?.count || 0
  });
}));

// Marcar notificación como leída
router.patch('/:id/read', verifyToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  await executeQuery(
    'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = ? AND user_id = ?',
    [id, req.user.id]
  );
  
  res.json({
    success: true,
    message: 'Notificación marcada como leída'
  });
}));

// Marcar todas como leídas
router.patch('/mark-all-read', verifyToken, asyncHandler(async (req, res) => {
  await executeQuery(
    'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE user_id = ? AND is_read = FALSE',
    [req.user.id]
  );
  
  res.json({
    success: true,
    message: 'Todas las notificaciones marcadas como leídas'
  });
}));

// Eliminar notificación
router.delete('/:id', verifyToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  await executeQuery(
    'DELETE FROM notifications WHERE id = ? AND user_id = ?',
    [id, req.user.id]
  );
  
  res.json({
    success: true,
    message: 'Notificación eliminada'
  });
}));

// Función helper para crear notificaciones (uso interno)
async function createNotification({
  userId,
  type,
  title,
  message,
  link = null,
  relatedId = null
}) {
  try {
    await executeQuery(`
      INSERT INTO notifications (user_id, type, title, message, link, related_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [userId, type, title, message, link, relatedId]);
    
    return true;
  } catch (error) {
    console.error('Error creating notification:', error);
    return false;
  }
}

// Función para notificar a estudiantes de un curso
async function notifyStudentsInCourse(courseId, notification) {
  try {
    const students = await executeQuery(`
      SELECT student_id FROM course_enrollments 
      WHERE course_id = ? AND status = 'active'
    `, [courseId]);
    
    const promises = students.map(s => 
      createNotification({
        userId: s.student_id,
        ...notification
      })
    );
    
    await Promise.all(promises);
    return true;
  } catch (error) {
    console.error('Error notifying students:', error);
    return false;
  }
}

module.exports = router;
module.exports.createNotification = createNotification;
module.exports.notifyStudentsInCourse = notifyStudentsInCourse;
