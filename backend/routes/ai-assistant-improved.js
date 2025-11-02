const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { executeQuery } = require('../config/database');
const router = express.Router();

// Información sobre LICEA para contexto
const LICEA_CONTEXT = {
  nombre: "LICEA - Learning Interactive & Collaborative Educational Application",
  descripcion: "Plataforma educativa integral diseñada para facilitar la gestión académica y el aprendizaje colaborativo",
  funcionalidades: [
    "Gestión de cursos y matrículas",
    "Sistema de tareas y entregas",
    "Calificaciones y retroalimentación",
    "Cronograma de clases",
    "Grupos de estudio colaborativos",
    "Chat en tiempo real",
    "Asistente IA personalizado"
  ],
  roles: {
    estudiante: "Puede inscribirse en cursos, entregar tareas, ver calificaciones, participar en grupos",
    instructor: "Puede crear cursos, asignar tareas, calificar trabajos, gestionar horarios",
    admin: "Gestión completa del sistema, usuarios y reportes"
  }
};

// Función para obtener contexto del instructor
const getInstructorContext = async (userId, userName) => {
  try {
    // Obtener cursos que el instructor enseña
    const courses = await executeQuery(`
      SELECT c.id, c.name, c.code, c.description, c.max_students,
             COUNT(DISTINCT ce.student_id) as enrolled_students
      FROM courses c
      LEFT JOIN course_enrollments ce ON c.id = ce.course_id AND ce.status = 'active'
      WHERE c.instructor_id = ? AND c.is_active = true
      GROUP BY c.id
      LIMIT 10
    `, [userId]);

    // Obtener total de estudiantes
    const totalStudents = await executeQuery(`
      SELECT COUNT(DISTINCT ce.student_id) as count
      FROM course_enrollments ce
      JOIN courses c ON ce.course_id = c.id
      WHERE c.instructor_id = ? AND ce.status = 'active'
    `, [userId]);

    // Obtener tareas creadas
    const tasks = await executeQuery(`
      SELECT t.id, t.title, t.due_date, t.max_grade, c.name as course_name,
             COUNT(DISTINCT s.student_id) as submissions_count,
             AVG(s.grade) as avg_grade
      FROM tasks t
      JOIN courses c ON t.course_id = c.id
      LEFT JOIN submissions s ON t.id = s.task_id AND s.status = 'graded'
      WHERE c.instructor_id = ?
      GROUP BY t.id
      ORDER BY t.created_at DESC
      LIMIT 10
    `, [userId]);

    // Obtener tareas pendientes de calificar
    const pendingGrading = await executeQuery(`
      SELECT COUNT(*) as count
      FROM submissions s
      JOIN tasks t ON s.task_id = t.id
      JOIN courses c ON t.course_id = c.id
      WHERE c.instructor_id = ? AND s.status = 'submitted'
    `, [userId]);

    // Obtener rendimiento promedio por curso
    const coursePerformance = await executeQuery(`
      SELECT c.name as course_name, c.code,
             COUNT(DISTINCT ce.student_id) as students,
             COUNT(DISTINCT t.id) as total_tasks,
             COUNT(DISTINCT s.id) as total_submissions,
             AVG(CASE WHEN s.status = 'graded' THEN s.grade/t.max_grade * 100 END) as avg_percentage
      FROM courses c
      LEFT JOIN course_enrollments ce ON c.id = ce.course_id AND ce.status = 'active'
      LEFT JOIN tasks t ON c.id = t.course_id
      LEFT JOIN submissions s ON t.id = s.task_id
      WHERE c.instructor_id = ?
      GROUP BY c.id
    `, [userId]);

    return {
      userName,
      role: 'instructor',
      courses,
      totalStudents: totalStudents[0]?.count || 0,
      tasks,
      pendingGrading: pendingGrading[0]?.count || 0,
      coursePerformance
    };
  } catch (error) {
    console.error('Error getting instructor context:', error);
    return { userName, role: 'instructor', courses: [], totalStudents: 0, tasks: [], pendingGrading: 0, coursePerformance: [] };
  }
};

