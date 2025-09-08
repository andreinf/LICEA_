const express = require('express');
const { body, validationResult } = require('express-validator');
const { executeQuery, executeTransaction } = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { APIError, asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Intelligent AI responses with database context
const generateAIResponse = async (message, userContext) => {
  const lowerMessage = message.toLowerCase();
  const db = require('../config/database');
  
  try {
    // Análisis de rendimiento y alertas
    if (lowerMessage.includes('rendimiento') || lowerMessage.includes('desempeño') || lowerMessage.includes('performance') || lowerMessage.includes('how am i doing')) {
      const [performance] = await db.execute(`
        SELECT 
          AVG(CASE WHEN s.grade IS NOT NULL THEN s.grade END) as overall_average,
          COUNT(DISTINCT ce.course_id) as enrolled_courses,
          COUNT(CASE WHEN s.grade >= 3.0 THEN 1 END) as passing_tasks,
          COUNT(CASE WHEN s.grade < 3.0 AND s.grade IS NOT NULL THEN 1 END) as failing_tasks
        FROM course_enrollments ce
        LEFT JOIN tasks t ON ce.course_id = t.course_id AND t.is_published = TRUE
        LEFT JOIN submissions s ON t.id = s.task_id AND s.student_id = ce.student_id AND s.status = 'graded'
        WHERE ce.student_id = ? AND ce.status = 'active'
      `, [userContext.id]);
      
      const stats = performance[0];
      if (stats.overall_average) {
        return `📊 **Tu Rendimiento Académico:**\n\n` +
               `🎯 Promedio general: **${stats.overall_average.toFixed(2)}/5.0**\n` +
               `📚 Cursos activos: **${stats.enrolled_courses}**\n` +
               `✅ Talleres aprobados: **${stats.passing_tasks || 0}**\n` +
               `❌ Talleres por mejorar: **${stats.failing_tasks || 0}**\n\n` +
               `${stats.overall_average >= 4.0 ? '🎉 ¡Excelente trabajo! Mantén el buen ritmo.' :
                 stats.overall_average >= 3.0 ? '👍 Vas bien. Considera estudiar un poco más para mejorar.' :
                 '⚠️ Necesitas mejorar tu rendimiento. Te recomiendo solicitar apoyo a tus instructores.'}`;
      }
      return "📊 Aún no tienes calificaciones registradas. Una vez que tus instructores califiquen tus trabajos, podrás ver tu rendimiento aquí.";
    }
    
    // Talleres y entregas pendientes
    if (lowerMessage.includes('taller') || lowerMessage.includes('assignment') || lowerMessage.includes('task') || lowerMessage.includes('entrega') || lowerMessage.includes('pending') || lowerMessage.includes('upcoming')) {
      const [tasks] = await db.execute(`
        SELECT 
          t.id,
          t.title,
          t.due_date,
          c.name as course_name,
          s.status as submission_status,
          CASE WHEN t.due_date < NOW() THEN 1 ELSE 0 END as is_overdue
        FROM tasks t
        JOIN courses c ON t.course_id = c.id
        JOIN course_enrollments ce ON c.id = ce.course_id
        LEFT JOIN submissions s ON t.id = s.task_id AND s.student_id = ce.student_id
        WHERE ce.student_id = ? AND ce.status = 'active' 
          AND t.is_published = TRUE
          AND (s.id IS NULL OR s.status IN ('draft', 'submitted'))
        ORDER BY t.due_date ASC
        LIMIT 5
      `, [userContext.id]);
      
      if (tasks.length === 0) {
        return "🎉 ¡Excelente! No tienes talleres pendientes por entregar. Es un buen momento para repasar material o adelantar trabajo.";
      }
      
      let response = `📋 **Tus Talleres Pendientes:**\n\n`;
      tasks.forEach((task, index) => {
        const dueDate = new Date(task.due_date);
        const isOverdue = task.is_overdue;
        const status = task.submission_status;
        const statusEmoji = isOverdue ? '🔴' : (status === 'draft' ? '📝' : '📝');
        
        response += `${statusEmoji} **${task.title}**\n`;
        response += `   📚 Curso: ${task.course_name}\n`;
        response += `   ⏰ Fecha límite: ${dueDate.toLocaleDateString('es')} ${dueDate.toLocaleTimeString('es', {hour: '2-digit', minute: '2-digit'})}\n`;
        response += `   ${isOverdue ? '⚠️ **VENCIDO**' : status === 'draft' ? '📝 Borrador guardado' : '⏳ Pendiente de entrega'}\n\n`;
      });
      
      const overdueCount = tasks.filter(t => t.is_overdue).length;
      if (overdueCount > 0) {
        response += `⚠️ **Tienes ${overdueCount} taller(es) vencido(s). Te recomiendo contactar a tus instructores.**`;
      }
      
      return response;
    }
    
    // Cronograma y horarios
    if (lowerMessage.includes('cronograma') || lowerMessage.includes('schedule') || lowerMessage.includes('horario') || lowerMessage.includes('agenda') || lowerMessage.includes('calendario')) {
      const [events] = await db.execute(`
        SELECT 
          s.title,
          s.activity_type,
          s.start_time,
          s.priority,
          c.name as course_name
        FROM schedules s
        LEFT JOIN courses c ON s.course_id = c.id
        WHERE s.user_id = ? 
          AND s.start_time >= NOW()
          AND s.status != 'cancelled'
        ORDER BY s.start_time ASC
        LIMIT 10
      `, [userContext.id]);
      
      if (events.length === 0) {
        return "📅 No tienes eventos programados próximamente. ¿Te gustaría que te ayude a crear un horario de estudio personalizado?";
      }
      
      let response = `📅 **Tu Cronograma Próximo:**\n\n`;
      events.forEach((event) => {
        const startTime = new Date(event.start_time);
        const typeEmoji = {
          'task': '📝',
          'exam': '📊',
          'class': '🎓',
          'meeting': '👥',
          'study': '📚',
          'other': '📌'
        }[event.activity_type] || '📌';
        
        const priorityText = event.priority === 'high' ? '🔴 Alta' : event.priority === 'medium' ? '🟡 Media' : '🟢 Baja';
        
        response += `${typeEmoji} **${event.title}**\n`;
        response += `   📅 ${startTime.toLocaleDateString('es')} a las ${startTime.toLocaleTimeString('es', {hour: '2-digit', minute: '2-digit'})}\n`;
        if (event.course_name) {
          response += `   📚 Curso: ${event.course_name}\n`;
        }
        response += `   ⭐ Prioridad: ${priorityText}\n\n`;
      });
      
      return response;
    }
    
    // Calificaciones y notas
    if (lowerMessage.includes('calificacion') || lowerMessage.includes('nota') || lowerMessage.includes('grade') || lowerMessage.includes('score')) {
      const [grades] = await db.execute(`
        SELECT 
          s.grade,
          s.graded_at,
          t.title as task_title,
          t.max_grade,
          c.name as course_name,
          s.feedback
        FROM submissions s
        JOIN tasks t ON s.task_id = t.id
        JOIN courses c ON t.course_id = c.id
        WHERE s.student_id = ? AND s.status = 'graded' AND s.grade IS NOT NULL
        ORDER BY s.graded_at DESC
        LIMIT 5
      `, [userContext.id]);
      
      if (grades.length === 0) {
        return "📊 Aún no tienes calificaciones registradas. Cuando tus instructores califiquen tus trabajos, aparecerán aquí.";
      }
      
      let response = `📊 **Tus Calificaciones Recientes:**\n\n`;
      grades.forEach((grade) => {
        const percentage = (grade.grade / grade.max_grade * 100).toFixed(1);
        const emoji = grade.grade >= 4.0 ? '🎉' : grade.grade >= 3.0 ? '👍' : '📈';
        
        response += `${emoji} **${grade.task_title}**\n`;
        response += `   📚 ${grade.course_name}\n`;
        response += `   📊 Calificación: **${grade.grade}/${grade.max_grade}** (${percentage}%)\n`;
        if (grade.feedback) {
          response += `   💬 Feedback: ${grade.feedback.substring(0, 100)}${grade.feedback.length > 100 ? '...' : ''}\n`;
        }
        response += `   📅 ${new Date(grade.graded_at).toLocaleDateString('es')}\n\n`;
      });
      
      return response;
    }
    
    // Cursos matriculados
    if (lowerMessage.includes('curso') || lowerMessage.includes('materia') || lowerMessage.includes('course') || lowerMessage.includes('class') || lowerMessage.includes('enrolled')) {
      const [courses] = await db.execute(`
        SELECT 
          c.name,
          c.code,
          u.name as instructor_name,
          ce.enrollment_date,
          COUNT(DISTINCT t.id) as total_tasks,
          COUNT(DISTINCT s.id) as submitted_tasks,
          AVG(CASE WHEN s.grade IS NOT NULL THEN s.grade END) as course_average
        FROM course_enrollments ce
        JOIN courses c ON ce.course_id = c.id
        JOIN users u ON c.instructor_id = u.id
        LEFT JOIN tasks t ON c.id = t.course_id AND t.is_published = TRUE
        LEFT JOIN submissions s ON t.id = s.task_id AND s.student_id = ce.student_id AND s.status = 'graded'
        WHERE ce.student_id = ? AND ce.status = 'active'
        GROUP BY c.id, c.name, c.code, u.name, ce.enrollment_date
      `, [userContext.id]);
      
      if (courses.length === 0) {
        return "📚 No estás matriculado en ningún curso actualmente. Contacta a tu administrador para la inscripción en cursos.";
      }
      
      let response = `📚 **Tus Cursos Activos:**\n\n`;
      courses.forEach((course) => {
        response += `📖 **${course.name}** (${course.code})\n`;
        response += `   👨‍🏫 Instructor: ${course.instructor_name}\n`;
        response += `   📊 Talleres: ${course.submitted_tasks || 0}/${course.total_tasks || 0} entregados\n`;
        if (course.course_average) {
          response += `   📈 Promedio: ${course.course_average.toFixed(2)}/5.0\n`;
        }
        response += `   📅 Matriculado desde: ${new Date(course.enrollment_date).toLocaleDateString('es')}\n\n`;
      });
      
      return response;
    }
    
    // Alertas y recomendaciones
    if (lowerMessage.includes('alerta') || lowerMessage.includes('recomendacion') || lowerMessage.includes('alert') || lowerMessage.includes('recommendation') || lowerMessage.includes('advice')) {
      const [alerts] = await db.execute(`
        SELECT 
          a.risk_level,
          a.title,
          a.description,
          a.recommendation,
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
        LIMIT 3
      `, [userContext.id]);
      
      if (alerts.length === 0) {
        return "🎉 ¡Excelente! No tienes alertas activas. Tu rendimiento académico está en buen estado. ¡Sigue así!";
      }
      
      let response = `⚠️ **Alertas y Recomendaciones:**\n\n`;
      alerts.forEach((alert) => {
        const riskEmoji = {
          'critical': '🔴',
          'high': '🟠',
          'medium': '🟡',
          'low': '🟢'
        }[alert.risk_level] || '🟡';
        
        response += `${riskEmoji} **${alert.title}**\n`;
        if (alert.course_name) {
          response += `   📚 Curso: ${alert.course_name}\n`;
        }
        response += `   📝 ${alert.description}\n`;
        if (alert.recommendation) {
          response += `   💡 Recomendación: ${alert.recommendation}\n`;
        }
        response += `\n`;
      });
      
      return response;
    }
    
    // Ayuda y comandos disponibles
    if (lowerMessage.includes('help') || lowerMessage.includes('ayuda') || lowerMessage.includes('comandos') || lowerMessage.includes('que puedes hacer')) {
      return `🤖 **Asistente Virtual LICEA**\n\n` +
             `Puedo ayudarte con:\n\n` +
             `📊 **Rendimiento:** "¿Cómo va mi rendimiento?" o "Mi desempeño"\n` +
             `📋 **Talleres:** "Talleres pendientes" o "Próximas entregas"\n` +
             `📅 **Cronograma:** "Mi horario" o "Agenda de hoy"\n` +
             `📊 **Calificaciones:** "Mis notas" o "Últimas calificaciones"\n` +
             `📚 **Cursos:** "Mis materias" o "Cursos matriculados"\n` +
             `⚠️ **Alertas:** "Recomendaciones" o "Alertas académicas"\n\n` +
             `💡 **Tip:** Puedes hacer preguntas en español o inglés, ¡soy bilingüe!`;
    }
    
    // Saludos
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hola') || lowerMessage.includes('buenos') || lowerMessage.includes('buenas')) {
      const currentHour = new Date().getHours();
      const greeting = currentHour < 12 ? 'Buenos días' : currentHour < 18 ? 'Buenas tardes' : 'Buenas noches';
      
      return `${greeting} ${userContext.name}! 👋\n\n` +
             `Soy tu asistente virtual de LICEA. Estoy aquí para ayudarte con:\n` +
             `• 📊 Seguimiento de tu rendimiento académico\n` +
             `• 📋 Gestión de talleres y entregas\n` +
             `• 📅 Organización de tu cronograma\n` +
             `• 💡 Recomendaciones personalizadas\n\n` +
             `¿En qué puedo asistirte hoy?`;
    }
    
    // Respuesta por defecto con sugerencias inteligentes
    const [quickStats] = await db.execute(`
      SELECT 
        COUNT(DISTINCT CASE WHEN t.due_date > NOW() AND (s.id IS NULL OR s.status = 'draft') THEN t.id END) as pending_tasks,
        COUNT(DISTINCT CASE WHEN a.is_resolved = FALSE THEN a.id END) as active_alerts
      FROM course_enrollments ce
      LEFT JOIN tasks t ON ce.course_id = t.course_id AND t.is_published = TRUE
      LEFT JOIN submissions s ON t.id = s.task_id AND s.student_id = ce.student_id
      LEFT JOIN alerts a ON a.student_id = ce.student_id
      WHERE ce.student_id = ? AND ce.status = 'active'
    `, [userContext.id]);
    
    const stats = quickStats[0];
    let suggestions = [];
    
    if (stats.pending_tasks > 0) {
      suggestions.push(`📋 Pregúntame sobre tus **${stats.pending_tasks} talleres pendientes**`);
    }
    if (stats.active_alerts > 0) {
      suggestions.push(`⚠️ Tienes **${stats.active_alerts} alertas** - pregúntame por recomendaciones`);
    }
    suggestions.push(`📊 Consulta tu **rendimiento académico**`);
    suggestions.push(`📅 Revisa tu **cronograma** de actividades`);
    
    return `🤖 Entiendo que quieres información sobre tus estudios. Te puedo ayudar con muchas cosas:\n\n` +
           suggestions.join('\n') + `\n\n` +
           `💡 **Ejemplos de preguntas:**\n` +
           `• "¿Cómo va mi rendimiento?"\n` +
           `• "Talleres pendientes"\n` +
           `• "Mi cronograma de hoy"\n` +
           `• "Últimas calificaciones"\n\n` +
           `¿Qué información específica necesitas?`;
           
  } catch (error) {
    console.error('Error en generateAIResponse:', error);
    return "😅 Lo siento, tuve un pequeño problema técnico. ¿Podrías repetir tu pregunta? Mientras tanto, puedes consultar tu dashboard para ver información actualizada de tus cursos.";
  }
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
    const aiResponse = await generateAIResponse(message, req.user);
    
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
