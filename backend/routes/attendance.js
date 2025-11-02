const express = require('express');
const { body, validationResult } = require('express-validator');
const { verifyToken, requireInstructor } = require('../middleware/auth');
const { asyncHandler, APIError } = require('../middleware/errorHandler');
const { executeQuery } = require('../config/database');

const router = express.Router();

// Get all students enrolled in instructor's courses
router.get('/students',
  verifyToken,
  requireInstructor,
  asyncHandler(async (req, res) => {
    // Get all students from courses taught by this instructor
    const students = await executeQuery(`
      SELECT DISTINCT 
        u.id, 
        u.name, 
        u.email,
        u.institution_id,
        i.name as institution_name,
        i.code as institution_code,
        GROUP_CONCAT(DISTINCT c.name SEPARATOR ', ') as courses
      FROM users u
      INNER JOIN course_enrollments ce ON u.id = ce.student_id
      INNER JOIN courses c ON ce.course_id = c.id
      LEFT JOIN institutions i ON u.institution_id = i.id
      WHERE c.instructor_id = ? AND ce.status = 'active' AND u.role = 'student'
      GROUP BY u.id
      ORDER BY u.name ASC
    `, [req.user.id]);

    res.json({
      success: true,
      data: students,
      count: students.length
    });
  })
);

// Get attendance records for a specific date
router.get('/records',
  verifyToken,
  requireInstructor,
  asyncHandler(async (req, res) => {
    const { date, course_id } = req.query;

    if (!date) {
      throw new APIError('Date parameter is required', 400, 'MISSING_DATE');
    }

    let whereConditions = ['c.instructor_id = ?', 'ar.attendance_date = ?'];
    let params = [req.user.id, date];

    if (course_id) {
      whereConditions.push('ar.course_id = ?');
      params.push(course_id);
    }

    const records = await executeQuery(`
      SELECT 
        ar.*,
        u.name as student_name,
        c.name as course_name
      FROM attendance_records ar
      JOIN users u ON ar.student_id = u.id
      JOIN courses c ON ar.course_id = c.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY u.name ASC
    `, params);

    res.json({
      success: true,
      data: records
    });
  })
);

// Mark attendance for students
router.post('/mark',
  verifyToken,
  requireInstructor,
  [
    body('course_id').isInt().withMessage('Valid course ID required'),
    body('student_id').isInt().withMessage('Valid student ID required'),
    body('attendance_date').isDate().withMessage('Valid date required'),
    body('status').isIn(['present', 'absent', 'late', 'excused']).withMessage('Invalid status'),
    body('notes').optional().trim()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new APIError('Validation failed', 400, 'VALIDATION_ERROR');
    }

    const { course_id, student_id, attendance_date, status, notes } = req.body;

    // Verify course belongs to instructor
    const courses = await executeQuery(
      'SELECT id FROM courses WHERE id = ? AND instructor_id = ?',
      [course_id, req.user.id]
    );

    if (courses.length === 0) {
      throw new APIError('Course not found or access denied', 404, 'COURSE_NOT_FOUND');
    }

    // Verify student is enrolled
    const enrollment = await executeQuery(
      'SELECT id FROM course_enrollments WHERE course_id = ? AND student_id = ? AND status = "active"',
      [course_id, student_id]
    );

    if (enrollment.length === 0) {
      throw new APIError('Student not enrolled in this course', 404, 'NOT_ENROLLED');
    }

    // Check if attendance already exists
    const existing = await executeQuery(
      'SELECT id FROM attendance_records WHERE course_id = ? AND student_id = ? AND attendance_date = ?',
      [course_id, student_id, attendance_date]
    );

    if (existing.length > 0) {
      // Update existing
      await executeQuery(
        'UPDATE attendance_records SET status = ?, notes = ?, updated_at = NOW() WHERE id = ?',
        [status, notes, existing[0].id]
      );
    } else {
      // Create new
      await executeQuery(
        'INSERT INTO attendance_records (course_id, student_id, attendance_date, status, notes, recorded_by) VALUES (?, ?, ?, ?, ?, ?)',
        [course_id, student_id, attendance_date, status, notes, req.user.id]
      );
    }

    res.json({
      success: true,
      message: 'Attendance marked successfully'
    });
  })
);

// Get attendance summary for a course
router.get('/summary/:course_id',
  verifyToken,
  requireInstructor,
  asyncHandler(async (req, res) => {
    const { course_id } = req.params;

    // Verify course belongs to instructor
    const courses = await executeQuery(
      'SELECT id, name FROM courses WHERE id = ? AND instructor_id = ?',
      [course_id, req.user.id]
    );

    if (courses.length === 0) {
      throw new APIError('Course not found or access denied', 404, 'COURSE_NOT_FOUND');
    }

    // Get attendance summary
    const summary = await executeQuery(`
      SELECT 
        u.id as student_id,
        u.name as student_name,
        COUNT(CASE WHEN ar.status = 'present' THEN 1 END) as present_count,
        COUNT(CASE WHEN ar.status = 'absent' THEN 1 END) as absent_count,
        COUNT(CASE WHEN ar.status = 'late' THEN 1 END) as late_count,
        COUNT(CASE WHEN ar.status = 'excused' THEN 1 END) as excused_count,
        COUNT(ar.id) as total_sessions
      FROM users u
      INNER JOIN course_enrollments ce ON u.id = ce.student_id
      LEFT JOIN attendance_records ar ON u.id = ar.student_id AND ar.course_id = ?
      WHERE ce.course_id = ? AND ce.status = 'active'
      GROUP BY u.id
      ORDER BY u.name ASC
    `, [course_id, course_id]);

    res.json({
      success: true,
      data: {
        course: courses[0],
        students: summary
      }
    });
  })
);

module.exports = router;
