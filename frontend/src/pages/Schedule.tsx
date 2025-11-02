import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

interface Schedule {
  id: number;
  course_id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room?: string;
  location?: string;
  course_title: string;
  course_code: string;
}

const DAYS = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' }
];

const Schedule: React.FC = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [myCourses, setMyCourses] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    course_id: '',
    day_of_week: 'monday',
    start_time: '08:00',
    end_time: '10:00',
    room: '',
    location: ''
  });

  useEffect(() => {
    fetchSchedules();
    if (user?.role === 'instructor') {
      fetchMyCourses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('licea_access_token');
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      const endpoint = user?.role === 'admin' ? `${baseURL}/schedules` : `${baseURL}/schedules/my`;
      
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSchedules(response.data.data || []);
    } catch (error) {
      setError('Error al cargar el cronograma');
      console.error('Error fetching schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyCourses = async () => {
    try {
      const token = localStorage.getItem('licea_access_token');
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      const response = await axios.get(`${baseURL}/courses/my/courses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyCourses(response.data.data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('licea_access_token');
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      await axios.post(`${baseURL}/schedules`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('¡Horario creado exitosamente!');
      setShowCreateModal(false);
      setFormData({
        course_id: '',
        day_of_week: 'monday',
        start_time: '08:00',
        end_time: '10:00',
        room: '',
        location: ''
      });
      fetchSchedules();
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Error al crear el horario');
    }
  };

  const handleDeleteSchedule = async (scheduleId: number) => {
    if (!window.confirm('¿Estás seguro de eliminar este horario?')) return;
    
    try {
      const token = localStorage.getItem('licea_access_token');
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      await axios.delete(`${baseURL}/schedules/${scheduleId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Horario eliminado');
      fetchSchedules();
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Error al eliminar');
    }
  };

  const getSchedulesForDay = (day: string) => {
    return schedules
      .filter(s => s.day_of_week === day)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cronograma</h1>
          <p className="text-gray-600">
            {user?.role === 'student' ? 'Horario de tus clases' :
             user?.role === 'instructor' ? 'Gestiona los horarios de tus cursos' :
             'Vista general de todos los horarios'}
          </p>
        </div>
        {user?.role === 'instructor' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <span>➕</span>
            <span>Agendar Clase</span>
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Calendario semanal */}
      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {DAYS.map(day => (
                <th
                  key={day.key}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {day.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            <tr>
              {DAYS.map(day => (
                <td key={day.key} className="px-4 py-4 align-top">
                  <div className="space-y-2">
                    {getSchedulesForDay(day.key).map((schedule) => (
                      <div
                        key={schedule.id}
                        className="p-3 bg-primary-50 border-l-4 border-primary-600 rounded hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-semibold text-sm text-primary-900">
                            {schedule.course_code}
                          </p>
                          {user?.role === 'instructor' && (
                            <button
                              onClick={() => handleDeleteSchedule(schedule.id)}
                              className="text-red-500 hover:text-red-700 text-xs"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mb-1">
                          {schedule.course_title}
                        </p>
                        <p className="text-xs font-medium text-gray-900">
                          🕐 {schedule.start_time} - {schedule.end_time}
                        </p>
                        {schedule.room && (
                          <p className="text-xs text-gray-600">
                            📍 {schedule.room}
                          </p>
                        )}
                        {schedule.location && (
                          <p className="text-xs text-gray-500">
                            {schedule.location}
                          </p>
                        )}
                      </div>
                    ))}
                    {getSchedulesForDay(day.key).length === 0 && (
                      <p className="text-xs text-gray-400 italic">Sin clases</p>
                    )}
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {schedules.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-gray-500 text-lg">No hay clases agendadas</p>
        </div>
      )}

      {/* Modal para crear horario */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Agendar Clase</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <form onSubmit={handleCreateSchedule} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Curso *
                  </label>
                  <select
                    required
                    value={formData.course_id}
                    onChange={(e) => setFormData({...formData, course_id: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">Selecciona un curso</option>
                    {myCourses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.code} - {course.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Día *
                  </label>
                  <select
                    required
                    value={formData.day_of_week}
                    onChange={(e) => setFormData({...formData, day_of_week: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    {DAYS.map(day => (
                      <option key={day.key} value={day.key}>{day.label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hora Inicio *
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.start_time}
                      onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hora Fin *
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.end_time}
                      onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Aula/Salón
                  </label>
                  <input
                    type="text"
                    value={formData.room}
                    onChange={(e) => setFormData({...formData, room: e.target.value})}
                    placeholder="Ej: Sala 101"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ubicación
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    placeholder="Ej: Edificio A, Piso 2"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                  >
                    Crear Horario
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedule;
