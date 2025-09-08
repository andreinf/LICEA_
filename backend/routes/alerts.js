const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { auditLogger } = require('../middleware/auditLogger');
const { body, validationResult, param } = require('express-validator');
const db = require('../config/database');
const router = express.Router();

// Validaciones
const validateAlertId = [
  param('id').isInt().withMessage('ID de alerta inválido')
];

const validateResolveAlert = [
  body('resolution_notes').optional().isLength({ max: 1000 }).withMessage('Las notas de resolución no pueden exceder 1000 caracteres')
];

// Función para generar alertas de IA
const generatePerformanceAlerts = async () => {
  try {
    // Detectar estudiantes con bajo rendimiento (promedio < 3.0)
    const [lowPerformanceStudents] = await db.execute(`
      SELECT 
        s.student_id,
        s.course_id,
        s.student_name,
        s.course_name,
        s.average_grade,
        s.submitted_tasks,
        s.total_tasks,
        s.present_count,
        s.total_attendance_records
      FROM student_course_summary s
      WHERE s.average_grade < 3.0 AND s.average_grade IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM alerts a 
          WHERE a.student_id = s.student_id 
            AND a.course_id = s.course_id 
            AND a.alert_type = 'performance' 
            AND a.is_resolved = FALSE 
            AND a.created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
        )
    `);

    for (const student of lowPerformanceStudents) {
      const riskLevel = student.average_grade < 2.0 ? 'critical' : 
                       student.average_grade < 2.5 ? 'high' : 'medium';
      
      const recommendation = generatePerformanceRecommendation(student);
      
      await db.execute(`
        INSERT INTO alerts (student_id, course_id, risk_level, alert_type, title, description, recommendation)
        VALUES (?, ?, ?, 'performance', ?, ?, ?)
      `, [
        student.student_id,
        student.course_id,
        riskLevel,
        `Bajo rendimiento académico - ${student.course_name}`,
        `El estudiante ${student.student_name} tiene un promedio de ${student.average_grade.toFixed(2)} en ${student.course_name}`,
        recommendation
      ]);
    }

    // Detectar estudiantes con baja asistencia
    const [lowAttendanceStudents] = await db.execute(`
      SELECT 
        s.student_id,
        s.course_id,
        s.student_name,
        s.course_name,
        s.present_count,
        s.total_attendance_records,
        (s.present_count / s.total_attendance_records * 100) as attendance_rate
      FROM student_course_summary s
      WHERE s.total_attendance_records > 0 
        AND (s.present_count / s.total_attendance_records * 100) < 75
        AND NOT EXISTS (
          SELECT 1 FROM alerts a 
          WHERE a.student_id = s.student_id 
            AND a.course_id = s.course_id 
            AND a.alert_type = 'attendance' 
            AND a.is_resolved = FALSE 
            AND a.created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
        )
    `);

    for (const student of lowAttendanceStudents) {
      const riskLevel = student.attendance_rate < 50 ? 'critical' : 
                       student.attendance_rate < 60 ? 'high' : 'medium';
      
      const recommendation = generateAttendanceRecommendation(student);
      
      await db.execute(`
        INSERT INTO alerts (student_id, course_id, risk_level, alert_type, title, description, recommendation)
        VALUES (?, ?, ?, 'attendance', ?, ?, ?)
      `, [
        student.student_id,
        student.course_id,
        riskLevel,
        `Baja asistencia - ${student.course_name}`,
        `${student.student_name} tiene una asistencia del ${student.attendance_rate.toFixed(1)}% en ${student.course_name}`,
        recommendation
      ]);
    }

    // Detectar estudiantes con entregas pendientes
    const [pendingSubmissions] = await db.execute(`
      SELECT 
        ce.student_id,
        ce.course_id,
        u.name as student_name,
        c.name as course_name,
        COUNT(t.id) as pending_tasks,
        COUNT(CASE WHEN t.due_date < NOW() THEN 1 END) as overdue_tasks
      FROM course_enrollments ce
      JOIN users u ON ce.student_id = u.id
      JOIN courses c ON ce.course_id = c.id
      JOIN tasks t ON c.id = t.course_id AND t.is_published = TRUE
      LEFT JOIN submissions s ON t.id = s.task_id AND s.student_id = ce.student_id
      WHERE ce.status = 'active' 
        AND s.id IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM alerts a 
          WHERE a.student_id = ce.student_id 
            AND a.course_id = ce.course_id 
            AND a.alert_type = 'submission' 
            AND a.is_resolved = FALSE 
            AND a.created_at > DATE_SUB(NOW(), INTERVAL 3 DAY)
        )
      GROUP BY ce.student_id, ce.course_id, u.name, c.name
      HAVING pending_tasks >= 2 OR overdue_tasks >= 1
    `);

    for (const student of pendingSubmissions) {
      const riskLevel = student.overdue_tasks > 2 ? 'critical' : 
                       student.overdue_tasks > 0 ? 'high' : 'medium';
      
      const recommendation = generateSubmissionRecommendation(student);
      
      await db.execute(`
        INSERT INTO alerts (student_id, course_id, risk_level, alert_type, title, description, recommendation)
        VALUES (?, ?, ?, 'submission', ?, ?, ?)
      `, [
        student.student_id,
        student.course_id,
        riskLevel,
        `Entregas pendientes - ${student.course_name}`,
        `${student.student_name} tiene ${student.pending_tasks} entregas pendientes (${student.overdue_tasks} vencidas)`,
        recommendation
      ]);
    }

    console.log('Alertas de IA generadas exitosamente');
  } catch (error) {
    console.error('Error generando alertas de IA:', error);
  }
};

