const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { executeQuery } = require('../config/database');
const ollamaService = require('../services/ollama');

// Importar las funciones de contexto del archivo original
const { getStudentContext, getInstructorContext, generateNaturalResponse } = require('./ai-assistant-improved');

const router = express.Router();

// Variable para cachear el estado de Ollama
let ollamaAvailable = null;
let lastCheck = null;

/**
 * Verifica si Ollama está disponible (con caché de 5 minutos)
 */
async function checkOllamaAvailability() {
  const now = Date.now();
  if (ollamaAvailable !== null && lastCheck && (now - lastCheck < 300000)) {
    return ollamaAvailable;
  }
  
  ollamaAvailable = await ollamaService.isAvailable();
  lastCheck = now;
  console.log(`[AI] Ollama ${ollamaAvailable ? 'disponible' : 'no disponible'} - usando ${ollamaAvailable ? 'IA local' : 'respuestas predefinidas'}`);
  return ollamaAvailable;
}

/**
 * Obtener contexto del usuario según su rol
 */
async function getUserContext(userId, userName, userRole) {
  if (userRole === 'instructor') {
    return await getInstructorContext(userId, userName);
  }
  return await getStudentContext(userId, userName);
}

/**
 * Ruta principal del chat con soporte para Ollama
 */
router.post('/chat', verifyToken, asyncHandler(async (req, res) => {
  const { message, conversation_history = [], use_ollama = true } = req.body;

  if (!message || message.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'El mensaje no puede estar vacío'
    });
  }

  // Obtener contexto del usuario
  const context = await getUserContext(req.user.id, req.user.name, req.user.role);
  
  let aiResponse;
  let source = 'fallback';
  let model = 'predefined';

  // Intentar usar Ollama si está disponible y habilitado (con timeout rápido)
  if (use_ollama) {
    const isOllamaAvailable = await checkOllamaAvailability();
    
    if (isOllamaAvailable) {
      try {
        // Timeout rápido: si no responde en 8 segundos, usar fallback
        const ollamaPromise = (async () => {
          const messages = [
            ...conversation_history.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            {
              role: 'user',
              content: message
            }
          ];
          return await ollamaService.chat(messages, context);
        })();

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout - respuesta muy lenta')), 8000)
        );

        const ollamaResponse = await Promise.race([ollamaPromise, timeoutPromise]);
        
        if (ollamaResponse.success) {
          aiResponse = ollamaResponse.message;
          source = 'ollama';
          model = ollamaService.model;
          console.log(`[AI] ✅ Respuesta generada con Ollama (${model})`);
        } else {
          throw new Error(ollamaResponse.error);
        }
      } catch (error) {
        console.warn(`[AI] ⚡ Ollama tarda demasiado o falló, usando fallback instantáneo: ${error.message}`);
        ollamaAvailable = false; // Marcar como no disponible temporalmente
        // Continuar con fallback
      }
    }
  }

  // Fallback: usar sistema de respuestas predefinidas
  if (!aiResponse) {
    aiResponse = generateNaturalResponse(message, context);
    console.log('[AI] Usando sistema de respuestas predefinidas');
  }

  // Guardar en historial
  try {
    await executeQuery(`
      INSERT INTO ai_conversations (user_id, user_message, ai_response, context_data, ai_source)
      VALUES (?, ?, ?, ?, ?)
    `, [
      req.user.id, 
      message, 
      aiResponse, 
      JSON.stringify({ 
        courses: context.courses?.length || 0,
        tasks: context.tasks?.length || 0,
        role: req.user.role
      }),
      source
    ]);
  } catch (error) {
    console.log('[AI] No se pudo guardar el historial (tabla puede no existir)');
  }

  res.json({
    success: true,
    data: {
      response: aiResponse,
      timestamp: new Date().toISOString(),
      source: source, // 'ollama' o 'fallback'
      model: model,
      context_summary: {
        courses_count: context.courses?.length || 0,
        pending_tasks: context.tasks?.length || 0,
        role: req.user.role
      }
    }
  });
}));

