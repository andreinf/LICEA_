import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface DailyTip {
  title: string;
  description: string;
  category: string;
}

const AIAssistant: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [dailyTip, setDailyTip] = useState<DailyTip | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  useEffect(() => {
    // Mensaje de bienvenida
    const welcomeMessage: Message = {
      id: Date.now(),
      text: `¡Hola ${user?.name || 'estudiante'}! 👋 Soy tu Asistente LICEA. Estoy aquí para ayudarte con:\n\n• 📚 Información sobre tus cursos\n• ✅ Seguimiento de tareas\n• 📊 Revisión de calificaciones\n• 📅 Consulta de horarios\n• 💡 Tips y consejos de estudio\n\n¿En qué puedo ayudarte hoy?`,
      sender: 'ai',
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
    
    // Cargar tip del día
    fetchDailyTip();
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchDailyTip = async () => {
    try {
      const token = localStorage.getItem('licea_access_token');
      const response = await axios.get(`${baseURL}/ai-assistant/daily-tip`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDailyTip(response.data.data);
    } catch (error) {
      console.error('Error fetching daily tip:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);

    try {
      const token = localStorage.getItem('licea_access_token');
      const conversationHistory = messages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }));

      const response = await axios.post(`${baseURL}/ai-assistant/chat`, {
        message: inputMessage,
        conversation_history: conversationHistory
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const aiMessage: Message = {
        id: Date.now() + 1,
        text: response.data.data.response,
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        id: Date.now() + 1,
        text: 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.',
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickQuestion = (question: string) => {
    setInputMessage(question);
  };

  const quickQuestions = [
    '¿Qué tareas tengo pendientes?',
    '¿Cuáles son mis cursos?',
    '¿Cómo van mis calificaciones?',
    '¿Cuál es mi horario?',
    'Dame un consejo de estudio'
  ];

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      productividad: 'bg-blue-100 text-blue-800',
      aprendizaje: 'bg-green-100 text-green-800',
      estudio: 'bg-purple-100 text-purple-800',
      colaboracion: 'bg-yellow-100 text-yellow-800',
      salud: 'bg-red-100 text-red-800',
      organizacion: 'bg-indigo-100 text-indigo-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Asistente IA</h1>
          <p className="text-gray-600">Tu guía académica personalizada</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sección de Chat */}
        <div className="lg:col-span-2">
          <div className="card h-[600px] flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span>🤖</span>
                <span>Chat con tu Asistente</span>
              </h2>
            </div>

            {/* Área de mensajes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 ${
                      message.sender === 'user'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="whitespace-pre-line text-sm">{message.text}</p>
                    <span className="text-xs opacity-75 mt-1 block">
                      {message.timestamp.toLocaleTimeString('es-ES', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg px-4 py-3">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Formulario de entrada */}
            <div className="p-4 border-t border-gray-200">
              <form onSubmit={sendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Escribe tu pregunta aquí..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !inputMessage.trim()}
                  className="btn-primary px-6"
                >
                  {loading ? '...' : 'Enviar'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Panel lateral */}
        <div className="space-y-6">
          {/* Tip del día */}
          {dailyTip && (
            <div className="card">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <span>💡</span>
                  <span>Tip del Día</span>
                </h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(dailyTip.category)}`}>
                    {dailyTip.category}
                  </span>
                </div>
                <h4 className="font-semibold text-gray-900">{dailyTip.title}</h4>
                <p className="text-sm text-gray-600">{dailyTip.description}</p>
                <button
                  onClick={fetchDailyTip}
                  className="btn-secondary text-sm w-full"
                >
                  🔄 Nuevo Tip
                </button>
              </div>
            </div>
          )}

          {/* Preguntas rápidas */}
          <div className="card">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span>⚡</span>
                <span>Preguntas Rápidas</span>
              </h3>
            </div>
            <div className="p-4 space-y-2">
              {quickQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickQuestion(question)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors"
                  disabled={loading}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>

          {/* Información de ayuda */}
          <div className="card bg-primary-50">
            <div className="p-4 space-y-3">
              <h3 className="font-semibold text-primary-900 flex items-center gap-2">
                <span>ℹ️</span>
                <span>¿Cómo usar el Asistente?</span>
              </h3>
              <ul className="text-sm text-primary-800 space-y-2">
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Haz preguntas sobre tus cursos, tareas y horarios</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Solicita consejos de estudio y organización</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Consulta tus calificaciones y progreso</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Usa las preguntas rápidas para empezar</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
