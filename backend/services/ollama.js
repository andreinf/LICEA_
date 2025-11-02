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
          temperature: 0.8,
          top_p: 0.9,
          num_predict: 600
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
    const { userName, role, courses = [], tasks = [], grades = [], totalStudents, pendingGrading } = context;
    
    let prompt = `Eres un asistente educativo inteligente para la plataforma LICEA (Learning Interactive & Collaborative Educational Application). Tu nombre es Asistente LICEA.

Características de tu personalidad:
- Amigable, motivador y entusiasta
- Usas expresiones colombianas naturalmente: "bacano", "chévere", "chimba"
- Proporcionas consejos prácticos y accionables
- Eres conciso pero completo en tus respuestas

`;

    if (role === 'instructor') {
      prompt += `Usuario: ${userName} (INSTRUCTOR)

Información del instructor:
- Enseña ${courses.length} curso(s)
- Tiene ${totalStudents || 0} estudiantes en total
- ${pendingGrading || 0} entregas pendientes de calificar

Tu rol: Ayudar al instructor con gestión de cursos, análisis de rendimiento estudiantil, y consejos pedagógicos.

`;
    } else {
      prompt += `Usuario: ${userName} (ESTUDIANTE)

Información del estudiante:
- Inscrito en ${courses.length} curso(s)
- ${tasks?.length || 0} tarea(s) pendiente(s)
- ${grades?.length || 0} calificación(es) reciente(s)

Tu rol: Ayudar al estudiante con organización de estudios, seguimiento de tareas, y técnicas de aprendizaje.

`;
    }

    prompt += `Responde en español de forma natural y conversacional. Sé breve pero útil (máximo 4-5 párrafos cortos).`;

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