// Funciones para generar recomendaciones personalizadas
const generatePerformanceRecommendation = (student) => {
  const recommendations = [];
  
  if (student.average_grade < 2.0) {
    recommendations.push('Contactar inmediatamente al estudiante para una reunión de seguimiento');
    recommendations.push('Considerar un plan de recuperación académico personalizado');
  } else {
    recommendations.push('Programar tutoría adicional en las áreas de mayor dificultad');
  }
  
  const submissionRate = student.total_tasks > 0 ? (student.submitted_tasks / student.total_tasks * 100) : 0;
  if (submissionRate < 80) {
    recommendations.push('Revisar el cumplimiento de entregas y establecer recordatorios');
  }
  
  const attendanceRate = student.total_attendance_records > 0 ? 
    (student.present_count / student.total_attendance_records * 100) : 100;
  if (attendanceRate < 80) {
    recommendations.push('Abordar problemas de asistencia que pueden estar afectando el rendimiento');
  }
  
  return recommendations.join('. ');
};

const generateAttendanceRecommendation = (student) => {
  const recommendations = [];
  
  if (student.attendance_rate < 50) {
    recommendations.push('Contacto urgente con el estudiante y su familia si es aplicable');
    recommendations.push('Investigar posibles barreras para la asistencia (transporte, trabajo, salud)');
  } else {
    recommendations.push('Enviar recordatorios sobre la importancia de la asistencia');
  }
  
  recommendations.push('Considerar flexibilidad en horarios si es posible');
  recommendations.push('Proporcionar material de clases perdidas');
  
  return recommendations.join('. ');
};

const generateSubmissionRecommendation = (student) => {
  const recommendations = [];
  
  if (student.overdue_tasks > 0) {
    recommendations.push('Contactar al estudiante para discutir las entregas vencidas');
    recommendations.push('Evaluar si se pueden aceptar entregas tardías con penalización');
  }
  
  recommendations.push('Establecer recordatorios automáticos antes de las fechas límite');
  recommendations.push('Ofrecer sesión de apoyo para organización y gestión del tiempo');
  recommendations.push('Revisar si el estudiante necesita apoyo técnico para las entregas');
  
  return recommendations.join('. ');
};

// Ejecutar generación de alertas cada hora
setInterval(generatePerformanceAlerts, 60 * 60 * 1000);