// Función para obtener contexto del estudiante
const getStudentContext = async (userId, userName) => {
  try {
    // Obtener cursos del estudiante
    const courses = await executeQuery(`
      SELECT c.id, c.name, c.code, c.description, u.name as instructor_name
      FROM courses c
      JOIN course_enrollments ce ON c.id = ce.course_id
      JOIN users u ON c.instructor_id = u.id
      WHERE ce.student_id = ? AND ce.status = 'active'
      LIMIT 10
    `, [userId]);

    // Obtener tareas pendientes (sin entregar)
    const tasks = await executeQuery(`
      SELECT t.id, t.title, t.due_date, t.max_grade, c.name as course_name, c.code as course_code
      FROM tasks t
      JOIN courses c ON t.course_id = c.id
      JOIN course_enrollments ce ON c.id = ce.course_id
      LEFT JOIN submissions s ON t.id = s.task_id AND s.student_id = ?
      WHERE ce.student_id = ? AND ce.status = 'active' 
        AND t.is_published = 1
        AND s.id IS NULL
        AND t.due_date >= NOW()
      ORDER BY t.due_date ASC
      LIMIT 10
    `, [userId, userId]);

    // Obtener tareas completadas recientes
    const completedTasks = await executeQuery(`
      SELECT COUNT(*) as count
      FROM submissions s
      WHERE s.student_id = ? AND s.status IN ('submitted', 'graded')
    `, [userId]);
    
    console.log(`[AI Assistant] Student ${userId} - Pending tasks: ${tasks.length}, Completed: ${completedTasks.length > 0 ? completedTasks[0].count : 0}`);

    // Obtener calificaciones recientes
    const grades = await executeQuery(`
      SELECT s.grade, t.max_grade, t.title, c.name as course_name, s.feedback
      FROM submissions s
      JOIN tasks t ON s.task_id = t.id
      JOIN courses c ON t.course_id = c.id
      WHERE s.student_id = ? AND s.status = 'graded'
      ORDER BY s.graded_at DESC
      LIMIT 5
    `, [userId]);

    // Obtener próximas clases
    const schedules = await executeQuery(`
      SELECT s.day_of_week, s.start_time, s.end_time, c.name as course_name, s.room, s.location
      FROM schedules s
      JOIN courses c ON s.course_id = c.id
      JOIN course_enrollments ce ON c.id = ce.course_id
      WHERE ce.student_id = ? AND ce.status = 'active' AND s.is_active = true
      ORDER BY 
        FIELD(s.day_of_week, 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo')
      LIMIT 10
    `, [userId]);

    // Obtener grupos del estudiante
    const groups = await executeQuery(`
      SELECT g.id, g.name, c.name as course_name
      FROM study_groups g
      JOIN courses c ON g.course_id = c.id
      JOIN group_members gm ON g.id = gm.group_id
      WHERE gm.student_id = ?
      LIMIT 5
    `, [userId]);

    return { 
      userName, 
      courses, 
      tasks, 
      completedTasks: completedTasks[0]?.count || 0,
      grades, 
      schedules,
      groups
    };
  } catch (error) {
    console.error('Error getting student context:', error);
    return { userName, courses: [], tasks: [], completedTasks: 0, grades: [], schedules: [], groups: [] };
  }
};

