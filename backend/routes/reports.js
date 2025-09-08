const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { param, validationResult } = require('express-validator');
const db = require('../config/database');
const router = express.Router();

// Validaciones
const validateCourseId = [
  param('course_id').isInt().withMessage('ID de curso inválido')
];

const validateStudentId = [
  param('student_id').isInt().withMessage('ID de estudiante inválido')
];

// Dashboard principal con métricas generales
router.get('/dashboard', verifyToken, asyncHandler(async (req, res) => {
  let dashboardData = {};
  
  try {
    if (req.user.role === 'admin') {
      // Dashboard de administrador
      const [generalStats] = await db.execute(`
        SELECT 
          (SELECT COUNT(*) FROM users WHERE role = 'student' AND is_active = TRUE) as total_students,
          (SELECT COUNT(*) FROM users WHERE role = 'instructor' AND is_active = TRUE) as total_instructors,
          (SELECT COUNT(*) FROM courses WHERE is_active = TRUE) as total_courses,
          (SELECT COUNT(*) FROM tasks WHERE is_published = TRUE) as total_tasks,
          (SELECT COUNT(*) FROM submissions WHERE status = 'submitted') as total_submissions,
          (SELECT COUNT(*) FROM alerts WHERE is_resolved = FALSE) as active_alerts
      `);
      
      // Estadísticas de rendimiento general
      const [performanceStats] = await db.execute(`
        SELECT 
          AVG(CASE WHEN s.grade IS NOT NULL THEN s.grade END) as overall_average,
          COUNT(DISTINCT s.student_id) as students_with_grades,
          COUNT(CASE WHEN s.grade >= 3.0 THEN 1 END) as passing_students,
          COUNT(CASE WHEN s.grade < 3.0 AND s.grade IS NOT NULL THEN 1 END) as failing_students
        FROM submissions s
        WHERE s.status = 'graded'
      `);
      
      // Tendencia de inscripciones por mes
      const [enrollmentTrend] = await db.execute(`
        SELECT 
          DATE_FORMAT(ce.enrollment_date, '%Y-%m') as month,
          COUNT(*) as enrollments
        FROM course_enrollments ce
        WHERE ce.enrollment_date >= DATE_SUB(CURRENT_DATE, INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(ce.enrollment_date, '%Y-%m')
        ORDER BY month
      `);
      
      dashboardData = {
        general: generalStats[0],
        performance: performanceStats[0],
        enrollmentTrend: enrollmentTrend
      };
      
    } else if (req.user.role === 'instructor') {
      // Dashboard de instructor
      const [instructorStats] = await db.execute(`
        SELECT 
          (SELECT COUNT(*) FROM courses WHERE instructor_id = ? AND is_active = TRUE) as my_courses,
          (SELECT COUNT(DISTINCT ce.student_id) 
           FROM course_enrollments ce 
           JOIN courses c ON ce.course_id = c.id 
           WHERE c.instructor_id = ? AND ce.status = 'active') as my_students,
          (SELECT COUNT(*) FROM tasks t 
           JOIN courses c ON t.course_id = c.id 
           WHERE c.instructor_id = ? AND t.is_published = TRUE) as my_tasks,
          (SELECT COUNT(*) FROM submissions s 
           JOIN tasks t ON s.task_id = t.id 
           JOIN courses c ON t.course_id = c.id 
           WHERE c.instructor_id = ? AND s.status = 'submitted') as pending_grading
      `, [req.user.id, req.user.id, req.user.id, req.user.id]);
      
      // Rendimiento promedio por curso
      const [coursePerformance] = await db.execute(`
        SELECT 
          c.name as course_name,
          c.code as course_code,
          COUNT(DISTINCT ce.student_id) as enrolled_students,
          AVG(CASE WHEN s.grade IS NOT NULL THEN s.grade END) as average_grade,
          COUNT(CASE WHEN s.grade >= 3.0 THEN 1 END) as passing_count,
          COUNT(CASE WHEN s.grade < 3.0 AND s.grade IS NOT NULL THEN 1 END) as failing_count
        FROM courses c
        LEFT JOIN course_enrollments ce ON c.id = ce.course_id AND ce.status = 'active'
        LEFT JOIN tasks t ON c.id = t.course_id AND t.is_published = TRUE
        LEFT JOIN submissions s ON t.id = s.task_id AND s.student_id = ce.student_id AND s.status = 'graded'
        WHERE c.instructor_id = ? AND c.is_active = TRUE
        GROUP BY c.id, c.name, c.code
      `, [req.user.id]);
      
      // Alertas activas de mis estudiantes
      const [myAlerts] = await db.execute(`
        SELECT 
          a.risk_level,
          COUNT(*) as alert_count
        FROM alerts a
        JOIN courses c ON a.course_id = c.id
        WHERE c.instructor_id = ? AND a.is_resolved = FALSE
        GROUP BY a.risk_level
      `, [req.user.id]);
      
      dashboardData = {
        instructor: instructorStats[0],
        coursePerformance: coursePerformance,
        alerts: myAlerts
      };
      
    } else if (req.user.role === 'student') {
      // Dashboard de estudiante
      const [studentStats] = await db.execute(`
        SELECT 
          (SELECT COUNT(*) FROM course_enrollments WHERE student_id = ? AND status = 'active') as my_courses,
          (SELECT COUNT(*) FROM submissions s 
           JOIN tasks t ON s.task_id = t.id 
           JOIN course_enrollments ce ON t.course_id = ce.course_id 
           WHERE ce.student_id = ? AND s.student_id = ?) as my_submissions,
          (SELECT AVG(CASE WHEN s.grade IS NOT NULL THEN s.grade END) 
           FROM submissions s 
           JOIN tasks t ON s.task_id = t.id 
           JOIN course_enrollments ce ON t.course_id = ce.course_id 
           WHERE ce.student_id = ? AND s.student_id = ? AND s.status = 'graded') as my_average,
          (SELECT COUNT(*) FROM alerts WHERE student_id = ? AND is_resolved = FALSE) as my_alerts
      `, [req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id]);
      
      // Mi rendimiento por curso
      const [myPerformance] = await db.execute(`
        SELECT 
          c.name as course_name,
          c.code as course_code,
          COUNT(DISTINCT t.id) as total_tasks,
          COUNT(DISTINCT s.id) as submitted_tasks,
          AVG(CASE WHEN s.grade IS NOT NULL THEN s.grade END) as course_average,
          COUNT(CASE WHEN s.grade >= 3.0 THEN 1 END) as passing_tasks,
          COUNT(CASE WHEN s.grade < 3.0 AND s.grade IS NOT NULL THEN 1 END) as failing_tasks
        FROM course_enrollments ce
        JOIN courses c ON ce.course_id = c.id
        LEFT JOIN tasks t ON c.id = t.course_id AND t.is_published = TRUE
        LEFT JOIN submissions s ON t.id = s.task_id AND s.student_id = ce.student_id
        WHERE ce.student_id = ? AND ce.status = 'active'
        GROUP BY c.id, c.name, c.code
      `, [req.user.id]);
      
      // Mis próximas entregas
      const [upcomingTasks] = await db.execute(`
        SELECT 
          t.id,
          t.title,
          t.due_date,
          c.name as course_name,
          s.status as submission_status
        FROM tasks t
        JOIN courses c ON t.course_id = c.id
        JOIN course_enrollments ce ON c.id = ce.course_id
        LEFT JOIN submissions s ON t.id = s.task_id AND s.student_id = ce.student_id
        WHERE ce.student_id = ? AND ce.status = 'active' 
          AND t.is_published = TRUE
          AND t.due_date > NOW()
          AND (s.id IS NULL OR s.status = 'draft')
        ORDER BY t.due_date ASC
        LIMIT 10
      `, [req.user.id]);
      
      dashboardData = {
        student: studentStats[0],
        myPerformance: myPerformance,
        upcomingTasks: upcomingTasks
      };
    }
    
    res.json({ success: true, data: dashboardData });
    
  } catch (error) {
    console.error('Error generando dashboard:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}));

// Reporte de rendimiento por curso
router.get('/course/:course_id/performance', verifyToken, validateCourseId, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const courseId = req.params.course_id;
  
  // Verificar permisos
  const [courseCheck] = await db.execute(
    'SELECT id, instructor_id FROM courses WHERE id = ?',
    [courseId]
  );
  
  if (courseCheck.length === 0) {
    return res.status(404).json({ success: false, message: 'Curso no encontrado' });
  }
  
  if (req.user.role === 'instructor' && courseCheck[0].instructor_id !== req.user.id) {
    return res.status(403).json({ success: false, message: 'No tienes permisos para ver este reporte' });
  }
  
  // Rendimiento general del curso
  const [courseStats] = await db.execute(`
    SELECT 
      c.name as course_name,
      c.code as course_code,
      COUNT(DISTINCT ce.student_id) as total_students,
      COUNT(DISTINCT t.id) as total_tasks,
      COUNT(DISTINCT s.id) as total_submissions,
      AVG(CASE WHEN s.grade IS NOT NULL THEN s.grade END) as course_average,
      COUNT(CASE WHEN s.grade >= 3.0 THEN 1 END) as passing_submissions,
      COUNT(CASE WHEN s.grade < 3.0 AND s.grade IS NOT NULL THEN 1 END) as failing_submissions
    FROM courses c
    LEFT JOIN course_enrollments ce ON c.id = ce.course_id AND ce.status = 'active'
    LEFT JOIN tasks t ON c.id = t.course_id AND t.is_published = TRUE
    LEFT JOIN submissions s ON t.id = s.task_id AND s.student_id = ce.student_id AND s.status = 'graded'
    WHERE c.id = ?
    GROUP BY c.id, c.name, c.code
  `, [courseId]);
  
  // Rendimiento por estudiante
  const [studentPerformance] = await db.execute(`
    SELECT 
      u.id as student_id,
      u.name as student_name,
      u.email as student_email,
      COUNT(DISTINCT t.id) as assigned_tasks,
      COUNT(DISTINCT s.id) as submitted_tasks,
      AVG(CASE WHEN s.grade IS NOT NULL THEN s.grade END) as student_average,
      COUNT(CASE WHEN s.grade >= 3.0 THEN 1 END) as passing_tasks,
      COUNT(CASE WHEN s.grade < 3.0 AND s.grade IS NOT NULL THEN 1 END) as failing_tasks,
      COUNT(CASE WHEN t.due_date < NOW() AND s.id IS NULL THEN 1 END) as overdue_tasks
    FROM course_enrollments ce
    JOIN users u ON ce.student_id = u.id
    LEFT JOIN tasks t ON ce.course_id = t.course_id AND t.is_published = TRUE
    LEFT JOIN submissions s ON t.id = s.task_id AND s.student_id = u.id
    WHERE ce.course_id = ? AND ce.status = 'active'
    GROUP BY u.id, u.name, u.email
    ORDER BY student_average DESC, u.name
  `, [courseId]);
  
  // Rendimiento por taller
  const [taskPerformance] = await db.execute(`
    SELECT 
      t.id as task_id,
      t.title as task_title,
      t.due_date,
      t.max_grade,
      COUNT(DISTINCT ce.student_id) as total_students,
      COUNT(DISTINCT s.id) as submissions_count,
      COUNT(CASE WHEN s.status = 'graded' THEN 1 END) as graded_count,
      AVG(CASE WHEN s.grade IS NOT NULL THEN s.grade END) as task_average,
      MIN(CASE WHEN s.grade IS NOT NULL THEN s.grade END) as min_grade,
      MAX(CASE WHEN s.grade IS NOT NULL THEN s.grade END) as max_grade
    FROM tasks t
    LEFT JOIN course_enrollments ce ON t.course_id = ce.course_id AND ce.status = 'active'
    LEFT JOIN submissions s ON t.id = s.task_id AND s.student_id = ce.student_id
    WHERE t.course_id = ? AND t.is_published = TRUE
    GROUP BY t.id, t.title, t.due_date, t.max_grade
    ORDER BY t.due_date DESC
  `, [courseId]);
  
  res.json({
    success: true,
    data: {
      courseStats: courseStats[0],
      studentPerformance: studentPerformance,
      taskPerformance: taskPerformance
    }
  });
}));

// Reporte de asistencia por curso
router.get('/course/:course_id/attendance', verifyToken, validateCourseId, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const courseId = req.params.course_id;
  const { start_date, end_date } = req.query;
  
  // Verificar permisos
  const [courseCheck] = await db.execute(
    'SELECT id, instructor_id FROM courses WHERE id = ?',
    [courseId]
  );
  
  if (courseCheck.length === 0) {
    return res.status(404).json({ success: false, message: 'Curso no encontrado' });
  }
  
  if (req.user.role === 'instructor' && courseCheck[0].instructor_id !== req.user.id) {
    return res.status(403).json({ success: false, message: 'No tienes permisos para ver este reporte' });
  }
  
  let dateFilter = '';
  const params = [courseId];
  
  if (start_date) {
    dateFilter += ' AND a.date >= ?';
    params.push(start_date);
  }
  
  if (end_date) {
    dateFilter += ' AND a.date <= ?';
    params.push(end_date);
  }
  
  // Estadísticas de asistencia por estudiante
  const [attendanceStats] = await db.execute(`
    SELECT 
      u.id as student_id,
      u.name as student_name,
      u.email as student_email,
      COUNT(*) as total_records,
      COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
      COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_count,
      COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_count,
      COUNT(CASE WHEN a.status = 'excused' THEN 1 END) as excused_count,
      ROUND((COUNT(CASE WHEN a.status = 'present' THEN 1 END) / COUNT(*) * 100), 2) as attendance_rate
    FROM course_enrollments ce
    JOIN users u ON ce.student_id = u.id
    LEFT JOIN attendance a ON ce.course_id = a.course_id AND ce.student_id = a.student_id
    WHERE ce.course_id = ? AND ce.status = 'active' ${dateFilter}
    GROUP BY u.id, u.name, u.email
    HAVING total_records > 0
    ORDER BY attendance_rate DESC, u.name
  `, params);
  
  // Tendencia de asistencia por fecha
  const [attendanceTrend] = await db.execute(`
    SELECT 
      a.date,
      COUNT(DISTINCT ce.student_id) as enrolled_students,
      COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
      COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_count,
      COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_count,
      ROUND((COUNT(CASE WHEN a.status = 'present' THEN 1 END) / COUNT(DISTINCT ce.student_id) * 100), 2) as daily_attendance_rate
    FROM course_enrollments ce
    LEFT JOIN attendance a ON ce.course_id = a.course_id AND ce.student_id = a.student_id
    WHERE ce.course_id = ? AND ce.status = 'active' ${dateFilter}
    GROUP BY a.date
    HAVING a.date IS NOT NULL
    ORDER BY a.date DESC
    LIMIT 30
  `, params);
  
  res.json({
    success: true,
    data: {
      attendanceStats: attendanceStats,
      attendanceTrend: attendanceTrend
    }
  });
}));

// Reporte individual de estudiante
router.get('/student/:student_id/performance', verifyToken, validateStudentId, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const studentId = req.params.student_id;
  
  // Verificar permisos
  if (req.user.role === 'student' && parseInt(studentId) !== req.user.id) {
    return res.status(403).json({ success: false, message: 'No tienes permisos para ver este reporte' });
  }
  
  if (req.user.role === 'instructor') {
    // Verificar que el instructor tenga al menos un curso con este estudiante
    const [instructorCheck] = await db.execute(`
      SELECT 1 FROM course_enrollments ce
      JOIN courses c ON ce.course_id = c.id
      WHERE ce.student_id = ? AND c.instructor_id = ? AND ce.status = 'active'
      LIMIT 1
    `, [studentId, req.user.id]);
    
    if (instructorCheck.length === 0) {
      return res.status(403).json({ success: false, message: 'No tienes permisos para ver este reporte' });
    }
  }
  
  // Información general del estudiante
  const [studentInfo] = await db.execute(`
    SELECT 
      u.id,
      u.name,
      u.email,
      u.registration_date,
      u.last_login,
      COUNT(DISTINCT ce.course_id) as enrolled_courses,
      COUNT(DISTINCT s.id) as total_submissions,
      AVG(CASE WHEN s.grade IS NOT NULL THEN s.grade END) as overall_average
    FROM users u
    LEFT JOIN course_enrollments ce ON u.id = ce.student_id AND ce.status = 'active'
    LEFT JOIN submissions s ON u.id = s.student_id AND s.status = 'graded'
    WHERE u.id = ? AND u.role = 'student'
    GROUP BY u.id, u.name, u.email, u.registration_date, u.last_login
  `, [studentId]);
  
  if (studentInfo.length === 0) {
    return res.status(404).json({ success: false, message: 'Estudiante no encontrado' });
  }
  
  // Rendimiento por curso
  const [coursePerformance] = await db.execute(`
    SELECT 
      c.id as course_id,
      c.name as course_name,
      c.code as course_code,
      COUNT(DISTINCT t.id) as total_tasks,
      COUNT(DISTINCT s.id) as submitted_tasks,
      AVG(CASE WHEN s.grade IS NOT NULL THEN s.grade END) as course_average,
      COUNT(CASE WHEN s.grade >= 3.0 THEN 1 END) as passing_tasks,
      COUNT(CASE WHEN s.grade < 3.0 AND s.grade IS NOT NULL THEN 1 END) as failing_tasks,
      COUNT(CASE WHEN t.due_date < NOW() AND s.id IS NULL THEN 1 END) as overdue_tasks
    FROM course_enrollments ce
    JOIN courses c ON ce.course_id = c.id
    LEFT JOIN tasks t ON c.id = t.course_id AND t.is_published = TRUE
    LEFT JOIN submissions s ON t.id = s.task_id AND s.student_id = ce.student_id
    WHERE ce.student_id = ? AND ce.status = 'active'
    GROUP BY c.id, c.name, c.code
    ORDER BY c.name
  `, [studentId]);
  
  // Historial de calificaciones
  const [gradeHistory] = await db.execute(`
    SELECT 
      s.id as submission_id,
      s.grade,
      s.graded_at,
      t.title as task_title,
      t.max_grade,
      c.name as course_name,
      c.code as course_code
    FROM submissions s
    JOIN tasks t ON s.task_id = t.id
    JOIN courses c ON t.course_id = c.id
    WHERE s.student_id = ? AND s.status = 'graded' AND s.grade IS NOT NULL
    ORDER BY s.graded_at DESC
    LIMIT 50
  `, [studentId]);
  
  // Asistencia por curso
  const [attendanceStats] = await db.execute(`
    SELECT 
      c.id as course_id,
      c.name as course_name,
      c.code as course_code,
      COUNT(*) as total_records,
      COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
      COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_count,
      COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_count,
      ROUND((COUNT(CASE WHEN a.status = 'present' THEN 1 END) / COUNT(*) * 100), 2) as attendance_rate
    FROM course_enrollments ce
    JOIN courses c ON ce.course_id = c.id
    LEFT JOIN attendance a ON ce.course_id = a.course_id AND ce.student_id = a.student_id
    WHERE ce.student_id = ? AND ce.status = 'active'
    GROUP BY c.id, c.name, c.code
    HAVING total_records > 0
    ORDER BY c.name
  `, [studentId]);
  
  // Alertas activas
  const [activeAlerts] = await db.execute(`
    SELECT 
      a.id,
      a.risk_level,
      a.alert_type,
      a.title,
      a.description,
      a.created_at,
      c.name as course_name
    FROM alerts a
    LEFT JOIN courses c ON a.course_id = c.id
    WHERE a.student_id = ? AND a.is_resolved = FALSE
    ORDER BY 
      CASE a.risk_level 
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2  
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
      END,
      a.created_at DESC
  `, [studentId]);
  
  res.json({
    success: true,
    data: {
      studentInfo: studentInfo[0],
      coursePerformance: coursePerformance,
      gradeHistory: gradeHistory,
      attendanceStats: attendanceStats,
      activeAlerts: activeAlerts
    }
  });
}));

