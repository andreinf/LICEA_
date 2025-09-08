import React, { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventInput } from '@fullcalendar/core';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  extendedProps: {
    type: 'task' | 'exam' | 'class' | 'meeting' | 'study' | 'other';
    description?: string;
    course_name?: string;
    priority: 'low' | 'medium' | 'high';
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  };
  backgroundColor?: string;
  borderColor?: string;
}

interface NewEventForm {
  title: string;
  description: string;
  start: string;
  end: string;
  type: 'task' | 'exam' | 'class' | 'meeting' | 'study' | 'other';
  priority: 'low' | 'medium' | 'high';
}

const CalendarPage: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [newEvent, setNewEvent] = useState<NewEventForm>({
    title: '',
    description: '',
    start: '',
    end: '',
    type: 'study',
    priority: 'medium'
  });
  const calendarRef = useRef<FullCalendar>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const response = await api.get('/schedules');
      if (response.data.success) {
        const calendarEvents = response.data.data.map((event: any) => ({
          id: event.id.toString(),
          title: event.title,
          start: event.start_time,
          end: event.end_time,
          extendedProps: {
            type: event.activity_type,
            description: event.description,
            course_name: event.course_name,
            priority: event.priority,
            status: event.status
          },
          backgroundColor: getEventColor(event.activity_type, event.priority),
          borderColor: getEventBorderColor(event.priority)
        }));
        setEvents(calendarEvents);
      }
    } catch (error) {
      console.error('Error cargando eventos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventColor = (type: string, priority: string) => {
    const colors = {
      task: { low: '#e3f2fd', medium: '#2196f3', high: '#1976d2' },
      exam: { low: '#fff3e0', medium: '#ff9800', high: '#f57c00' },
      class: { low: '#e8f5e8', medium: '#4caf50', high: '#388e3c' },
      meeting: { low: '#f3e5f5', medium: '#9c27b0', high: '#7b1fa2' },
      study: { low: '#fff8e1', medium: '#ffc107', high: '#ffa000' },
      other: { low: '#f5f5f5', medium: '#9e9e9e', high: '#616161' }
    };
    return colors[type as keyof typeof colors]?.[priority as keyof typeof colors.task] || '#9e9e9e';
  };

  const getEventBorderColor = (priority: string) => {
    const colors = {
      low: '#e0e0e0',
      medium: '#757575',
      high: '#424242'
    };
    return colors[priority as keyof typeof colors] || '#757575';
  };

  const handleDateClick = (info: any) => {
    setSelectedDate(info.dateStr);
    setNewEvent({ 
      ...newEvent, 
      start: info.dateStr + 'T09:00',
      end: info.dateStr + 'T10:00'
    });
    setShowCreateModal(true);
  };

  const handleEventClick = (info: any) => {
    const event = events.find(e => e.id === info.event.id);
    if (event) {
      setSelectedEvent(event);
      setShowEventModal(true);
    }
  };

  const handleCreateEvent = async () => {
    try {
      const response = await api.post('/schedules', {
        title: newEvent.title,
        description: newEvent.description,
        activity_type: newEvent.type,
        start_time: newEvent.start,
        end_time: newEvent.end,
        priority: newEvent.priority
      });

      if (response.data.success) {
        setShowCreateModal(false);
        setNewEvent({
          title: '',
          description: '',
          start: '',
          end: '',
          type: 'study',
          priority: 'medium'
        });
        loadEvents();
      }
    } catch (error) {
      console.error('Error creando evento:', error);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const response = await api.delete(`/schedules/${eventId}`);
      if (response.data.success) {
        setShowEventModal(false);
        setSelectedEvent(null);
        loadEvents();
      }
    } catch (error) {
      console.error('Error eliminando evento:', error);
    }
  };

  const handleUpdateEventStatus = async (eventId: string, newStatus: string) => {
    try {
      const response = await api.patch(`/schedules/${eventId}/status`, {
        status: newStatus
      });
      if (response.data.success) {
        loadEvents();
      }
    } catch (error) {
      console.error('Error actualizando evento:', error);
    }
  };

  const getUpcomingEvents = () => {
    const now = new Date();
    const upcoming = events
      .filter(event => new Date(event.start) > now)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 5);
    return upcoming;
  };

  const getTodayEvents = () => {
    const today = new Date().toISOString().split('T')[0];
    return events.filter(event => event.start.split('T')[0] === today);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Cronograma Inteligente</h1>
        <p className="text-gray-600 mt-2">
          Gestiona tus talleres, clases y actividades académicas
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar con resumen */}
        <div className="lg:col-span-1">
          {/* Eventos de hoy */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Hoy</h2>
            <div className="space-y-3">
              {getTodayEvents().length > 0 ? (
                getTodayEvents().map(event => (
                  <div key={event.id} className="p-3 rounded-lg border-l-4" 
                       style={{ borderLeftColor: event.backgroundColor }}>
                    <p className="font-medium text-sm">{event.title}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(event.start).toLocaleTimeString('es', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                    {event.extendedProps.course_name && (
                      <p className="text-xs text-blue-600">
                        {event.extendedProps.course_name}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No hay eventos para hoy</p>
              )}
            </div>
          </div>

          {/* Próximos eventos */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Próximos Eventos</h2>
            <div className="space-y-3">
              {getUpcomingEvents().map(event => (
                <div key={event.id} className="p-3 rounded-lg border-l-4"
                     style={{ borderLeftColor: event.backgroundColor }}>
                  <p className="font-medium text-sm">{event.title}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(event.start).toLocaleDateString('es', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  {event.extendedProps.course_name && (
                    <p className="text-xs text-blue-600">
                      {event.extendedProps.course_name}
                    </p>
                  )}
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                    ${
                      event.extendedProps.priority === 'high' ? 'bg-red-100 text-red-800' :
                      event.extendedProps.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                    {event.extendedProps.priority === 'high' ? 'Alta' :
                     event.extendedProps.priority === 'medium' ? 'Media' : 'Baja'}
                  </span>
                </div>
              ))}
              {getUpcomingEvents().length === 0 && (
                <p className="text-gray-500 text-sm">No hay eventos próximos</p>
              )}
            </div>
          </div>
        </div>

        {/* Calendario principal */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => calendarRef.current?.getApi().prev()}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => calendarRef.current?.getApi().next()}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => calendarRef.current?.getApi().today()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Hoy
                </button>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span>Talleres</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-3 h-3 bg-orange-500 rounded"></div>
                  <span>Evaluaciones</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span>Clases</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-3 h-3 bg-purple-500 rounded"></div>
                  <span>Reuniones</span>
                </div>
              </div>
            </div>
            
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={false}
              events={events}
              dateClick={handleDateClick}
              eventClick={handleEventClick}
              selectable={true}
              selectMirror={true}
              dayMaxEvents={true}
              weekends={true}
              height={600}
              locale="es"
              dayHeaderFormat={{ weekday: 'short' }}
              eventTimeFormat={{
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              }}
              slotLabelFormat={{
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              }}
            />
          </div>
        </div>
      </div>

      {/* Modal para ver evento */}
      {showEventModal && selectedEvent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {selectedEvent.title}
                </h3>
                <button
                  onClick={() => setShowEventModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Cerrar</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Tipo:</p>
                  <p className="text-sm text-gray-900 capitalize">{selectedEvent.extendedProps.type}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700">Fecha y hora:</p>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedEvent.start).toLocaleString('es')}
                  </p>
                </div>
                
                {selectedEvent.extendedProps.description && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Descripción:</p>
                    <p className="text-sm text-gray-900">{selectedEvent.extendedProps.description}</p>
                  </div>
                )}
                
                {selectedEvent.extendedProps.course_name && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Curso:</p>
                    <p className="text-sm text-blue-600">{selectedEvent.extendedProps.course_name}</p>
                  </div>
                )}
                
                <div>
                  <p className="text-sm font-medium text-gray-700">Prioridad:</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                    ${
                      selectedEvent.extendedProps.priority === 'high' ? 'bg-red-100 text-red-800' :
                      selectedEvent.extendedProps.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                    {selectedEvent.extendedProps.priority === 'high' ? 'Alta' :
                     selectedEvent.extendedProps.priority === 'medium' ? 'Media' : 'Baja'}
                  </span>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700">Estado:</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                    ${
                      selectedEvent.extendedProps.status === 'completed' ? 'bg-green-100 text-green-800' :
                      selectedEvent.extendedProps.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      selectedEvent.extendedProps.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                    {selectedEvent.extendedProps.status === 'completed' ? 'Completado' :
                     selectedEvent.extendedProps.status === 'in_progress' ? 'En progreso' :
                     selectedEvent.extendedProps.status === 'cancelled' ? 'Cancelado' : 'Programado'}
                  </span>
                </div>
              </div>
              
              {selectedEvent.extendedProps.status !== 'completed' && (
                <div className="mt-6 flex justify-between">
                  <div className="flex space-x-2">
                    {selectedEvent.extendedProps.status === 'scheduled' && (
                      <button
                        onClick={() => handleUpdateEventStatus(selectedEvent.id, 'in_progress')}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        Iniciar
                      </button>
                    )}
                    {selectedEvent.extendedProps.status === 'in_progress' && (
                      <button
                        onClick={() => handleUpdateEventStatus(selectedEvent.id, 'completed')}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                      >
                        Completar
                      </button>
                    )}
                  </div>
                  
                  {user?.role === 'student' && selectedEvent.extendedProps.type === 'study' && (
                    <button
                      onClick={() => handleDeleteEvent(selectedEvent.id)}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal para crear evento */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Crear Nuevo Evento
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Cerrar</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Título</label>
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Nombre del evento"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Descripción</label>
                  <textarea
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    rows={3}
                    placeholder="Descripción del evento"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Inicio</label>
                    <input
                      type="datetime-local"
                      value={newEvent.start}
                      onChange={(e) => setNewEvent({ ...newEvent, start: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Fin</label>
                    <input
                      type="datetime-local"
                      value={newEvent.end}
                      onChange={(e) => setNewEvent({ ...newEvent, end: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tipo</label>
                    <select
                      value={newEvent.type}
                      onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as any })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="study">Estudio</option>
                      <option value="task">Taller</option>
                      <option value="exam">Evaluación</option>
                      <option value="class">Clase</option>
                      <option value="meeting">Reunión</option>
                      <option value="other">Otro</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Prioridad</label>
                    <select
                      value={newEvent.priority}
                      onChange={(e) => setNewEvent({ ...newEvent, priority: e.target.value as any })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="low">Baja</option>
                      <option value="medium">Media</option>
                      <option value="high">Alta</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateEvent}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  disabled={!newEvent.title || !newEvent.start || !newEvent.end}
                >
                  Crear Evento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;
