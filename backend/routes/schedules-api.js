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
 * /api/schedules/course/{courseId}:
 *   get:
 *     summary: Get schedule for specific course
 *     tags: [Schedules]
 *     security:
 *       - bearerAuth: []
 */
router.get('/course/:courseId',
  verifyToken,
  [param('courseId').isInt().withMessage('Course ID must be an integer')],
  asyncHandler(async (req, res) => {
    validateRequest(req);
    
    const courseId = req.params.courseId;
    
    // Get course info
    const courses = await executeQuery(`
      SELECT c.*, u.name as instructor_name
      FROM courses c
      JOIN users u ON c.instructor_id = u.id
      WHERE c.id = ? AND c.is_active = TRUE
    `, [courseId]);
    
    if (courses.length === 0) {
      throw new APIError('Course not found', 404, 'COURSE_NOT_FOUND');
    }
    
    // Get schedules
    const schedules = await executeQuery(`
      SELECT * FROM schedules 
      WHERE course_id = ? 
      ORDER BY 
        FIELD(day_of_week, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
        start_time
    `, [courseId]);
    
    res.json({
      success: true,
      data: {
        course: courses[0],
        schedules
      }
    });
  })
);

/**
 * @swagger
 * /api/schedules/my-schedule:
 *   get:
 *     summary: Get user's personal schedule
 *     tags: [Schedules]
 *     security:
 *       - bearerAuth: []
 */
router.get('/my-schedule', verifyToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const { start_date, end_date } = req.query;
  
  let schedules = [];
  
  if (userRole === 'student') {
    // Get schedules for enrolled courses
    schedules = await executeQuery(`
      SELECT 
        s.*,
        c.title as course_title,
        c.code as course_code,
        u.name as instructor_name
      FROM schedules s
      JOIN courses c ON s.course_id = c.id
      JOIN users u ON c.instructor_id = u.id
      JOIN enrollments e ON c.id = e.course_id
      WHERE e.student_id = ? AND e.status = 'enrolled' AND c.is_active = TRUE
      ORDER BY 
        FIELD(s.day_of_week, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
        s.start_time
    `, [userId]);
  } else if (userRole === 'instructor') {
    // Get schedules for teaching courses
    schedules = await executeQuery(`
      SELECT 
        s.*,
        c.title as course_title,
        c.code as course_code,
        c.current_students
      FROM schedules s
      JOIN courses c ON s.course_id = c.id
      WHERE c.instructor_id = ? AND c.is_active = TRUE
      ORDER BY 
        FIELD(s.day_of_week, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
        s.start_time
    `, [userId]);
  } else if (userRole === 'admin') {
    // Get all schedules for admin
    schedules = await executeQuery(`
      SELECT 
        s.*,
        c.title as course_title,
        c.code as course_code,
        u.name as instructor_name
      FROM schedules s
      JOIN courses c ON s.course_id = c.id
      JOIN users u ON c.instructor_id = u.id
      WHERE c.is_active = TRUE
      ORDER BY 
        FIELD(s.day_of_week, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
        s.start_time
    `);
  }
  
  // Group by day of week
  const groupedSchedule = {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: []
  };
  
  schedules.forEach(schedule => {
    groupedSchedule[schedule.day_of_week].push(schedule);
  });
  
  res.json({
    success: true,
    data: {
      schedule: groupedSchedule,
      summary: {
        totalClasses: schedules.length,
        daysWithClasses: Object.values(groupedSchedule).filter(day => day.length > 0).length
      }
    }
  });
}));

/**
 * @swagger
 * /api/schedules:
 *   post:
 *     summary: Create new schedule entry
 *     tags: [Schedules]
 *     security:
 *       - bearerAuth: []
 */