// Estadísticas para gráficos (Chart.js)
router.get('/charts/performance-trends', verifyToken, asyncHandler(async (req, res) => {
  const { course_id, period = '30' } = req.query;
  
  let courseFilter = '';
  const params = [parseInt(period)];
  
  if (req.user.role === 'instructor') {
    courseFilter = 'AND c.instructor_id = ?';
    params.push(req.user.id);
  } else if (req.user.role === 'student') {
    courseFilter = 'AND EXISTS (SELECT 1 FROM course_enrollments ce WHERE ce.course_id = c.id AND ce.student_id = ?)';
    params.push(req.user.id);
  }
  
  if (course_id) {
    courseFilter += ' AND c.id = ?';
    params.push(course_id);
  }
  
  // Tendencia de calificaciones promedio por día
  const [performanceTrend] = await db.execute(`
    SELECT 
      DATE(s.graded_at) as grade_date,
      AVG(s.grade) as average_grade,
      COUNT(*) as submissions_count
    FROM submissions s
    JOIN tasks t ON s.task_id = t.id
    JOIN courses c ON t.course_id = c.id
    WHERE s.status = 'graded' 
      AND s.graded_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      AND s.grade IS NOT NULL
      ${courseFilter}
    GROUP BY DATE(s.graded_at)
    ORDER BY grade_date
  `, params);
  
  // Distribución de calificaciones
  const [gradeDistribution] = await db.execute(`
    SELECT 
      CASE 
        WHEN s.grade >= 4.5 THEN 'Excelente (4.5-5.0)'
        WHEN s.grade >= 4.0 THEN 'Sobresaliente (4.0-4.4)'
        WHEN s.grade >= 3.5 THEN 'Bueno (3.5-3.9)'
        WHEN s.grade >= 3.0 THEN 'Aceptable (3.0-3.4)'
        WHEN s.grade >= 2.0 THEN 'Insuficiente (2.0-2.9)'
        ELSE 'Deficiente (0.0-1.9)'
      END as grade_range,
      COUNT(*) as count
    FROM submissions s
    JOIN tasks t ON s.task_id = t.id
    JOIN courses c ON t.course_id = c.id
    WHERE s.status = 'graded' 
      AND s.grade IS NOT NULL
      AND s.graded_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      ${courseFilter}
    GROUP BY grade_range
    ORDER BY MIN(s.grade) DESC
  `, params);
  
  res.json({
    success: true,
    data: {
      performanceTrend: performanceTrend,
      gradeDistribution: gradeDistribution
    }
  });
}));

