const axios = require('axios');

/**
 * Servicio de integración con Ollama para IA local
 * 
 * Ollama permite ejecutar modelos LLM localmente sin depender de APIs externas
 * Modelos recomendados:
 * - llama2 (7B): Rápido, bueno para conversación general
 * - mistral (7B): Excelente para tareas de instrucción
 * - codellama (7B): Especializado en código
 * - llama2:13b: Mayor capacidad, más lento pero más preciso
 */

class OllamaService {
  constructor() {
    this.baseURL = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'llama2';
    this.timeout = parseInt(process.env.OLLAMA_TIMEOUT || '60000'); // 60 segundos
  }

  /**
   * Verifica si Ollama está disponible y corriendo
   */
  async isAvailable() {
    try {
      const response = await axios.get(`${this.baseURL}/api/tags`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      console.warn('Ollama no está disponible:', error.message);
      return false;
    }
  }

  /**
   * Lista los modelos disponibles en Ollama
   */
  async listModels() {
    try {
      const response = await axios.get(`${this.baseURL}/api/tags`, {
        timeout: 5000
      });
      return response.data.models || [];
    } catch (error) {
      console.error('Error listando modelos de Ollama:', error.message);
      return [];
    }
  }

  /**
   * Genera una respuesta usando Ollama
   * @param {string} prompt - El prompt para el modelo
   * @param {object} context - Contexto adicional (opcional)
   * @param {object} options - Opciones de generación
   */
  async generate(prompt, context = {}, options = {}) {
    try {
      // Verificar disponibilidad
      const available = await this.isAvailable();
      if (!available) {
        throw new Error('Ollama no está disponible. Asegúrate de que esté instalado y corriendo.');
      }

      // Construir el prompt completo con contexto
      const fullPrompt = this.buildContextualPrompt(prompt, context);

      // Configuración de la solicitud
      const requestBody = {
        model: this.model,
        prompt: fullPrompt,
        stream: false,
        options: {
          temperature: options.temperature || 0.7,
          top_p: options.top_p || 0.9,
          top_k: options.top_k || 40,
          num_predict: options.max_tokens || 512,
          ...options
        }
      };

      console.log(`[Ollama] Generando respuesta con modelo: ${this.model}`);
      
      const response = await axios.post(
        `${this.baseURL}/api/generate`,
        requestBody,
        { 
          timeout: this.timeout,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      return {
        success: true,
        response: response.data.response,
        model: this.model,
        context: response.data.context,
        total_duration: response.data.total_duration,
        load_duration: response.data.load_duration,
        prompt_eval_count: response.data.prompt_eval_count,
        eval_count: response.data.eval_count
      };
    } catch (error) {
      console.error('[Ollama] Error generando respuesta:', error.message);
      return {
        success: false,
        error: error.message,
        fallback: true
      };
    }
  }

  /**
   * Chat con historial de conversación
   * @param {array} messages - Array de mensajes [{role: 'user'|'assistant', content: 'texto'}]
   * @param {object} context - Contexto del usuario
   */
  async chat(messages, context = {}) {
    try {
      const available = await this.isAvailable();
      if (!available) {
        throw new Error('Ollama no está disponible');
      }

      // Construir el prompt del chat
      const systemPrompt = this.buildSystemPrompt(context);
      const conversationPrompt = this.buildChatPrompt(messages, systemPrompt);

      const requestBody = {
        model: this.model,
        prompt: conversationPrompt,
        stream: false,
        options: {
          temperature: 0.7,        // Más consistente
          top_p: 0.9,
          top_k: 40,
          num_predict: 800,        // Más tokens para respuestas completas
          repeat_penalty: 1.1,     // Evita repeticiones
          stop: ['Usuario:', 'User:'] // Para en el siguiente turno
        }
      };

      const response = await axios.post(
        `${this.baseURL}/api/generate`,
        requestBody,
        { timeout: this.timeout }
      );

      return {
        success: true,
        message: response.data.response,
        model: this.model
      };
    } catch (error) {
      console.error('[Ollama] Error en chat:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Construye un prompt contextual con información del estudiante/instructor
   */
  buildContextualPrompt(userMessage, context) {
    const systemContext = this.buildSystemPrompt(context);
    
    return `${systemContext}

Usuario: ${userMessage}

Asistente LICEA:`;
  }

  /**
   * Construye el prompt del sistema con contexto educativo
   */
  buildSystemPrompt(context) {
    const { userName, role, courses = [], tasks = [], grades = [], totalStudents, pendingGrading, coursePerformance = [] } = context;
    
    let prompt = `Eres un asistente educativo experto para la plataforma LICEA (Learning Interactive & Collaborative Educational Application).

TU IDENTIDAD:
- Nombre: Asistente LICEA
- Personalidad: Profesional, amigable y motivador
- Estilo: Usas expresiones colombianas naturalmente ("bacano", "chévere", "chimba")
- Formato: Respuestas claras, organizadas con bullets o números, máximo 5 párrafos

REGLAS IMPORTANTES:
1. SIEMPRE responde en español
2. Si no sabes algo, dilo honestamente
3. Proporciona ejemplos concretos y accionables
4. Mantén un tono profesional pero cercano
5. Usa emojis ocasionalmente para mayor claridad

`;

    if (role === 'instructor') {
      prompt += `PERFIL DEL USUARIO:
👨‍🏫 Instructor: ${userName}

ESTADÍSTICAS ACTUALES:
- Cursos que enseña: ${courses.length}
- Total de estudiantes: ${totalStudents || 0}
- Entregas pendientes de calificar: ${pendingGrading || 0}
${courses.length > 0 ? `- Cursos activos: ${courses.map(c => c.name).join(', ')}` : ''}

TU ROL COMO ASISTENTE PARA INSTRUCTORES:
✅ Ayudar con gestión y planificación de cursos
✅ Sugerir estrategias pedagógicas efectivas
✅ Analizar rendimiento estudiantil y detectar patrones
✅ Recomendar mejoras en metodología de enseñanza
✅ Optimizar procesos de calificación y retroalimentación
✅ Proporcionar ideas para actividades y evaluaciones

PUEDES AYUDAR CON:
- Crear planes de clase y cronogramas
- Diseñar rúbricas de evaluación
- Estrategias para aumentar participación
- Manejo de estudiantes con bajo rendimiento
- Técnicas de enseñanza activa
- Herramientas digitales para educación
- Comunicación efectiva con estudiantes

`;
    } else {
      prompt += `PERFIL DEL USUARIO:
🎓 Estudiante: ${userName}

ESTADÍSTICAS ACTUALES:
- Cursos inscritos: ${courses.length}
- Tareas pendientes: ${tasks?.length || 0}
- Calificaciones recientes: ${grades?.length || 0}
${courses.length > 0 ? `- Estudiando: ${courses.map(c => c.name).join(', ')}` : ''}

TU ROL COMO ASISTENTE PARA ESTUDIANTES:
✅ Ayudar con organización y planificación de estudios
✅ Sugerir técnicas de aprendizaje efectivas
✅ Motivar y dar ánimos en momentos difíciles
✅ Recomendar estrategias para mejorar calificaciones
✅ Ayudar a priorizar tareas y gestionar tiempo
✅ Proporcionar consejos para exámenes

PUEDES AYUDAR CON:
- Técnicas de estudio (Pomodoro, Cornell, Feynman)
- Organización de horarios
- Preparación para exámenes
- Toma de apuntes efectiva
- Manejo de estrés académico
- Grupos de estudio
- Motivación y hábitos

`;
    }

    prompt += `
FORMATO DE RESPUESTA:
- Inicia con un saludo breve si es apropiado
- Estructura tu respuesta con bullets (•) o números (1., 2., 3.)
- Usa negritas (**texto**) para resaltar puntos importantes
- Incluye 1-2 emojis relevantes para hacer la respuesta más amigable
- Termina con una pregunta o call-to-action si es apropiado

IMPORTANTE: Responde SIEMPRE en español, de forma práctica y útil. Si el usuario pregunta sobre LICEA, explica que es una plataforma educativa integral con cursos, tareas, calificaciones, cronogramas, chat y este asistente IA.`;

    return prompt;
  }

  /**
   * Construye el prompt para chat con historial
   */
  buildChatPrompt(messages, systemPrompt) {
    let prompt = systemPrompt + '\n\n---\n\n';
    
    messages.forEach(msg => {
      const role = msg.role === 'user' ? 'Usuario' : 'Asistente LICEA';
      prompt += `${role}: ${msg.content}\n\n`;
    });
    
    prompt += 'Asistente LICEA:';
    
    return prompt;
  }

  /**
   * Analiza el rendimiento de un estudiante usando IA
   */
  async analyzeStudentPerformance(studentData) {
    const { grades, tasks, courses } = studentData;
    
    const prompt = `Analiza el siguiente rendimiento académico y proporciona 3 recomendaciones específicas:

Cursos inscritos: ${courses.length}
Tareas completadas: ${tasks.completed || 0}
Tareas pendientes: ${tasks.pending || 0}
Promedio de calificaciones: ${grades.average || 'N/A'}%

Proporciona un análisis breve (2-3 líneas) y 3 consejos accionables.`;

    return await this.generate(prompt, studentData, { max_tokens: 400 });
  }

  /**
   * Genera sugerencias de mejora para un curso (para instructores)
   */
  async suggestCourseImprovements(courseData) {
    const { courseName, studentsCount, avgGrade, submissionRate } = courseData;
    
    const prompt = `Como instructor de "${courseName}" con ${studentsCount} estudiantes, el promedio es ${avgGrade}% y la tasa de entrega es ${submissionRate}%.

¿Qué 3 estrategias específicas recomiendas para mejorar el rendimiento del curso?`;

    return await this.generate(prompt, { role: 'instructor' }, { max_tokens: 400 });
  }
}

// Exportar instancia única
module.exports = new OllamaService();
