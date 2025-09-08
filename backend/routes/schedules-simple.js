const express = require('express');
const { executeQuery } = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { APIError, asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * GET /api/schedules - Get all schedules with course info
 */
router.get('/', verifyToken, asyncHandler(async (req, res) => {
  try {
    const query = `
      SELECT 
        s.id,
        s.course_id,
        s.day_of_week,
        s.start_time,
        s.end_time,
        s.room,
        s.location,
        c.title as course_title,
        c.code as course_code
      FROM schedules s
      LEFT JOIN courses c ON s.course_id = c.id
      WHERE s.is_active = true
      ORDER BY 
        FIELD(s.day_of_week, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
        s.start_time
    `;

    const schedules = await executeQuery(query);

    res.json({
      success: true,
      data: schedules
    });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    throw new APIError('Error fetching schedules', 500, 'DATABASE_ERROR');
  }
}));

/**
 * GET /api/schedules/my - Get user's schedules (for students/instructors)
 */
router.get('/my', verifyToken, asyncHandler(async (req, res) => {
  try {
    let query;
    let params;

    if (req.user.role === 'student') {
      // Get schedules for enrolled courses
      query = `
        SELECT 
          s.id,
          s.course_id,
          s.day_of_week,
          s.start_time,
          s.end_time,
          s.room,
          s.location,
          c.title as course_title,
          c.code as course_code
        FROM schedules s
        LEFT JOIN courses c ON s.course_id = c.id
        LEFT JOIN enrollments e ON c.id = e.course_id
        WHERE s.is_active = true 
        AND e.student_id = ?
        AND e.status = 'enrolled'
        ORDER BY 
          FIELD(s.day_of_week, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
          s.start_time
      `;
      params = [req.user.id];
    } else if (req.user.role === 'instructor') {
      // Get schedules for instructor's courses
      query = `
        SELECT 
          s.id,
          s.course_id,
          s.day_of_week,
          s.start_time,
          s.end_time,
          s.room,
          s.location,
          c.title as course_title,
          c.code as course_code
        FROM schedules s
        LEFT JOIN courses c ON s.course_id = c.id
        WHERE s.is_active = true 
        AND c.instructor_id = ?
        ORDER BY 
          FIELD(s.day_of_week, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
          s.start_time
      `;
      params = [req.user.id];
    } else {
      // Admin sees all
      query = `
        SELECT 
          s.id,
          s.course_id,
          s.day_of_week,
          s.start_time,
          s.end_time,
          s.room,
          s.location,
          c.title as course_title,
          c.code as course_code
        FROM schedules s
        LEFT JOIN courses c ON s.course_id = c.id
        WHERE s.is_active = true
        ORDER BY 
          FIELD(s.day_of_week, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
          s.start_time
      `;
      params = [];
    }

    const schedules = await executeQuery(query, params);

    res.json({
      success: true,
      data: schedules
    });
  } catch (error) {
    console.error('Error fetching user schedules:', error);
    throw new APIError('Error fetching schedules', 500, 'DATABASE_ERROR');
  }
}));

module.exports = router;
