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
 * /api/grades/student/{studentId}/course/{courseId}:
 *   get:
 *     summary: Get grades for student in specific course
 *     tags: [Grades]
 *     security:
 *       - bearerAuth: []
 */
router.get('/student/:studentId/course/:courseId',
  verifyToken,
  [
    param('studentId').isInt().withMessage('Student ID must be an integer'),
    param('courseId').isInt().withMessage('Course ID must be an integer')
  ],
  asyncHandler(async (req, res) => {
    validateRequest(req);
    
    const { studentId, courseId } = req.params;
    
    // Check authorization - students can only see their own grades
    if (req.user.role === 'student' && req.user.id != studentId) {
      throw new APIError('Unauthorized to view these grades', 403, 'UNAUTHORIZED');
    }
    
    // Get grades with assignment details
    const grades = await executeQuery(`
      SELECT 
        g.*,
        a.title as assignment_title,
        a.assignment_type,
        a.due_date,
        c.name as course_title,
        u.name as student_name
      FROM grades g
      JOIN assignments a ON g.assignment_id = a.id
      JOIN courses c ON g.course_id = c.id
      JOIN users u ON g.student_id = u.id
      WHERE g.student_id = ? AND g.course_id = ?
      ORDER BY a.due_date DESC
    `, [studentId, courseId]);
    
    // Calculate course statistics
    let totalPoints = 0;
    let earnedPoints = 0;
    let totalWeight = 0;
    let weightedScore = 0;
    
    grades.forEach(grade => {
      if (grade.points_earned !== null) {
        totalPoints += grade.max_points;
        earnedPoints += grade.points_earned;
        totalWeight += 1; // Assuming equal weight for now
        weightedScore += grade.percentage;
      }
    });
    
    const overallGrade = totalWeight > 0 ? weightedScore / totalWeight : 0;
    const letterGrade = calculateLetterGrade(overallGrade);
    
    res.json({
      success: true,
      data: {
        grades,
        statistics: {
          totalAssignments: grades.length,
          gradedAssignments: grades.filter(g => g.points_earned !== null).length,
          overallPercentage: Math.round(overallGrade * 100) / 100,
          letterGrade,
          totalPointsEarned: earnedPoints,
          totalPointsPossible: totalPoints
        }
      }
    });
  })
);

/**
 * @swagger
 * /api/grades/course/{courseId}:
 *   get:
 *     summary: Get all grades for a course (instructor/admin only)
 *     tags: [Grades]
 *     security:
 *       - bearerAuth: []
 */
router.get('/course/:courseId',
  verifyToken,
  requireRole('instructor', 'admin'),
  [param('courseId').isInt().withMessage('Course ID must be an integer')],
  asyncHandler(async (req, res) => {
    validateRequest(req);
    
    const courseId = req.params.courseId;
    
    // Check if instructor owns this course (unless admin)
    if (req.user.role === 'instructor') {
      const courses = await executeQuery('SELECT id FROM courses WHERE id = ? AND instructor_id = ?', [courseId, req.user.id]);
      if (courses.length === 0) {
        throw new APIError('Unauthorized to view grades for this course', 403, 'UNAUTHORIZED');
      }
    }
    
    // Get gradebook data
    const gradebook = await executeQuery(`
      SELECT 
        u.id as student_id,
        u.name as student_name,
        u.email as student_email,
        e.enrolled_at,
        AVG(g.percentage) as overall_grade,
        COUNT(g.id) as graded_assignments,
        COUNT(a.id) as total_assignments
      FROM users u
      JOIN enrollments e ON u.id = e.student_id
      LEFT JOIN assignments a ON e.course_id = a.course_id AND a.is_published = TRUE
      LEFT JOIN grades g ON u.id = g.student_id AND a.id = g.assignment_id
      WHERE e.course_id = ? AND e.status = 'enrolled'
      GROUP BY u.id, u.name, u.email, e.enrolled_at
      ORDER BY u.name
    `, [courseId]);
    
    // Get assignments for the course
    const assignments = await executeQuery(`
      SELECT id, title, assignment_type, due_date, max_points, weight
      FROM assignments 
      WHERE course_id = ? AND is_published = TRUE
      ORDER BY due_date
    `, [courseId]);
    
    res.json({
      success: true,
      data: {
        students: gradebook,
        assignments
      }
    });
  })
);

