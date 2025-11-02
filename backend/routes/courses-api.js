const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { executeQuery, executeTransaction } = require('../config/database');
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
 * /api/courses:
 *   get:
 *     summary: Get all courses
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', verifyToken, asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, category, level, search } = req.query;
  
  let whereConditions = ['courses.is_active = TRUE'];
  let params = [];
  
  if (category) {
    whereConditions.push('courses.category = ?');
    params.push(category);
  }
  
  if (level) {
    whereConditions.push('courses.level = ?');
    params.push(level);
  }
  
  if (search) {
    whereConditions.push('(courses.name LIKE ? OR courses.description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  
  const whereClause = whereConditions.join(' AND ');
  
  const baseQuery = `
    SELECT 
      courses.*,
      users.name as instructor_name,
      users.email as instructor_email
    FROM courses 
    JOIN users ON courses.instructor_id = users.id
    WHERE ${whereClause}
    ORDER BY courses.created_at DESC
  `;
  
  const countQuery = `
    SELECT COUNT(*) as count 
    FROM courses 
    JOIN users ON courses.instructor_id = users.id
    WHERE ${whereClause}
  `;
  
  const offset = (page - 1) * limit;
  const [totalResult] = await executeQuery(countQuery, params);
  const total = totalResult.count;
  
  const [courses] = await executeQuery(`${baseQuery} LIMIT ${limit} OFFSET ${offset}`, params);
  
  res.json({
    success: true,
    data: courses,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

/**
 * @swagger
 * /api/courses/{id}:
 *   get:
 *     summary: Get course by ID
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', 
  verifyToken,
  [param('id').isInt().withMessage('Course ID must be an integer')],
  asyncHandler(async (req, res) => {
    validateRequest(req);
    
    const courseId = req.params.id;
    
    const courses = await executeQuery(`
      SELECT 
        courses.*,
        users.name as instructor_name,
        users.email as instructor_email
      FROM courses 
      JOIN users ON courses.instructor_id = users.id
      WHERE courses.id = ? AND courses.is_active = TRUE
    `, [courseId]);
    
    if (courses.length === 0) {
      throw new APIError('Course not found', 404, 'COURSE_NOT_FOUND');
    }
    
    // Get course schedule
    const schedules = await executeQuery(`
      SELECT * FROM schedules 
      WHERE course_id = ? 
      ORDER BY day_of_week, start_time
    `, [courseId]);
    
    // Get enrolled students count
    const [enrollmentCount] = await executeQuery(`
      SELECT COUNT(*) as count 
      FROM course_enrollments 
      WHERE course_id = ? AND status = 'active'
    `, [courseId]);
    
    const course = {
      ...courses[0],
      schedules,
      current_students: enrollmentCount.count
    };
    
    res.json({
      success: true,
      data: course
    });
  })
);

/**
 * @swagger
 * /api/courses:
 *   post:
 *     summary: Create new course
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 */
router.post('/',
  verifyToken,
  requireRole('admin', 'instructor'),
  [
    body('name').trim().isLength({ min: 3, max: 255 }).withMessage('Name must be between 3 and 255 characters'),
    body('description').optional().isString(),
    body('code').trim().isLength({ min: 2, max: 50 }).withMessage('Code must be between 2 and 50 characters'),
    body('category').optional().isString(),
    body('level').optional().isIn(['beginner', 'intermediate', 'advanced']),
    body('credits').optional().isInt({ min: 1, max: 10 }),
    body('max_students').optional().isInt({ min: 1, max: 200 }),
    body('start_date').optional().isISO8601(),
    body('end_date').optional().isISO8601(),
    body('syllabus').optional().isString()
  ],
  asyncHandler(async (req, res) => {
    validateRequest(req);
    
    const {
      name, description, code, category, level, credits, 
      max_students, start_date, end_date, syllabus
    } = req.body;
    
    // For instructors, use their own ID. For admins, they can specify instructor_id
    const instructor_id = req.user.role === 'admin' && req.body.instructor_id 
      ? req.body.instructor_id 
      : req.user.id;
    
    // Check if code already exists
    const existingCourses = await executeQuery('SELECT id FROM courses WHERE code = ?', [code]);
    if (existingCourses.length > 0) {
      throw new APIError('Course code already exists', 409, 'CODE_EXISTS');
    }
    
    const result = await executeQuery(`
      INSERT INTO courses (
        name, description, code, instructor_id, category, level, 
        credits, max_students, start_date, end_date, syllabus, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
    `, [
      name, description, code, instructor_id, category || null, level || 'beginner',
      credits || 3, max_students || 30, start_date || null, end_date || null, syllabus || null
    ]);
    
    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: { courseId: result.insertId }
    });
  })
);

/**
 * @swagger
 * /api/courses/{id}/enroll:
 *   post:
 *     summary: Enroll in course
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/enroll',
  verifyToken,
  requireRole('student'),
  [param('id').isInt().withMessage('Course ID must be an integer')],
  asyncHandler(async (req, res) => {
    validateRequest(req);
    
    const courseId = req.params.id;
    const studentId = req.user.id;
    
    // Check if course exists and is active
    const courses = await executeQuery(`
      SELECT id, name, max_students, current_students
      FROM courses 
      WHERE id = ? AND is_active = TRUE
    `, [courseId]);
    
    if (courses.length === 0) {
      throw new APIError('Course not found', 404, 'COURSE_NOT_FOUND');
    }
    
    const course = courses[0];
    
    // Check if already enrolled
    const existingEnrollments = await executeQuery(`
      SELECT id FROM enrollments 
      WHERE student_id = ? AND course_id = ?
    `, [studentId, courseId]);
    
    if (existingEnrollments.length > 0) {
      throw new APIError('Already enrolled in this course', 409, 'ALREADY_ENROLLED');
    }
    
    // Check capacity
    if (course.current_students >= course.max_students) {
      throw new APIError('Course is full', 409, 'COURSE_FULL');
    }
    
    // Enroll student
    await executeTransaction([
      {
        sql: 'INSERT INTO enrollments (student_id, course_id, status) VALUES (?, ?, "enrolled")',
        params: [studentId, courseId]
      },
      {
        sql: 'UPDATE courses SET current_students = current_students + 1 WHERE id = ?',
        params: [courseId]
      }
    ]);
    
    res.json({
      success: true,
      message: `Successfully enrolled in ${course.name}`
    });
  })
);

/**
 * @swagger
 * /api/courses/enroll-by-code:
 *   post:
 *     summary: Enroll in course by code
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 */
router.post('/enroll-by-code',
  verifyToken,
  requireRole('student'),
  [body('code').trim().notEmpty().withMessage('Course code is required')],
  asyncHandler(async (req, res) => {
    validateRequest(req);
    
    const { code } = req.body;
    const studentId = req.user.id;
    
    // Find course by code
    const courses = await executeQuery(`
      SELECT id, name, max_students, current_students, instructor_id
      FROM courses 
      WHERE code = ? AND is_active = TRUE
    `, [code]);
    
    if (courses.length === 0) {
      throw new APIError('Course not found with this code', 404, 'COURSE_NOT_FOUND');
    }
    
    const course = courses[0];
    
    // Check if already enrolled
    const existingEnrollments = await executeQuery(`
      SELECT id FROM course_enrollments 
      WHERE student_id = ? AND course_id = ?
    `, [studentId, course.id]);
    
    if (existingEnrollments.length > 0) {
      throw new APIError('Already enrolled in this course', 409, 'ALREADY_ENROLLED');
    }
    
    // Check capacity
    if (course.current_students >= course.max_students) {
      throw new APIError('Course is full', 409, 'COURSE_FULL');
    }
    
    // Enroll student
    await executeTransaction([
      {
        sql: 'INSERT INTO course_enrollments (student_id, course_id, status) VALUES (?, ?, "active")',
        params: [studentId, course.id]
      },
      {
        sql: 'UPDATE courses SET current_students = current_students + 1 WHERE id = ?',
        params: [course.id]
      }
    ]);
    
    res.json({
      success: true,
      message: `Successfully enrolled in ${course.name}`,
      data: { courseId: course.id, courseName: course.name }
    });
  })
);

/**
 * @swagger
 * /api/courses/my-courses:
 *   get:
 *     summary: Get user's courses (enrolled or teaching)
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 */
router.get('/my/courses', verifyToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  
  let courses = [];
  
  if (userRole === 'student') {
    // Get enrolled courses
    courses = await executeQuery(`
      SELECT 
        c.*,
        u.name as instructor_name,
        e.status as enrollment_status
      FROM courses c
      JOIN users u ON c.instructor_id = u.id
      JOIN course_enrollments e ON c.id = e.course_id
      WHERE e.student_id = ? AND c.is_active = TRUE AND e.status = 'active'
      ORDER BY c.created_at DESC
    `, [userId]);
  } else if (userRole === 'instructor') {
    // Get teaching courses
    courses = await executeQuery(`
      SELECT 
        c.*,
        c.current_students
      FROM courses c
      WHERE c.instructor_id = ? AND c.is_active = TRUE
      ORDER BY c.created_at DESC
    `, [userId]);
  } else if (userRole === 'admin') {
    // Get all courses for admin
    courses = await executeQuery(`
      SELECT 
        c.*,
        u.name as instructor_name,
        c.current_students
      FROM courses c
      JOIN users u ON c.instructor_id = u.id
      WHERE c.is_active = TRUE
      ORDER BY c.created_at DESC
    `);
  }
  
  res.json({
    success: true,
    data: courses
  });
}));

module.exports = router;