// Generar respuesta natural y contextual
const generateNaturalResponse = (message, context) => {
  const lowerMsg = message.toLowerCase();
  const userName = context.userName || '';
  const firstName = userName.split(' ')[0];
  
  // Análisis de sentimiento básico
  const isQuestion = lowerMsg.includes('?') || lowerMsg.startsWith('qué') || lowerMsg.startsWith('cuá') || 
                     lowerMsg.startsWith('cómo') || lowerMsg.startsWith('dónde') || lowerMsg.startsWith('cuándo');
  
  // === CONSULTAS SOBRE CURSOS ===
  if (lowerMsg.match(/curso|clase|materia|asignatura/i)) {
    if (context.courses.length === 0) {
      return `¡Hola ${firstName}! 👋\n\nVeo que todavía no tienes cursos inscritos. ¡No te preocupes, es súper fácil empezar! 🚀\n\n**Aquí está el paso a paso:**\n1. 📚 Ve a la sección "Cursos"\n2. 🔑 Pide el código de curso a tu instructor\n3. ✨ Haz clic en "Unirse por código" y listo!\n\n¿Quieres que te cuente más sobre todo lo chévere que puedes hacer en LICEA?`;
    }
    
    if (lowerMsg.includes('cuántos') || lowerMsg.includes('cuantos')) {
      return `¡Bacano, ${firstName}! 🎓 Estás inscrito en **${context.courses.length} curso${context.courses.length !== 1 ? 's' : ''}** actualmente:\n\n${context.courses.map((c, i) => `${i+1}. 📖 **${c.code}** - ${c.name}\n   👨‍🏫 Con el profe: ${c.instructor_name}`).join('\n\n')}\n\n¿Te ayudo con algo específico de alguno de estos cursos?`;
    }
    
    return `Aquí están tus cursos activos, ${firstName}:\n\n${context.courses.map((c, i) => `${i+1}. **${c.code}** - ${c.name}\n   👨‍🏫 ${c.instructor_name}\n   ${c.description ? `   📝 ${c.description.substring(0, 60)}...` : ''}`).join('\n\n')}\n\n¿Quieres saber sobre tareas o calificaciones de alguno?`;
  }

  // === CONSULTAS SOBRE TAREAS ===
  if (lowerMsg.match(/tarea|trabajo|entrega|deber|actividad/i)) {
    if (context.tasks.length === 0) {
      const emoji = context.completedTasks > 0 ? '🎉' : '😊';
      return `${emoji} ¡Qué chimba, ${firstName}! No tienes tareas pendientes ahora mismo. ¡Estás al día!\n\n${context.completedTasks > 0 ? `Ya llevas ${context.completedTasks} tarea(s) completadas. ¡Vas súper bien! 💪\n\n` : ''}Aprovecha este tiempo libre para:\n✨ Repasar apuntes de clases anteriores\n📚 Prepararte para las próximas clases\n👥 Unirte a un grupo de estudio chévere\n📖 Adelantar lecturas\n\n¿En qué más te puedo ayudar hoy?`;
    }
    
    // Analizar urgencia
    const urgentTasks = context.tasks.filter(t => {
      const daysUntil = Math.ceil((new Date(t.due_date) - new Date()) / (1000 * 60 * 60 * 24));
      return daysUntil <= 3;
    });
    
    let response = urgentTasks.length > 0 
      ? `⚠️ ${firstName}, tienes ${urgentTasks.length} tarea(s) urgente(s) (vencen en 3 días o menos):\n\n`
      : `Tienes ${context.tasks.length} tarea(s) pendiente(s), ${firstName}:\n\n`;
    
    response += context.tasks.slice(0, 5).map((t, i) => {
      const dueDate = new Date(t.due_date);
      const daysUntil = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
      const urgency = daysUntil <= 1 ? '🔴' : daysUntil <= 3 ? '🟡' : '🟢';
      
      return `${urgency} **${t.title}**\n   📚 ${t.course_name} (${t.course_code})\n   📅 Vence: ${dueDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} (${daysUntil} día${daysUntil !== 1 ? 's' : ''})\n   🎯 Puntos: ${t.max_grade}`;
    }).join('\n\n');
    
    response += `\n\n💡 **Consejo:** ${urgentTasks.length > 0 ? 'Prioriza las tareas urgentes primero. Divide el trabajo en partes pequeñas.' : 'Organiza tu tiempo y comienza con las que vencen más pronto.'}`;
    
    return response;
  }

  // === CONSULTAS SOBRE CALIFICACIONES ===
  if (lowerMsg.match(/nota|calificaci[oó]n|puntaje|rendimiento|resultado/i)) {
    if (context.grades.length === 0) {
      return `Todavía no tienes calificaciones registradas, ${firstName}. 📝\n\n${context.completedTasks > 0 ? `Has entregado ${context.completedTasks} tarea(s), tus instructores las calificarán pronto.` : 'Asegúrate de entregar tus tareas para recibir retroalimentación y calificaciones.'}\n\n¿Necesitas ayuda con alguna tarea pendiente?`;
    }
    
    const avgPercentage = context.grades.reduce((sum, g) => sum + (g.grade / g.max_grade), 0) / context.grades.length * 100;
    const emoji = avgPercentage >= 90 ? '🌟' : avgPercentage >= 80 ? '😊' : avgPercentage >= 70 ? '👍' : avgPercentage >= 60 ? '📈' : '💪';
    
    let response = `${emoji} Aquí están tus calificaciones recientes, ${firstName}:\n\n`;
    response += context.grades.map((g, i) => {
      const percentage = ((g.grade / g.max_grade) * 100).toFixed(1);
      const gradeEmoji = percentage >= 90 ? '🌟' : percentage >= 80 ? '✅' : percentage >= 70 ? '👍' : '📊';
      return `${gradeEmoji} **${g.title}**\n   📚 ${g.course_name}\n   🎯 Calificación: ${g.grade}/${g.max_grade} (${percentage}%)\n   ${g.feedback ? `💬 "${g.feedback}"` : ''}`;
    }).join('\n\n');
    
    response += `\n\n📊 **Promedio general:** ${avgPercentage.toFixed(1)}%\n\n`;
    
    if (avgPercentage >= 85) {
      response += '¡Excelente trabajo! Mantén ese ritmo. 🚀';
    } else if (avgPercentage >= 70) {
      response += 'Buen progreso. Si necesitas ayuda en algún tema, consulta con tu instructor o forma un grupo de estudio.';
    } else {
      response += '💪 Sigue esforzándote. Te recomiendo:\n• Revisar el material de clase\n• Consultar dudas con tu instructor\n• Unirte a grupos de estudio\n• Usar técnicas de organización';
    }
    
    return response;
  }

  // === CONSULTAS SOBRE HORARIO ===
  if (lowerMsg.match(/horario|cronograma|clase|cu[aá]ndo|pr[oó]xima/i)) {
    if (context.schedules.length === 0) {
      return `No tienes horarios de clases programados todavía, ${firstName}. 📅\n\nConsulta con tus instructores sobre los horarios de cada curso.\n\n¿Necesitas ayuda con algo más?`;
    }
    
    const today = new Date().toLocaleDateString('es-ES', { weekday: 'long' });
    const todayClasses = context.schedules.filter(s => s.day_of_week.toLowerCase() === today.toLowerCase());
    
    let response = todayClasses.length > 0 
      ? `📅 Hoy es **${today}**, tienes ${todayClasses.length} clase(s):\n\n`
      : `Tu horario semanal, ${firstName}:\n\n`;
    
    response += (todayClasses.length > 0 ? todayClasses : context.schedules).map(s => 
      `• **${s.day_of_week}**: ${s.course_name}\n  🕐 ${s.start_time} - ${s.end_time}\n  ${s.room ? `📍 ${s.room}` : ''}${s.location ? ` - ${s.location}` : ''}`
    ).join('\n\n');
    
    response += '\n\n💡 Recuerda preparar tus materiales con anticipación y llegar a tiempo.';
    
    return response;
  }

  // === CONSULTAS SOBRE GRUPOS ===
  if (lowerMsg.match(/grupo|compa[ñn]ero|colabor|equipo/i)) {
    if (context.groups.length === 0) {
      return `Aún no estás en ningún grupo de estudio, ${firstName}. 🤝\n\nLos grupos de estudio son excelentes para:\n• Compartir conocimientos\n• Resolver dudas en equipo\n• Motivación mutua\n• Preparar exámenes juntos\n\n👉 Ve a la sección "Grupos" para crear o unirte a uno.`;
    }
    
    return `Estos son tus grupos de estudio, ${firstName}:\n\n${context.groups.map((g, i) => `${i+1}. **${g.name}**\n   📚 ${g.course_name}`).join('\n\n')}\n\n¿Necesitas ayuda para organizar una sesión de estudio?`;
  }

  // === CONSULTAS SOBRE LICEA ===
  if (lowerMsg.match(/licea|plataforma|sistema|funciona|c[oó]mo usar/i)) {
    return `**LICEA** (Learning Interactive & Collaborative Educational Application) 🎓\n\nEs tu plataforma educativa integral diseñada para facilitar tu aprendizaje.\n\n**Funcionalidades principales:**\n\n📚 **Cursos:** Inscríbete con códigos de curso\n✍️ **Tareas:** Entrega trabajos y recibe calificaciones\n📊 **Calificaciones:** Monitorea tu rendimiento\n📅 **Cronograma:** Ve tus horarios de clase\n👥 **Grupos:** Colabora con compañeros\n💬 **Chat:** Comunícate en tiempo real\n🤖 **Asistente IA:** ¡Yo estoy aquí para ayudarte!\n\n¿Sobre qué funcionalidad quieres saber más?`;
  }

  // === TIPS Y CONSEJOS ===
  if (lowerMsg.match(/consejo|tip|ayuda|c[oó]mo estudi|organiz|planific/i)) {
    const tips = [
      `💡 **Técnica Pomodoro**\n\nEstudia 25 minutos → Descansa 5 minutos\nDespués de 4 ciclos, toma un descanso de 15-30 minutos.\n\nEs excelente para mantener la concentración, ${firstName}. 🎯`,
      
      `📝 **Toma de Apuntes Cornell**\n\n1. Divide tu hoja en 3 secciones:\n   • Notas principales (derecha)\n   • Palabras clave (izquierda)\n   • Resumen (abajo)\n\n2. Revisa dentro de las 24 horas\n\nMejora tu retención hasta un 50%, ${firstName}. 🧠`,
      
      `🎯 **Planificación Semanal**\n\nCada domingo dedica 30 minutos a:\n1. Revisar tareas de la semana\n2. Priorizar por fecha de entrega\n3. Distribuir tiempo de estudio\n4. Programar descansos\n\nReducirás el estrés significativamente, ${firstName}. 😌`,
      
      `🤝 **Grupos de Estudio Efectivos**\n\n✅ Grupos pequeños (3-5 personas)\n✅ Establecer objetivos claros\n✅ Explicar conceptos a otros\n✅ Sesiones de 1-2 horas máximo\n\nEnseñar es la mejor forma de aprender, ${firstName}. 🌟`,
      
      `💧 **Hidratación y Descanso**\n\nTu cerebro necesita:\n• 8 vasos de agua al día\n• 7-9 horas de sueño\n• Pausas cada hora de estudio\n\nUn cerebro descansado aprende mejor, ${firstName}. 🌙`,
      
      `🔄 **Repaso Espaciado**\n\nRepasa el material:\n• 1 día después de aprenderlo\n• 3 días después\n• 1 semana después\n• 1 mes después\n\nAumenta la retención a largo plazo, ${firstName}. 🧠`,
      
      `📱 **Gestión de Distracciones**\n\nDurante el estudio:\n✅ Silencia notificaciones\n✅ Usa apps de bloqueo temporal\n✅ Estudia en espacios dedicados\n✅ Avisa a tu familia/compañeros\n\nLa concentración profunda es clave, ${firstName}. 🎯`,
      
      `🎨 **Técnicas de Memoria Visual**\n\n• Mapas mentales\n• Diagramas de flujo\n• Códigos de color\n• Asociaciones visuales\n\nTu cerebro recuerda mejor las imágenes que el texto, ${firstName}. 🧠✨`
    ];
    
    return tips[Math.floor(Math.random() * tips.length)];
  }

  // === SALUDOS ===
  if (lowerMsg.match(/^(hola|buenos|buenas|saludos|hey|hi)/i)) {
    const timeOfDay = new Date().getHours();
    const greeting = timeOfDay < 12 ? 'Buenos días' : timeOfDay < 19 ? 'Buenas tardes' : 'Buenas noches';
    
    return `${greeting}, ${firstName}! 👋\n\nSoy tu Asistente LICEA, estoy aquí para ayudarte con todo lo relacionado a tu experiencia académica.\n\n**Puedo ayudarte con:**\n\n📚 Información sobre tus cursos\n✅ Seguimiento de tareas y entregas\n📊 Revisión de calificaciones\n📅 Consulta de horarios\n👥 Gestión de grupos de estudio\n💡 Tips y consejos de estudio\n🎓 Información sobre LICEA\n\n¿En qué te puedo ayudar hoy?`;
  }

  // === DESPEDIDAS ===
  if (lowerMsg.match(/gracias|adios|adi[oó]s|chao|bye|hasta luego/i)) {
    return `¡De nada, ${firstName}! 😊\n\nEstoy aquí siempre que me necesites. ¡Mucho éxito en tus estudios! 🚀📚\n\nRecuerda: puedes volver a consultarme cuando quieras.`;
  }

  // === RESPUESTA INTELIGENTE POR DEFECTO ===
  const hasContext = context.courses.length > 0 || context.tasks.length > 0;
  
  if (hasContext) {
    const summary = [];
    if (context.tasks.length > 0) summary.push(`${context.tasks.length} tarea(s) pendiente(s)`);
    if (context.courses.length > 0) summary.push(`${context.courses.length} curso(s) activo(s)`);
    
    return `Entiendo que quieres saber sobre: "${message}"\n\nActualmente tienes:\n• ${summary.join('\n• ')}\n\n**Puedo ayudarte con:**\n\n📚 Ver detalles de tus cursos\n✅ Revisar tareas pendientes\n📊 Consultar calificaciones\n📅 Ver tu horario de clases\n👥 Información de grupos de estudio\n💡 Consejos para mejorar tu estudio\n\n¿Sobre cuál quieres saber más, ${firstName}?`;
  }
  
  return `¡Hola ${firstName}! 👋\n\nSoy tu Asistente LICEA. Aunque no entendí completamente tu pregunta, estoy aquí para ayudarte.\n\n**Puedo ayudarte con:**\n\n📚 Cursos e inscripciones\n✅ Tareas y entregas\n📊 Calificaciones y retroalimentación\n📅 Horarios y cronogramas\n👥 Grupos de estudio\n💡 Tips y técnicas de estudio\n🎓 Información sobre LICEA\n\n¿Qué necesitas saber?`;
};

