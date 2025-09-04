const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { executeQuery, getPaginatedResults, executeTransaction } = require('../config/database');
const { verifyToken, requireAdmin, requireInstructor } = require('../middleware/auth');
const { APIError, asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Get all courses
router.get('/',
  verifyToken,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, instructor_id, is_active } = req.query;
    
    let whereConditions = [];
    let params = [];
    
    if (instructor_id) {
      whereConditions.push('c.instructor_id = ?');
      params.push(instructor_id);
    }
    
    if (is_active !== undefined) {
      whereConditions.push('c.is_active = ?');
      params.push(is_active === 'true');
    }
    
    // Students can only see active courses they're enrolled in or all active courses
    if (req.user.role === 'student') {
      whereConditions.push('c.is_active = true');
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const baseQuery = `
      SELECT c.id, c.name, c.description, c.code, c.start_date, c.end_date, 
             c.is_active, c.max_students, c.created_at,
             u.name as instructor_name,
             COUNT(DISTINCT ce.student_id) as enrolled_students
      FROM courses c
      JOIN users u ON c.instructor_id = u.id
      LEFT JOIN course_enrollments ce ON c.id = ce.course_id AND ce.status = 'active'
      ${whereClause}
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `;
    
    const countQuery = `
      SELECT COUNT(DISTINCT c.id) as count 
      FROM courses c 
      JOIN users u ON c.instructor_id = u.id
      ${whereClause}
    `;
    
    const result = await getPaginatedResults(baseQuery, countQuery, params, page, limit);
    
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  })
);

// Create course (instructor/admin only)
router.post('/',
  verifyToken,
  requireInstructor,
  [
    body('name').trim().isLength({ min: 3, max: 255 }).withMessage('Course name must be 3-255 characters'),
    body('description').optional().trim(),
    body('code').trim().isLength({ min: 3, max: 50 }).withMessage('Course code must be 3-50 characters'),
    body('start_date').optional().isISO8601().toDate(),
    body('end_date').optional().isISO8601().toDate(),
    body('max_students').optional().isInt({ min: 1, max: 1000 })
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new APIError('Validation failed', 400, 'VALIDATION_ERROR');
    }
    
    const { name, description, code, start_date, end_date, max_students = 50 } = req.body;
    
    // Check if course code already exists
    const existingCourse = await executeQuery('SELECT id FROM courses WHERE code = ?', [code]);
    if (existingCourse.length > 0) {
      throw new APIError('Course code already exists', 409, 'COURSE_CODE_EXISTS');
    }
    
    const result = await executeQuery(`
      INSERT INTO courses (name, description, code, instructor_id, start_date, end_date, max_students)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [name, description, code, req.user.id, start_date, end_date, max_students]);
    
    const newCourse = await executeQuery(`
      SELECT c.*, u.name as instructor_name
      FROM courses c
      JOIN users u ON c.instructor_id = u.id
      WHERE c.id = ?
    `, [result.insertId]);
    
    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: newCourse[0]
    });
  })
);

// Get course by ID
router.get('/:id',
  verifyToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const courses = await executeQuery(`
      SELECT c.*, u.name as instructor_name, u.email as instructor_email,
             COUNT(DISTINCT ce.student_id) as enrolled_students,
             COUNT(DISTINCT t.id) as total_tasks,
             COUNT(DISTINCT m.id) as total_materials
      FROM courses c
      JOIN users u ON c.instructor_id = u.id
      LEFT JOIN course_enrollments ce ON c.id = ce.course_id AND ce.status = 'active'
      LEFT JOIN tasks t ON c.id = t.course_id
      LEFT JOIN materials m ON c.id = m.course_id
      WHERE c.id = ?
      GROUP BY c.id
    `, [id]);
    
    if (courses.length === 0) {
      throw new APIError('Course not found', 404, 'COURSE_NOT_FOUND');
    }
    
    const course = courses[0];
    
    // Check access permissions
    if (req.user.role === 'student') {
      // Check if student is enrolled
      const enrollment = await executeQuery(
        'SELECT id FROM course_enrollments WHERE course_id = ? AND student_id = ? AND status = "active"',
        [id, req.user.id]
      );
      if (enrollment.length === 0 && !course.is_active) {
        throw new APIError('Access denied', 403, 'ACCESS_DENIED');
      }
    }
    
    res.json({
      success: true,
      data: course
    });
  })
);

// Enroll in course (student only)
router.post('/:id/enroll',
  verifyToken,
  asyncHandler(async (req, res) => {
    if (req.user.role !== 'student') {
      throw new APIError('Only students can enroll in courses', 403, 'INVALID_ROLE');
    }
    
    const { id: courseId } = req.params;
    
    // Check if course exists and is active
    const courses = await executeQuery(
      'SELECT id, max_students FROM courses WHERE id = ? AND is_active = true',
      [courseId]
    );
    
    if (courses.length === 0) {
      throw new APIError('Course not found or inactive', 404, 'COURSE_NOT_FOUND');
    }
    
    // Check if already enrolled
    const existingEnrollment = await executeQuery(
      'SELECT id FROM course_enrollments WHERE course_id = ? AND student_id = ?',
      [courseId, req.user.id]
    );
    
    if (existingEnrollment.length > 0) {
      throw new APIError('Already enrolled in this course', 409, 'ALREADY_ENROLLED');
    }
    
    // Check course capacity
    const enrollmentCount = await executeQuery(
      'SELECT COUNT(*) as count FROM course_enrollments WHERE course_id = ? AND status = "active"',
      [courseId]
    );
    
    if (enrollmentCount[0].count >= courses[0].max_students) {
      throw new APIError('Course is full', 409, 'COURSE_FULL');
    }
    
    // Enroll student
    await executeQuery(
      'INSERT INTO course_enrollments (course_id, student_id) VALUES (?, ?)',
      [courseId, req.user.id]
    );
    
    res.json({
      success: true,
      message: 'Enrolled successfully'
    });
  })
);

module.exports = router;
