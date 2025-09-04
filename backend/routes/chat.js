const express = require('express');
const { body, validationResult } = require('express-validator');
const { executeQuery, executeTransaction } = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { APIError, asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Simple AI responses for educational queries
const generateAIResponse = (message, userContext) => {
  const lowerMessage = message.toLowerCase();
  
  // FAQ responses
  if (lowerMessage.includes('assignment') || lowerMessage.includes('task') || lowerMessage.includes('homework')) {
    return "I can help you with assignments! You can view your current assignments in the dashboard. If you need help with a specific assignment, please let me know which course it's for and I'll provide more details.";
  }
  
  if (lowerMessage.includes('deadline') || lowerMessage.includes('due date')) {
    return "To check your upcoming deadlines, go to your dashboard where you'll see all assignments and their due dates. I can also help you create a study schedule if needed!";
  }
  
  if (lowerMessage.includes('grade') || lowerMessage.includes('score')) {
    return "Your grades are available in the dashboard under each course. If you have questions about a specific grade, you can contact your instructor through the course page.";
  }
  
  if (lowerMessage.includes('schedule') || lowerMessage.includes('timetable')) {
    return "I can help you organize your study schedule! Based on your current courses and assignments, I can suggest optimal study times. Would you like me to create a personalized schedule for you?";
  }
  
  if (lowerMessage.includes('course') || lowerMessage.includes('class')) {
    return "You can view all your enrolled courses in the dashboard. Each course page contains materials, assignments, and announcements from your instructor.";
  }
  
  if (lowerMessage.includes('help') || lowerMessage.includes('support')) {
    return "I'm here to help! I can assist you with:\n• Finding assignments and deadlines\n• Checking grades and feedback\n• Creating study schedules\n• Navigating the platform\n• Course information\n\nWhat would you like help with?";
  }
  
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return `Hello ${userContext.name}! I'm your LICEA study assistant. I'm here to help you with your courses, assignments, and study planning. How can I assist you today?`;
  }
  
  // Default response
  return "I understand you're asking about your studies. I can help you with assignments, deadlines, grades, course information, and study planning. Could you be more specific about what you need help with?";
};

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Get user's chat conversations
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 */
router.get('/conversations',
  verifyToken,
  asyncHandler(async (req, res) => {
    const conversations = await executeQuery(`
      SELECT id, title, created_at, updated_at
      FROM chat_conversations 
      WHERE user_id = ?
      ORDER BY updated_at DESC
      LIMIT 20
    `, [req.user.id]);
    
    res.json({
      success: true,
      data: conversations
    });
  })
);

/**
 * @swagger
 * /api/chat/conversations:
 *   post:
 *     summary: Create new conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 */
router.post('/conversations',
  verifyToken,
  [
    body('title').optional().trim().isLength({ max: 255 })
  ],
  asyncHandler(async (req, res) => {
    const { title = 'New Conversation' } = req.body;
    
    const result = await executeQuery(`
      INSERT INTO chat_conversations (user_id, title)
      VALUES (?, ?)
    `, [req.user.id, title]);
    
    const conversation = await executeQuery(`
      SELECT id, title, created_at, updated_at
      FROM chat_conversations
      WHERE id = ?
    `, [result.insertId]);
    
    res.status(201).json({
      success: true,
      data: conversation[0]
    });
  })
);

/**
 * @swagger
 * /api/chat/conversations/{id}/messages:
 *   get:
 *     summary: Get messages from a conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 */
router.get('/conversations/:id/messages',
  verifyToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // Verify conversation belongs to user
    const conversations = await executeQuery(
      'SELECT id FROM chat_conversations WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    
    if (conversations.length === 0) {
      throw new APIError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND');
    }
    
    const messages = await executeQuery(`
      SELECT id, sender_type, message, metadata, created_at
      FROM chat_messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
    `, [id]);
    
    res.json({
      success: true,
      data: messages
    });
  })
);

/**
 * @swagger
 * /api/chat/conversations/{id}/messages:
 *   post:
 *     summary: Send a message in conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 */
router.post('/conversations/:id/messages',
  verifyToken,
  [
    body('message').trim().isLength({ min: 1, max: 2000 }).withMessage('Message must be 1-2000 characters')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new APIError('Validation failed', 400, 'VALIDATION_ERROR');
    }
    
    const { id } = req.params;
    const { message } = req.body;
    
    // Verify conversation belongs to user
    const conversations = await executeQuery(
      'SELECT id FROM chat_conversations WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    
    if (conversations.length === 0) {
      throw new APIError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND');
    }
    
    // Generate AI response
    const aiResponse = generateAIResponse(message, req.user);
    
    // Store both user message and AI response
    const queries = [
      {
        sql: 'INSERT INTO chat_messages (conversation_id, sender_type, message) VALUES (?, ?, ?)',
        params: [id, 'user', message]
      },
      {
        sql: 'INSERT INTO chat_messages (conversation_id, sender_type, message) VALUES (?, ?, ?)',
        params: [id, 'ai', aiResponse]
      },
      {
        sql: 'UPDATE chat_conversations SET updated_at = NOW() WHERE id = ?',
        params: [id]
      }
    ];
    
    await executeTransaction(queries);
    
    // Get the new messages
    const newMessages = await executeQuery(`
      SELECT id, sender_type, message, metadata, created_at
      FROM chat_messages
      WHERE conversation_id = ?
      ORDER BY created_at DESC
      LIMIT 2
    `, [id]);
    
    res.json({
      success: true,
      data: newMessages.reverse() // Return in chronological order
    });
  })
);

/**
 * @swagger
 * /api/chat/quick-help:
 *   post:
 *     summary: Get quick help response without creating conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 */
router.post('/quick-help',
  verifyToken,
  [
    body('message').trim().isLength({ min: 1, max: 500 }).withMessage('Message must be 1-500 characters')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new APIError('Validation failed', 400, 'VALIDATION_ERROR');
    }
    
    const { message } = req.body;
    const aiResponse = generateAIResponse(message, req.user);
    
    res.json({
      success: true,
      data: {
        question: message,
        answer: aiResponse,
        timestamp: new Date().toISOString()
      }
    });
  })
);

module.exports = router;
