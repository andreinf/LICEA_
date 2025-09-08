import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface Schedule {
  id: number;
  course_id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room: string;
  location: string;
  course_title?: string;
}

const Schedule: React.FC = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayLabels = {
    monday: 'Lunes',
    tuesday: 'Martes', 
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
    sunday: 'Domingo'
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/schedules', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSchedules(data.data || []);
      } else {
        setError('Error al cargar los horarios');
      }
    } catch (error) {
      setError('Error de conexión');
      console.error('Error fetching schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeSlots = () => {
    const slots = [];
    for (let hour = 7; hour <= 21; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      if (hour < 21) slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  };

  const getScheduleForDayAndTime = (day: string, time: string) => {
    return schedules.find(schedule => {
      const scheduleStart = schedule.start_time.substring(0, 5);
      const scheduleEnd = schedule.end_time.substring(0, 5);
      return schedule.day_of_week === day && time >= scheduleStart && time < scheduleEnd;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Cronograma de Clases</h1>
          <p className="mt-2 text-gray-600">
            Visualiza y gestiona los horarios de clases
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Vista de calendario semanal */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="grid grid-cols-8 gap-0">
            {/* Header con los días */}
            <div className="bg-gray-50 p-4 border-b border-r border-gray-200">
              <span className="text-sm font-medium text-gray-500">Hora</span>
            </div>
            {daysOfWeek.map(day => (
              <div key={day} className="bg-gray-50 p-4 border-b border-r border-gray-200 last:border-r-0 text-center">
                <span className="text-sm font-medium text-gray-900">
                  {dayLabels[day as keyof typeof dayLabels]}
                </span>
              </div>
            ))}

            {/* Franjas horarias */}
            {getTimeSlots().map(time => (
              <React.Fragment key={time}>
                {/* Columna de hora */}
                <div className="bg-gray-50 p-2 border-b border-r border-gray-200 text-right">
                  <span className="text-xs font-medium text-gray-500">{time}</span>
                </div>
                
                {/* Celdas para cada día */}
                {daysOfWeek.map(day => {
                  const schedule = getScheduleForDayAndTime(day, time);
                  return (
                    <div 
                      key={`${day}-${time}`} 
                      className="border-b border-r border-gray-200 last:border-r-0 min-h-[40px] p-1"
                    >
                      {schedule && (
                        <div className="bg-primary-100 border-l-4 border-primary-600 rounded p-2 text-xs">
                          <div className="font-medium text-primary-900 truncate">
                            {schedule.course_title || `Curso ${schedule.course_id}`}
                          </div>
                          <div className="text-primary-700 mt-1">
                            {schedule.start_time.substring(0, 5)} - {schedule.end_time.substring(0, 5)}
                          </div>
                          {schedule.room && (
                            <div className="text-primary-600 mt-1">
                              📍 {schedule.room}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Lista de horarios para vista móvil */}
        <div className="mt-8 lg:hidden">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Lista de Horarios</h3>
          <div className="space-y-4">
            {schedules.map(schedule => (
              <div key={schedule.id} className="bg-white p-4 rounded-lg shadow border-l-4 border-primary-600">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {schedule.course_title || `Curso ${schedule.course_id}`}
                    </h4>
                    <p className="text-sm text-gray-600 capitalize">
                      {dayLabels[schedule.day_of_week as keyof typeof dayLabels]}
                    </p>
                    <p className="text-sm text-gray-600">
                      {schedule.start_time.substring(0, 5)} - {schedule.end_time.substring(0, 5)}
                    </p>
                  </div>
                  {schedule.room && (
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Aula</p>
                      <p className="text-sm font-medium text-gray-900">{schedule.room}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {schedules.length === 0 && !loading && !error && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-500 text-lg">No hay horarios disponibles</p>
            <p className="text-gray-400 mt-2">Los horarios aparecerán aquí cuando se configuren</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Schedule;