// Exportar datos para reportes (CSV format)
router.get('/export/course/:course_id/students', verifyToken, validateCourseId, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const courseId = req.params.course_id;
  
  // Verificar permisos
  const [courseCheck] = await db.execute(
    'SELECT id, name, instructor_id FROM courses WHERE id = ?',
    [courseId]
  );
  
  if (courseCheck.length === 0) {
    return res.status(404).json({ success: false, message: 'Curso no encontrado' });
  }
  
  if (req.user.role === 'instructor' && courseCheck[0].instructor_id !== req.user.id) {
    return res.status(403).json({ success: false, message: 'No tienes permisos para exportar este reporte' });
  }
  
  // Obtener datos de estudiantes para exportar
  const [studentsData] = await db.execute(`
    SELECT 
      u.name as 'Nombre',
      u.email as 'Email',
      ce.enrollment_date as 'Fecha Inscripción',
      COUNT(DISTINCT t.id) as 'Talleres Asignados',
      COUNT(DISTINCT s.id) as 'Talleres Enviados',
      AVG(CASE WHEN s.grade IS NOT NULL THEN s.grade END) as 'Promedio',
      COUNT(CASE WHEN s.grade >= 3.0 THEN 1 END) as 'Talleres Aprobados',
      COUNT(CASE WHEN s.grade < 3.0 AND s.grade IS NOT NULL THEN 1 END) as 'Talleres Reprobados',
      COALESCE(att.attendance_rate, 0) as 'Porcentaje Asistencia'
    FROM course_enrollments ce
    JOIN users u ON ce.student_id = u.id
    LEFT JOIN tasks t ON ce.course_id = t.course_id AND t.is_published = TRUE
    LEFT JOIN submissions s ON t.id = s.task_id AND s.student_id = u.id AND s.status = 'graded'
    LEFT JOIN (
      SELECT 
        a.student_id,
        ROUND((COUNT(CASE WHEN a.status = 'present' THEN 1 END) / COUNT(*) * 100), 2) as attendance_rate
      FROM attendance a
      WHERE a.course_id = ?
      GROUP BY a.student_id
    ) att ON u.id = att.student_id
    WHERE ce.course_id = ? AND ce.status = 'active'
    GROUP BY u.id, u.name, u.email, ce.enrollment_date, att.attendance_rate
    ORDER BY u.name
  `, [courseId, courseId]);
  
  res.json({
    success: true,
    data: {
      course_name: courseCheck[0].name,
      students: studentsData,
      export_date: new Date().toISOString()
    }
  });
}));

module.exports = router;