/**
 * Análisis de rendimiento usando Ollama (solo para estudiantes)
 */
router.get('/analyze-performance', verifyToken, asyncHandler(async (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({
      success: false,
      message: 'Esta funcionalidad es solo para estudiantes'
    });
  }

  const context = await getStudentContext(req.user.id, req.user.name);
  const isOllamaAvailable = await checkOllamaAvailability();

  let analysis;

  if (isOllamaAvailable) {
    // Calcular promedio de calificaciones
    const avgGrade = context.grades.length > 0
      ? context.grades.reduce((sum, g) => sum + (g.grade / g.max_grade * 100), 0) / context.grades.length
      : null;

    const studentData = {
      userName: req.user.name,
      courses: context.courses,
      tasks: {
        completed: context.completedTasks,
        pending: context.tasks.length
      },
      grades: {
        average: avgGrade,
        count: context.grades.length
      }
    };

    const ollamaResponse = await ollamaService.analyzeStudentPerformance(studentData);
    
    if (ollamaResponse.success) {
      analysis = ollamaResponse.response;
    }
  }

  // Fallback: análisis básico
  if (!analysis) {
    const avgGrade = context.grades.length > 0
      ? context.grades.reduce((sum, g) => sum + (g.grade / g.max_grade * 100), 0) / context.grades.length
      : 0;

    analysis = `📊 **Análisis de Rendimiento**\n\n`;
    
    if (avgGrade >= 85) {
      analysis += `¡Excelente trabajo! Tu promedio de ${avgGrade.toFixed(1)}% es sobresaliente.\n\n`;
    } else if (avgGrade >= 70) {
      analysis += `Buen rendimiento con ${avgGrade.toFixed(1)}% de promedio. Hay espacio para mejorar.\n\n`;
    } else {
      analysis += `Tu promedio actual es ${avgGrade.toFixed(1)}%. Necesitas enfocarte en mejorar.\n\n`;
    }

    analysis += `**Recomendaciones:**\n`;
    analysis += `1. ${context.tasks.length > 0 ? `Prioriza tus ${context.tasks.length} tareas pendientes` : 'Mantén el ritmo con las entregas'}\n`;
    analysis += `2. Revisa el material de ${context.courses.length > 0 ? context.courses[0].name : 'tus cursos'}\n`;
    analysis += `3. Únete a grupos de estudio para colaborar`;
  }

  res.json({
    success: true,
    data: {
      analysis,
      statistics: {
        courses: context.courses.length,
        pending_tasks: context.tasks.length,
        completed_tasks: context.completedTasks,
        recent_grades: context.grades.length
      },
      source: analysis.includes('Ollama') ? 'ollama' : 'fallback'
    }
  });
}));

/**
 * Sugerencias de mejora para cursos (solo instructores)
 */