// Obtener todas las alertas
router.get('/', verifyToken, asyncHandler(async (req, res) => {
  const { student_id, course_id, alert_type, risk_level, status = 'all', limit = 50, offset = 0 } = req.query;
  
  let query = `
    SELECT a.*, u.name as student_name, u.email as student_email,
           c.name as course_name, c.code as course_code,
           resolver.name as resolved_by_name
    FROM alerts a
    JOIN users u ON a.student_id = u.id
    LEFT JOIN courses c ON a.course_id = c.id
    LEFT JOIN users resolver ON a.resolved_by = resolver.id
    WHERE 1=1
  `;
  const params = [];

  // Control de acceso por rol
  if (req.user.role === 'student') {
    query += ` AND a.student_id = ?`;
    params.push(req.user.id);
  } else if (req.user.role === 'instructor') {
    query += ` AND EXISTS (
      SELECT 1 FROM courses co WHERE co.id = a.course_id AND co.instructor_id = ?
    )`;
    params.push(req.user.id);
  }

  // Filtros
  if (student_id && req.user.role !== 'student') {
    query += ` AND a.student_id = ?`;
    params.push(student_id);
  }
  
  if (course_id) {
    query += ` AND a.course_id = ?`;
    params.push(course_id);
  }
  
  if (alert_type) {
    query += ` AND a.alert_type = ?`;
    params.push(alert_type);
  }
  
  if (risk_level) {
    query += ` AND a.risk_level = ?`;
    params.push(risk_level);
  }
  
  if (status === 'active') {
    query += ` AND a.is_resolved = FALSE`;
  } else if (status === 'resolved') {
    query += ` AND a.is_resolved = TRUE`;
  }

  query += ` ORDER BY 
    CASE a.risk_level 
      WHEN 'critical' THEN 1
      WHEN 'high' THEN 2  
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
    END,
    a.created_at DESC 
    LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), parseInt(offset));

  const [alerts] = await db.execute(query, params);
  res.json({ success: true, data: alerts });
}));

// Obtener alerta específica
router.get('/:id', verifyToken, validateAlertId, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const alertId = req.params.id;
  
  let query = `
    SELECT a.*, u.name as student_name, u.email as student_email,
           c.name as course_name, c.code as course_code,
           resolver.name as resolved_by_name
    FROM alerts a
    JOIN users u ON a.student_id = u.id
    LEFT JOIN courses c ON a.course_id = c.id
    LEFT JOIN users resolver ON a.resolved_by = resolver.id
    WHERE a.id = ?
  `;
  const params = [alertId];

  // Control de acceso
  if (req.user.role === 'student') {
    query += ` AND a.student_id = ?`;
    params.push(req.user.id);
  } else if (req.user.role === 'instructor') {
    query += ` AND EXISTS (
      SELECT 1 FROM courses co WHERE co.id = a.course_id AND co.instructor_id = ?
    )`;
    params.push(req.user.id);
  }

  const [alerts] = await db.execute(query, params);
  
  if (alerts.length === 0) {
    return res.status(404).json({ success: false, message: 'Alerta no encontrada' });
  }

  res.json({ success: true, data: alerts[0] });
}));

// Marcar alerta como leída
router.patch('/:id/read', verifyToken, validateAlertId, auditLogger, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const alertId = req.params.id;
  
  // Verificar permisos
  let permissionQuery = `
    SELECT a.* FROM alerts a
    WHERE a.id = ?
  `;
  const params = [alertId];

  if (req.user.role === 'student') {
    permissionQuery += ` AND a.student_id = ?`;
    params.push(req.user.id);
  } else if (req.user.role === 'instructor') {
    permissionQuery += ` AND EXISTS (
      SELECT 1 FROM courses c WHERE c.id = a.course_id AND c.instructor_id = ?
    )`;
    params.push(req.user.id);
  }

  const [alerts] = await db.execute(permissionQuery, params);
  
  if (alerts.length === 0) {
    return res.status(404).json({ success: false, message: 'Alerta no encontrada' });
  }

  await db.execute(
    'UPDATE alerts SET is_read = TRUE WHERE id = ?',
    [alertId]
  );

  res.json({ success: true, message: 'Alerta marcada como leída' });
}));

// Resolver alerta
router.patch('/:id/resolve', verifyToken, validateAlertId, validateResolveAlert, auditLogger, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const alertId = req.params.id;
  const { resolution_notes } = req.body;
  
  // Solo instructores y admins pueden resolver alertas
  if (req.user.role === 'student') {
    return res.status(403).json({ success: false, message: 'No tienes permisos para resolver alertas' });
  }

  // Verificar permisos
  let permissionQuery = `
    SELECT a.* FROM alerts a
    WHERE a.id = ?
  `;
  const params = [alertId];

  if (req.user.role === 'instructor') {
    permissionQuery += ` AND EXISTS (
      SELECT 1 FROM courses c WHERE c.id = a.course_id AND c.instructor_id = ?
    )`;
    params.push(req.user.id);
  }

  const [alerts] = await db.execute(permissionQuery, params);
  
  if (alerts.length === 0) {
    return res.status(404).json({ success: false, message: 'Alerta no encontrada' });
  }

  await db.execute(
    `UPDATE alerts SET 
       is_resolved = TRUE, is_read = TRUE, resolved_by = ?, resolved_at = CURRENT_TIMESTAMP,
       recommendation = CASE WHEN ? IS NOT NULL THEN CONCAT(recommendation, '\n\nNotas de resolución: ', ?) ELSE recommendation END
     WHERE id = ?`,
    [req.user.id, resolution_notes, resolution_notes, alertId]
  );

  res.json({ success: true, message: 'Alerta resuelta exitosamente' });
}));

// Obtener estadísticas de alertas
router.get('/stats/dashboard', verifyToken, asyncHandler(async (req, res) => {
  let courseFilter = '';
  const params = [];

  if (req.user.role === 'instructor') {
    courseFilter = 'AND EXISTS (SELECT 1 FROM courses c WHERE c.id = a.course_id AND c.instructor_id = ?)';
    params.push(req.user.id);
  } else if (req.user.role === 'student') {
    courseFilter = 'AND a.student_id = ?';
    params.push(req.user.id);
  }

  const [stats] = await db.execute(`
    SELECT 
      COUNT(*) as total_alerts,
      COUNT(CASE WHEN a.is_resolved = FALSE THEN 1 END) as active_alerts,
      COUNT(CASE WHEN a.risk_level = 'critical' AND a.is_resolved = FALSE THEN 1 END) as critical_alerts,
      COUNT(CASE WHEN a.risk_level = 'high' AND a.is_resolved = FALSE THEN 1 END) as high_alerts,
      COUNT(CASE WHEN a.alert_type = 'performance' AND a.is_resolved = FALSE THEN 1 END) as performance_alerts,
      COUNT(CASE WHEN a.alert_type = 'attendance' AND a.is_resolved = FALSE THEN 1 END) as attendance_alerts,
      COUNT(CASE WHEN a.alert_type = 'submission' AND a.is_resolved = FALSE THEN 1 END) as submission_alerts,
      COUNT(CASE WHEN a.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as recent_alerts
    FROM alerts a
    WHERE 1=1 ${courseFilter}
  `, params);

  const [trendData] = await db.execute(`
    SELECT 
      DATE(a.created_at) as alert_date,
      COUNT(*) as daily_alerts,
      COUNT(CASE WHEN a.risk_level IN ('critical', 'high') THEN 1 END) as urgent_alerts
    FROM alerts a
    WHERE a.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) ${courseFilter}
    GROUP BY DATE(a.created_at)
    ORDER BY alert_date DESC
  `, params);

  res.json({ 
    success: true, 
    data: {
      overview: stats[0],
      trend: trendData
    }
  });
}));

// Generar alertas manualmente (solo para admins)
router.post('/generate', verifyToken, auditLogger, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Solo los administradores pueden generar alertas manualmente' });
  }

  await generatePerformanceAlerts();
  res.json({ success: true, message: 'Alertas generadas exitosamente' });
}));

module.exports = router;