// Ruta principal del chat
router.post('/chat', verifyToken, asyncHandler(async (req, res) => {
  const { message, conversation_history = [] } = req.body;

  if (!message || message.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'El mensaje no puede estar vacío'
    });
  }

  // Obtener contexto del usuario
  const context = await getStudentContext(req.user.id, req.user.name);

  // Generar respuesta natural
  const aiResponse = generateNaturalResponse(message, context);

  // Guardar en historial (opcional)
  try {
    await executeQuery(`
      INSERT INTO ai_conversations (user_id, user_message, ai_response, context_data)
      VALUES (?, ?, ?, ?)
    `, [req.user.id, message, aiResponse, JSON.stringify({ 
      courses: context.courses.length,
      tasks: context.tasks.length,
      grades: context.grades.length
    })]);
  } catch (error) {
    console.log('AI conversation history not saved (table may not exist)');
  }

  res.json({
    success: true,
    data: {
      response: aiResponse,
      timestamp: new Date().toISOString(),
      context_summary: {
        courses_count: context.courses.length,
        pending_tasks: context.tasks.length,
        recent_grades: context.grades.length
      }
    }
  });
}));

// Tips aleatorios del día mejorados
router.get('/daily-tip', verifyToken, asyncHandler(async (req, res) => {
  const tips = [
    {
      title: "Técnica Pomodoro",
      description: "Estudia 25 minutos, descansa 5. Después de 4 ciclos, toma un descanso largo de 15-30 minutos. Mejora tu concentración y previene el agotamiento mental.",
      category: "productividad",
      action: "Prueba usar un temporizador en tu próxima sesión de estudio"
    },
    {
      title: "Revisión Espaciada",
      description: "Repasa el material a intervalos: 1 día, 3 días, 1 semana, 1 mes después de aprenderlo. Este método aprovecha cómo funciona la memoria a largo plazo.",
      category: "aprendizaje",
      action: "Crea un calendario de repasos para tu próximo examen"
    },
    {
      title: "Método Cornell para Apuntes",
      description: "Divide tu hoja en 3 secciones: notas principales, palabras clave y resumen. Mejora significativamente la organización y retención de información.",
      category: "estudio",
      action: "Prueba este método en tu próxima clase"
    },
    {
      title: "Enseña para Aprender",
      description: "Explica conceptos a compañeros o en voz alta. Si puedes enseñarlo claramente, realmente lo entiendes. Esta es una de las formas más efectivas de consolidar conocimiento.",
      category: "colaboracion",
      action: "Explica un concepto que aprendiste hoy a un compañero"
    },
    {
      title: "Ambiente Óptimo de Estudio",
      description: "Mantén tu espacio limpio, bien iluminado (preferiblemente luz natural) y libre de distracciones. Un buen ambiente puede aumentar tu productividad hasta un 50%.",
      category: "productividad",
      action: "Organiza tu espacio de estudio antes de tu próxima sesión"
    },
    {
      title: "Hidratación para el Cerebro",
      description: "Bebe agua regularmente. Una deshidratación del 2% ya afecta tu concentración, memoria y rendimiento cognitivo. Tu cerebro es 73% agua.",
      category: "salud",
      action: "Ten siempre una botella de agua cerca mientras estudias"
    },
    {
      title: "Descansos Activos",
      description: "En tus pausas, haz estiramientos, camina o respira profundamente. Esto mejora la circulación sanguínea al cerebro y ayuda a consolidar lo aprendido.",
      category: "salud",
      action: "Haz 5 minutos de estiramientos cada hora de estudio"
    },
    {
      title: "Planificación Semanal",
      description: "Dedica 30 minutos cada domingo a planear tu semana: revisa tareas, distribuye tiempo de estudio, programa descansos. Reduce el estrés y mejora resultados.",
      category: "organizacion",
      action: "Planifica tu próxima semana este domingo"
    },
    {
      title: "Técnica de Feynman",
      description: "Elige un concepto, explícalo con palabras simples, identifica lagunas en tu comprensión, estudia esas áreas, simplifica aún más. Domina cualquier tema.",
      category: "aprendizaje",
      action: "Aplica esta técnica a un concepto difícil de tu curso"
    },
    {
      title: "Regla de los 2 Minutos",
      description: "Si una tarea toma menos de 2 minutos, hazla inmediatamente. Evita la procrastinación de tareas pequeñas que se acumulan y generan estrés.",
      category: "productividad",
      action: "Aplica esta regla a tus tareas pendientes hoy"
    },
    {
      title: "Música para Concentración",
      description: "Música clásica, lo-fi o sonidos de naturaleza pueden mejorar tu concentración. Evita música con letras en tu idioma durante el estudio profundo.",
      category: "productividad",
      action: "Prueba una playlist de música instrumental en tu próxima sesión"
    },
    {
      title: "Sueño y Aprendizaje",
      description: "Tu cerebro consolida memorias durante el sueño. Dormir 7-9 horas mejora la retención hasta un 40%. Nunca sacrifiques sueño por estudiar de madrugada.",
      category: "salud",
      action: "Establece una hora fija para dormir y despertarte"
    }
  ];

  const randomTip = tips[Math.floor(Math.random() * tips.length)];

  res.json({
    success: true,
    data: randomTip
  });
}));

// Obtener historial de conversaciones
router.get('/history', verifyToken, asyncHandler(async (req, res) => {
  const { limit = 20 } = req.query;

  try {
    const history = await executeQuery(`
      SELECT id, user_message, ai_response, created_at
      FROM ai_conversations
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `, [req.user.id, parseInt(limit)]);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    res.json({
      success: true,
      data: []
    });
  }
}));

module.exports = router;
module.exports.getStudentContext = getStudentContext;
module.exports.getInstructorContext = getInstructorContext;
module.exports.generateNaturalResponse = generateNaturalResponse;