router.get('/course-suggestions/:courseId', verifyToken, asyncHandler(async (req, res) => {
  if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Esta funcionalidad es solo para instructores'
    });
  }

  const { courseId } = req.params;

  // Obtener datos del curso
  const courseData = await executeQuery(`
    SELECT c.name, c.code,
           COUNT(DISTINCT ce.student_id) as students_count,
           COUNT(DISTINCT t.id) as total_tasks,
           COUNT(DISTINCT s.id) as total_submissions,
           AVG(CASE WHEN s.status = 'graded' THEN s.grade/t.max_grade * 100 END) as avg_grade
    FROM courses c
    LEFT JOIN course_enrollments ce ON c.id = ce.course_id AND ce.status = 'active'
    LEFT JOIN tasks t ON c.id = t.course_id
    LEFT JOIN submissions s ON t.id = s.task_id
    WHERE c.id = ? AND c.instructor_id = ?
    GROUP BY c.id
  `, [courseId, req.user.id]);

  if (courseData.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Curso no encontrado o no tienes permiso'
    });
  }

  const course = courseData[0];
  const submissionRate = course.total_tasks > 0 
    ? ((course.total_submissions / (course.students_count * course.total_tasks)) * 100).toFixed(1)
    : 0;

  let suggestions;
  const isOllamaAvailable = await checkOllamaAvailability();

  if (isOllamaAvailable) {
    const ollamaResponse = await ollamaService.suggestCourseImprovements({
      courseName: course.name,
      studentsCount: course.students_count,
      avgGrade: course.avg_grade?.toFixed(1) || 'N/A',
      submissionRate
    });

    if (ollamaResponse.success) {
      suggestions = ollamaResponse.response;
    }
  }

  // Fallback
  if (!suggestions) {
    suggestions = `📚 **Sugerencias para ${course.name}**\n\n`;
    suggestions += `**Estadísticas actuales:**\n`;
    suggestions += `- ${course.students_count} estudiantes\n`;
    suggestions += `- Promedio: ${course.avg_grade?.toFixed(1) || 'N/A'}%\n`;
    suggestions += `- Tasa de entrega: ${submissionRate}%\n\n`;
    suggestions += `**Recomendaciones:**\n`;
    suggestions += `1. Implementa retroalimentación más frecuente\n`;
    suggestions += `2. Crea grupos de estudio colaborativos\n`;
    suggestions += `3. Ofrece horas de consulta adicionales`;
  }

  res.json({
    success: true,
    data: {
      course: {
        name: course.name,
        code: course.code,
        students: course.students_count,
        avg_grade: course.avg_grade?.toFixed(1),
        submission_rate: submissionRate
      },
      suggestions,
      source: suggestions.includes('Ollama') ? 'ollama' : 'fallback'
    }
  });
}));

/**
 * Obtener tip del día
 */
router.get('/daily-tip', verifyToken, asyncHandler(async (req, res) => {
  const tips = [
    {
      title: "Técnica Pomodoro",
      description: "Estudia 25 minutos, descansa 5. Después de 4 ciclos, toma un descanso largo de 15-30 minutos. Mejora tu concentración y previene el agotamiento mental.",
      category: "productividad",
      icon: "⏱️"
    },
    {
      title: "Revisión Espaciada",
      description: "Repasa el material a intervalos: 1 día, 3 días, 1 semana, 1 mes después de aprenderlo. Este método aprovecha cómo funciona la memoria a largo plazo.",
      category: "aprendizaje",
      icon: "🧠"
    },
    {
      title: "Método Cornell para Apuntes",
      description: "Divide tu hoja en 3 secciones: notas principales, palabras clave y resumen. Mejora significativamente la organización y retención de información.",
      category: "estudio",
      icon: "📓"
    },
    {
      title: "Enseña para Aprender",
      description: "Explica conceptos a compañeros o en voz alta. Si puedes enseñarlo claramente, realmente lo entiendes. Esta es una de las formas más efectivas de consolidar conocimiento.",
      category: "colaboracion",
      icon: "👥"
    },
    {
      title: "Hidratación para el Cerebro",
      description: "Bebe agua regularmente. Una deshidratación del 2% ya afecta tu concentración, memoria y rendimiento cognitivo. Tu cerebro es 73% agua.",
      category: "salud",
      icon: "💧"
    },
    {
      title: "Descansos Activos",
      description: "En tus pausas, haz estiramientos, camina o respira profundamente. Esto mejora la circulación sanguínea al cerebro y ayuda a consolidar lo aprendido.",
      category: "salud",
      icon: "🧘"
    }
  ];

  const randomTip = tips[Math.floor(Math.random() * tips.length)];

  res.json({
    success: true,
    data: randomTip
  });
}));

/**
 * Estado del sistema de IA
 */
router.get('/status', verifyToken, asyncHandler(async (req, res) => {
  const isOllamaAvailable = await checkOllamaAvailability();
  let models = [];

  if (isOllamaAvailable) {
    models = await ollamaService.listModels();
  }

  res.json({
    success: true,
    data: {
      ollama_available: isOllamaAvailable,
      current_model: ollamaService.model,
      available_models: models,
      fallback_enabled: true,
      api_url: ollamaService.baseURL
    }
  });
}));

module.exports = router;
