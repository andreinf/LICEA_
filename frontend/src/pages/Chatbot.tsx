import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

interface Message {
  id: number;
  message: string;
  response?: string;
  message_type: 'question' | 'response' | 'system';
  created_at: string;
  is_user_message?: boolean;
}

interface ChatSession {
  session_id: string;
  messages: Message[];
}

const Chatbot: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Mensaje de bienvenida
    const welcomeMessage: Message = {
      id: 0,
      message: `¡Hola ${user?.name}! 👋 Soy tu asistente virtual de LICEA. Puedo ayudarte con:
      
      📚 Información sobre cursos y materiales
      📝 Dudas sobre tareas y evaluaciones  
      📅 Consultas sobre horarios y cronogramas
      💡 Consejos de estudio y aprendizaje
      🎯 Orientación académica

      ¿En qué puedo ayudarte hoy?`,
      message_type: 'system',
      created_at: new Date().toISOString(),
      is_user_message: false
    };
    setMessages([welcomeMessage]);
  }, [user?.name]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now(),
      message: currentMessage,
      message_type: 'question',
      created_at: new Date().toISOString(),
      is_user_message: true
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setLoading(true);

    try {
    const token = localStorage.getItem('licea_access_token');
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: currentMessage,
          session_id: sessionId
        })
      });

      if (response.ok) {
        const data = await response.json();
        const botResponse: Message = {
          id: Date.now() + 1,
          message: data.response || 'Lo siento, no pude procesar tu mensaje. Por favor, intenta de nuevo.',
          message_type: 'response',
          created_at: new Date().toISOString(),
          is_user_message: false
        };
        setMessages(prev => [...prev, botResponse]);
      } else {
        // Respuesta de fallback si el servidor no responde
        const fallbackResponse: Message = {
          id: Date.now() + 1,
          message: 'Lo siento, estoy experimentando dificultades técnicas en este momento. Por favor, intenta más tarde o contacta al soporte técnico.',
          message_type: 'response',
          created_at: new Date().toISOString(),
          is_user_message: false
        };
        setMessages(prev => [...prev, fallbackResponse]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Respuesta simulada para desarrollo
      const simulatedResponse: Message = {
        id: Date.now() + 1,
        message: `Gracias por tu pregunta: "${currentMessage}". 
        
En este momento estoy en modo de desarrollo, pero puedo ayudarte con información general sobre:

• Navegación por la plataforma
• Información sobre cursos disponibles
• Explicación de funcionalidades
• Guía de uso de herramientas

¿Hay algo específico en lo que te gustaría que te ayude?`,
        message_type: 'response',
        created_at: new Date().toISOString(),
        is_user_message: false
      };
      setMessages(prev => [...prev, simulatedResponse]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickQuestions = [
    '¿Cómo funciona la plataforma?',
    '¿Dónde veo mis cursos?',
    '¿Cómo accedo a los materiales?',
    '¿Cómo reviso mis horarios?'
  ];

  const formatMessage = (message: string) => {
    return message.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < message.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-primary-100 p-2 rounded-full mr-3">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Asistente Virtual LICEA</h1>
                <p className="text-sm text-gray-600">Tu compañero de estudio inteligente</p>
              </div>
            </div>
            <div className="flex items-center text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              <span className="text-sm font-medium">En línea</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden flex flex-col max-w-4xl mx-auto w-full">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={message.id || index}
              className={`flex ${message.is_user_message ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex max-w-xs lg:max-w-md xl:max-w-lg ${message.is_user_message ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div className={`flex-shrink-0 ${message.is_user_message ? 'ml-3' : 'mr-3'}`}>
                  {message.is_user_message ? (
                    <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {user?.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  ) : (
                    <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Message */}
                <div className={`rounded-lg px-4 py-2 ${message.is_user_message 
                  ? 'bg-primary-600 text-white' 
                  : message.message_type === 'system'
                    ? 'bg-blue-50 text-blue-900 border border-blue-200'
                    : 'bg-white text-gray-900 shadow border'
                }`}>
                  <div className="text-sm">
                    {formatMessage(message.message)}
                  </div>
                  <div className={`text-xs mt-1 ${message.is_user_message ? 'text-primary-100' : 'text-gray-500'}`}>
                    {new Date(message.created_at).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start">
              <div className="flex mr-3">
                <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
              </div>
              <div className="bg-white text-gray-900 shadow border rounded-lg px-4 py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Questions */}
        {messages.length <= 1 && (
          <div className="p-4 border-t bg-gray-50">
            <p className="text-sm text-gray-600 mb-3">Preguntas frecuentes:</p>
            <div className="flex flex-wrap gap-2">
              {quickQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentMessage(question)}
                  className="text-xs bg-white hover:bg-gray-50 border border-gray-300 rounded-full px-3 py-1 transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t bg-white p-4">
          <div className="flex space-x-3">
            <div className="flex-1">
              <textarea
                ref={inputRef}
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escribe tu pregunta aquí..."
                className="w-full resize-none border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows={1}
                style={{ minHeight: '40px', maxHeight: '120px' }}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!currentMessage.trim() || loading}
              className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white rounded-lg px-4 py-2 transition-colors flex items-center justify-center"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
