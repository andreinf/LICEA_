const express = require('express');
const { executeQuery } = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { APIError, asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * POST /api/chat/message - Send a message to the chatbot
 */
router.post('/message', verifyToken, asyncHandler(async (req, res) => {
  try {
    const { message, session_id } = req.body;
    
    if (!message) {
      throw new APIError('Message is required', 400, 'VALIDATION_ERROR');
    }

    // Save user message to database
    try {
      await executeQuery(`
        INSERT INTO chat_messages (user_id, session_id, message, message_type) 
        VALUES (?, ?, ?, 'question')
      `, [req.user.id, session_id || null, message]);
    } catch (dbError) {
      console.log('Note: Could not save to chat_messages table (table may not exist)');
    }

    // Generate a simple response based on keywords
    let response = generateSimpleResponse(message, req.user);

    // Save bot response to database
    try {
      await executeQuery(`
        INSERT INTO chat_messages (user_id, session_id, message, response, message_type) 
        VALUES (?, ?, ?, ?, 'response')
      `, [req.user.id, session_id || null, message, response, 'response']);
    } catch (dbError) {
      console.log('Note: Could not save response to chat_messages table');
    }

    res.json({
      success: true,
      response: response,
      session_id: session_id
    });
  } catch (error) {
    console.error('Error processing chat message:', error);
    throw new APIError('Error processing message', 500, 'CHAT_ERROR');
  }
}));

/**
 * GET /api/chat/history - Get chat history for user
 */
router.get('/history', verifyToken, asyncHandler(async (req, res) => {
  try {
    const { session_id } = req.query;
    
    let query = `
      SELECT id, message, response, message_type, created_at 
      FROM chat_messages 
      WHERE user_id = ?
    `;
    let params = [req.user.id];
    
    if (session_id) {
      query += ' AND session_id = ?';
      params.push(session_id);
    }
    
    query += ' ORDER BY created_at DESC LIMIT 50';
    
    const messages = await executeQuery(query, params);

    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    // Return empty history if table doesn't exist
    res.json({
      success: true,
      data: []
    });
  }
}));

// Simple response generator based on keywords
function generateSimpleResponse(message, user) {
  const msgLower = message.toLowerCase();
  
  // Greeting responses
  if (msgLower.includes('hola') || msgLower.includes('hello') || msgLower.includes('hi')) {
    return `¡Hola ${user.name}! 👋 Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?`;
  }
  
  // Course related
  if (msgLower.includes('curso') || msgLower.includes('course') || msgLower.includes('materia')) {
    return `📚 Los cursos disponibles incluyen Matemáticas Básicas, Programación en Python e Historia Universal. ¿Te interesa alguno en particular?`;
  }
  
  // Schedule related
  if (msgLower.includes('horario') || msgLower.includes('cronograma') || msgLower.includes('schedule')) {
    return `📅 Puedes consultar tu cronograma en la sección "Cronograma" del menú. Ahí verás todos tus horarios organizados por días de la semana.`;
  }
  
  // Grades related
  if (msgLower.includes('calificación') || msgLower.includes('nota') || msgLower.includes('grade')) {
    return `📊 Para ver tus calificaciones, ve a la sección "Calificaciones" en el menú principal. Ahí encontrarás todas tus notas organizadas por curso.`;
  }
  
  // Assignments related
  if (msgLower.includes('tarea') || msgLower.includes('assignment') || msgLower.includes('trabajo')) {
    return `📝 Las tareas pendientes las puedes encontrar en la sección "Mis Tareas" del dashboard. Recuerda revisar las fechas de entrega.`;
  }
  
  // Platform navigation
  if (msgLower.includes('navegación') || msgLower.includes('usar') || msgLower.includes('funciona')) {
    return `🧭 La plataforma es muy fácil de usar:
    
• Dashboard: Tu página principal con resumen
• Cursos: Información sobre tus materias
• Cronograma: Horarios de clases
• Asistente IA: Aquí estás ahora 😊
• Y más opciones según tu rol

¿Hay alguna sección específica sobre la que quieres saber más?`;
  }
  
  // Help requests
  if (msgLower.includes('ayuda') || msgLower.includes('help') || msgLower.includes('cómo')) {
    return `💡 ¡Por supuesto que puedo ayudarte! Puedo asistirte con:

• Información sobre cursos y materiales
• Consultas sobre horarios y cronogramas  
• Dudas sobre el uso de la plataforma
• Orientación sobre tareas y evaluaciones
• Consejos de estudio

¿Con qué específicamente necesitas ayuda?`;
  }
  
  // Gratitude
  if (msgLower.includes('gracias') || msgLower.includes('thank')) {
    return `¡De nada, ${user.name}! 😊 Estoy aquí para ayudarte siempre que lo necesites. ¿Hay algo más en lo que pueda asistirte?`;
  }
  
  // Default response
  return `Entiendo que preguntas sobre: "${message}"

Como asistente virtual de LICEA, puedo ayudarte con:

🏫 **Información académica**: Cursos, horarios, calificaciones
📋 **Orientación**: Uso de la plataforma, navegación
📚 **Recursos**: Materiales de estudio, tareas
🎯 **Soporte**: Resolución de dudas generales

¿Podrías ser más específico sobre lo que necesitas? Por ejemplo:
• "¿Cuáles son mis horarios?"
• "¿Cómo veo mis calificaciones?"
• "¿Dónde encuentro mis cursos?"`;
}

module.exports = router;