/**
 * @swagger
 * /api/grades:
 *   post:
 *     summary: Create or update grade
 *     tags: [Grades]
 *     security:
 *       - bearerAuth: []
 */
router.post('/',
  verifyToken,
  requireRole('instructor', 'admin'),
  [
    body('student_id').isInt().withMessage('Student ID must be an integer'),
    body('assignment_id').isInt().withMessage('Assignment ID must be an integer'),
    body('course_id').isInt().withMessage('Course ID must be an integer'),
    body('points_earned').isFloat({ min: 0 }).withMessage('Points earned must be a non-negative number'),
    body('max_points').isFloat({ min: 0.1 }).withMessage('Max points must be greater than 0'),
    body('feedback').optional().isString(),
    body('is_late').optional().isBoolean()
  ],
  asyncHandler(async (req, res) => {
    validateRequest(req);
    
    const {
      student_id, assignment_id, course_id, points_earned, 
      max_points, feedback, is_late
    } = req.body;
    
    // Check if instructor owns this course (unless admin)
    if (req.user.role === 'instructor') {
      const courses = await executeQuery('SELECT id FROM courses WHERE id = ? AND instructor_id = ?', [course_id, req.user.id]);
      if (courses.length === 0) {
        throw new APIError('Unauthorized to grade this course', 403, 'UNAUTHORIZED');
      }
    }
    
    // Verify assignment belongs to course
    const assignments = await executeQuery('SELECT id FROM assignments WHERE id = ? AND course_id = ?', [assignment_id, course_id]);
    if (assignments.length === 0) {
      throw new APIError('Assignment not found in this course', 404, 'ASSIGNMENT_NOT_FOUND');
    }
    
    // Verify student is enrolled in course
    const enrollments = await executeQuery('SELECT id FROM enrollments WHERE student_id = ? AND course_id = ? AND status = "enrolled"', [student_id, course_id]);
    if (enrollments.length === 0) {
      throw new APIError('Student not enrolled in this course', 404, 'STUDENT_NOT_ENROLLED');
    }
    
    // Calculate percentage and letter grade
    const percentage = (points_earned / max_points) * 100;
    const letterGrade = calculateLetterGrade(percentage);
    
    // Check if grade already exists
    const existingGrades = await executeQuery('SELECT id FROM grades WHERE student_id = ? AND assignment_id = ?', [student_id, assignment_id]);
    
    if (existingGrades.length > 0) {
      // Update existing grade
      await executeQuery(`
        UPDATE grades SET 
          points_earned = ?, max_points = ?, percentage = ?, letter_grade = ?,
          feedback = ?, is_late = ?, graded_by = ?, graded_at = NOW()
        WHERE student_id = ? AND assignment_id = ?
      `, [points_earned, max_points, percentage, letterGrade, feedback || null, is_late || false, req.user.id, student_id, assignment_id]);
      
      res.json({
        success: true,
        message: 'Grade updated successfully'
      });
    } else {
      // Create new grade
      await executeQuery(`
        INSERT INTO grades (
          student_id, assignment_id, course_id, points_earned, max_points, 
          percentage, letter_grade, feedback, is_late, graded_by, graded_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [student_id, assignment_id, course_id, points_earned, max_points, percentage, letterGrade, feedback || null, is_late || false, req.user.id]);
      
      res.status(201).json({
        success: true,
        message: 'Grade created successfully'
      });
    }
  })
);

/**
 * @swagger
 * /api/grades/assignments:
 *   get:
 *     summary: Get assignments for grading
 *     tags: [Grades]
 *     security:
 *       - bearerAuth: []
 */
router.get('/assignments',
  verifyToken,
  requireRole('instructor', 'admin'),
  [query('course_id').optional().isInt()],
  asyncHandler(async (req, res) => {
    validateRequest(req);
    
    const { course_id } = req.query;
    let whereCondition = 'a.is_published = TRUE';
    let params = [];
    
    if (course_id) {
      whereCondition += ' AND a.course_id = ?';
      params.push(course_id);
    }
    
    // For instructors, only show their courses
    if (req.user.role === 'instructor') {
      whereCondition += ' AND c.instructor_id = ?';
      params.push(req.user.id);
    }
    
    const assignments = await executeQuery(`
      SELECT 
        a.*,
        c.name as course_title,
        c.code as course_code,
        COUNT(g.id) as graded_count,
        COUNT(e.id) as total_students
      FROM assignments a
      JOIN courses c ON a.course_id = c.id
      LEFT JOIN enrollments e ON c.id = e.course_id AND e.status = 'enrolled'
      LEFT JOIN grades g ON a.id = g.assignment_id
      WHERE ${whereCondition}
      GROUP BY a.id, c.name, c.code
      ORDER BY a.due_date DESC
    `, params);
    
    res.json({
      success: true,
      data: assignments
    });
  })
);

/**
 * @swagger
 * /api/grades/my-grades:
 *   get:
 *     summary: Get current user's grades (student only)
 *     tags: [Grades]
 *     security:
 *       - bearerAuth: []
 */
router.get('/my-grades',
  verifyToken,
  requireRole('student'),
  asyncHandler(async (req, res) => {
    const studentId = req.user.id;
    
    const grades = await executeQuery(`
      SELECT 
        g.*,
        a.title as assignment_title,
        a.assignment_type,
        a.due_date,
        a.max_points as assignment_max_points,
        c.name as course_title,
        c.code as course_code,
        u.name as instructor_name
      FROM grades g
      JOIN assignments a ON g.assignment_id = a.id
      JOIN courses c ON g.course_id = c.id
      JOIN users u ON c.instructor_id = u.id
      WHERE g.student_id = ?
      ORDER BY g.graded_at DESC
    `, [studentId]);
    
    // Group by course
    const groupedGrades = {};
    grades.forEach(grade => {
      const courseKey = grade.course_id;
      if (!groupedGrades[courseKey]) {
        groupedGrades[courseKey] = {
          courseId: grade.course_id,
          courseName: grade.course_title,
          courseCode: grade.course_code,
          instructorName: grade.instructor_name,
          grades: [],
          statistics: {
            totalAssignments: 0,
            gradedAssignments: 0,
            overallGrade: 0
          }
        };
      }
      groupedGrades[courseKey].grades.push(grade);
    });
    
    // Calculate statistics for each course
    Object.values(groupedGrades).forEach(courseGrades => {
      const grades = courseGrades.grades;
      courseGrades.statistics.totalAssignments = grades.length;
      courseGrades.statistics.gradedAssignments = grades.filter(g => g.points_earned !== null).length;
      
      if (courseGrades.statistics.gradedAssignments > 0) {
        const avgGrade = grades
          .filter(g => g.points_earned !== null)
          .reduce((sum, g) => sum + g.percentage, 0) / courseGrades.statistics.gradedAssignments;
        courseGrades.statistics.overallGrade = Math.round(avgGrade * 100) / 100;
      }
    });
    
    res.json({
      success: true,
      data: Object.values(groupedGrades)
    });
  })
);

// Helper function to calculate letter grade
function calculateLetterGrade(percentage) {
  if (percentage >= 97) return 'A+';
  if (percentage >= 93) return 'A';
  if (percentage >= 90) return 'A-';
  if (percentage >= 87) return 'B+';
  if (percentage >= 83) return 'B';
  if (percentage >= 80) return 'B-';
  if (percentage >= 77) return 'C+';
  if (percentage >= 73) return 'C';
  if (percentage >= 70) return 'C-';
  if (percentage >= 67) return 'D+';
  if (percentage >= 63) return 'D';
  if (percentage >= 60) return 'D-';
  return 'F';
}

module.exports = router;