router.post('/',
  verifyToken,
  requireRole('instructor', 'admin'),
  [
    body('course_id').isInt().withMessage('Course ID must be an integer'),
    body('day_of_week').isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']).withMessage('Invalid day of week'),
    body('start_time').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).withMessage('Start time must be in HH:MM:SS format'),
    body('end_time').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).withMessage('End time must be in HH:MM:SS format'),
    body('location').optional().isString(),
    body('session_type').optional().isIn(['lecture', 'lab', 'seminar', 'workshop', 'exam']),
    body('specific_date').optional().isISO8601(),
    body('notes').optional().isString()
  ],
  asyncHandler(async (req, res) => {
    validateRequest(req);
    
    const {
      course_id, day_of_week, start_time, end_time, location,
      session_type, is_recurring, specific_date, notes
    } = req.body;
    
    // Check if instructor owns this course (unless admin)
    if (req.user.role === 'instructor') {
      const courses = await executeQuery('SELECT id FROM courses WHERE id = ? AND instructor_id = ?', [course_id, req.user.id]);
      if (courses.length === 0) {
        throw new APIError('Unauthorized to create schedule for this course', 403, 'UNAUTHORIZED');
      }
    }
    
    // Validate time range
    if (start_time >= end_time) {
      throw new APIError('Start time must be before end time', 400, 'INVALID_TIME_RANGE');
    }
    
    // Check for conflicts
    const conflicts = await executeQuery(`
      SELECT s.*, c.title as course_title
      FROM schedules s
      JOIN courses c ON s.course_id = c.id
      WHERE s.course_id = ? AND s.day_of_week = ? AND c.is_active = TRUE
      AND (
        (? >= s.start_time AND ? < s.end_time) OR
        (? > s.start_time AND ? <= s.end_time) OR
        (? <= s.start_time AND ? >= s.end_time)
      )
    `, [course_id, day_of_week, start_time, start_time, end_time, end_time, start_time, end_time]);
    
    if (conflicts.length > 0) {
      throw new APIError('Schedule conflict detected', 409, 'SCHEDULE_CONFLICT');
    }
    
    const result = await executeQuery(`
      INSERT INTO schedules (
        course_id, day_of_week, start_time, end_time, location,
        session_type, is_recurring, specific_date, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      course_id, day_of_week, start_time, end_time, location || null,
      session_type || 'lecture', is_recurring !== false, specific_date || null, notes || null
    ]);
    
    res.status(201).json({
      success: true,
      message: 'Schedule created successfully',
      data: { scheduleId: result.insertId }
    });
  })
);

/**
 * @swagger
 * /api/schedules/{id}:
 *   put:
 *     summary: Update schedule entry
 *     tags: [Schedules]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id',
  verifyToken,
  requireRole('instructor', 'admin'),
  [
    param('id').isInt().withMessage('Schedule ID must be an integer'),
    body('day_of_week').optional().isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
    body('start_time').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/),
    body('end_time').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/),
    body('location').optional().isString(),
    body('session_type').optional().isIn(['lecture', 'lab', 'seminar', 'workshop', 'exam']),
    body('notes').optional().isString()
  ],
  asyncHandler(async (req, res) => {
    validateRequest(req);
    
    const scheduleId = req.params.id;
    const updates = req.body;
    
    // Get current schedule
    const schedules = await executeQuery(`
      SELECT s.*, c.instructor_id
      FROM schedules s
      JOIN courses c ON s.course_id = c.id
      WHERE s.id = ?
    `, [scheduleId]);
    
    if (schedules.length === 0) {
      throw new APIError('Schedule not found', 404, 'SCHEDULE_NOT_FOUND');
    }
    
    const schedule = schedules[0];
    
    // Check authorization
    if (req.user.role === 'instructor' && schedule.instructor_id !== req.user.id) {
      throw new APIError('Unauthorized to update this schedule', 403, 'UNAUTHORIZED');
    }
    
    // Build update query
    const updateFields = [];
    const updateValues = [];
    
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        updateValues.push(updates[key]);
      }
    });
    
    if (updateFields.length === 0) {
      throw new APIError('No fields to update', 400, 'NO_UPDATES');
    }
    
    updateValues.push(scheduleId);
    
    await executeQuery(`
      UPDATE schedules SET ${updateFields.join(', ')} WHERE id = ?
    `, updateValues);
    
    res.json({
      success: true,
      message: 'Schedule updated successfully'
    });
  })
);

/**
 * @swagger
 * /api/schedules/{id}:
 *   delete:
 *     summary: Delete schedule entry
 *     tags: [Schedules]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id',
  verifyToken,
  requireRole('instructor', 'admin'),
  [param('id').isInt().withMessage('Schedule ID must be an integer')],
  asyncHandler(async (req, res) => {
    validateRequest(req);
    
    const scheduleId = req.params.id;
    
    // Get current schedule
    const schedules = await executeQuery(`
      SELECT s.*, c.instructor_id
      FROM schedules s
      JOIN courses c ON s.course_id = c.id
      WHERE s.id = ?
    `, [scheduleId]);
    
    if (schedules.length === 0) {
      throw new APIError('Schedule not found', 404, 'SCHEDULE_NOT_FOUND');
    }
    
    const schedule = schedules[0];
    
    // Check authorization
    if (req.user.role === 'instructor' && schedule.instructor_id !== req.user.id) {
      throw new APIError('Unauthorized to delete this schedule', 403, 'UNAUTHORIZED');
    }
    
    await executeQuery('DELETE FROM schedules WHERE id = ?', [scheduleId]);
    
    res.json({
      success: true,
      message: 'Schedule deleted successfully'
    });
  })
);

/**
 * @swagger
 * /api/schedules/upcoming:
 *   get:
 *     summary: Get upcoming classes for user
 *     tags: [Schedules]
 *     security:
 *       - bearerAuth: []
 */
router.get('/upcoming', verifyToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const { limit = 5 } = req.query;
  
  // Get current day and time
  const now = new Date();
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'lowercase' });
  const currentTime = now.toTimeString().slice(0, 8);
  
  let upcomingClasses = [];
  
  if (userRole === 'student') {
    upcomingClasses = await executeQuery(`
      SELECT 
        s.*,
        c.title as course_title,
        c.code as course_code,
        u.name as instructor_name,
        CASE 
          WHEN s.day_of_week = ? AND s.start_time > ? THEN 0
          WHEN FIELD(s.day_of_week, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') > 
               FIELD(?, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') THEN 1
          ELSE 2
        END as priority
      FROM schedules s
      JOIN courses c ON s.course_id = c.id
      JOIN users u ON c.instructor_id = u.id
      JOIN enrollments e ON c.id = e.course_id
      WHERE e.student_id = ? AND e.status = 'enrolled' AND c.is_active = TRUE
      ORDER BY priority, s.start_time
      LIMIT ?
    `, [currentDay, currentTime, currentDay, userId, parseInt(limit)]);
  } else if (userRole === 'instructor') {
    upcomingClasses = await executeQuery(`
      SELECT 
        s.*,
        c.title as course_title,
        c.code as course_code,
        c.current_students,
        CASE 
          WHEN s.day_of_week = ? AND s.start_time > ? THEN 0
          WHEN FIELD(s.day_of_week, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') > 
               FIELD(?, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') THEN 1
          ELSE 2
        END as priority
      FROM schedules s
      JOIN courses c ON s.course_id = c.id
      WHERE c.instructor_id = ? AND c.is_active = TRUE
      ORDER BY priority, s.start_time
      LIMIT ?
    `, [currentDay, currentTime, currentDay, userId, parseInt(limit)]);
  }
  
  res.json({
    success: true,
    data: upcomingClasses
  });
}));

module.exports = router;
