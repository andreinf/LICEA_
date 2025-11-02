import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import axios from 'axios';

interface DashboardStats {
  totalCourses: number;
  totalStudents: number;
  pendingGrades: number;
  averageGrade: number;
  recentTasks: Array<{
    id: number;
    title: string;
    course_name: string;
    due_date: string;
    submitted_count: number;
  }>;
  activeCourses: Array<{
    id: number;
    name: string;
    code: string;
    current_students: number;
    max_students: number;
  }>;
  upcomingClasses: Array<{
    id: number;
    course_code: string;
    course_title: string;
    day_of_week: string;
    start_time: string;
    end_time: string;
    room?: string;
  }>;
}

const InstructorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalCourses: 0,
    totalStudents: 0,
    pendingGrades: 0,
    averageGrade: 0,
    recentTasks: [],
    activeCourses: [],
    upcomingClasses: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('licea_access_token');
      const headers = { Authorization: `Bearer ${token}` };
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

      // Obtener cursos
      const coursesRes = await axios.get(`${baseURL}/courses/my/courses`, { headers });
      const courses = coursesRes.data.data || [];

      // Obtener tareas
      const tasksRes = await axios.get(`${baseURL}/tasks`, { headers });
      const tasks = tasksRes.data.data || [];

      // Obtener horarios
      const schedulesRes = await axios.get(`${baseURL}/schedules/my`, { headers });
      const schedules = schedulesRes.data.data || [];

      // Calcular total de estudiantes (sumando los estudiantes de cada curso)
      const totalStudents = courses.reduce((sum: number, course: any) => 
        sum + (course.current_students || 0), 0
      );

      // Calcular tareas pendientes de calificar
      const pendingGrades = tasks.reduce((sum: number, task: any) => {
        const pending = (task.submitted_count || 0) - (task.graded_count || 0);
        return sum + (pending > 0 ? pending : 0);
      }, 0);

      // Calcular promedio general (de las tareas ya calificadas)
      const gradesSum = tasks.reduce((sum: number, task: any) => 
        sum + (task.average_grade || 0), 0
      );
      const averageGrade = tasks.length > 0 ? gradesSum / tasks.length : 0;

      // Obtener próximas clases (día actual y siguientes)
      const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
      const todayKey = daysOrder[(today + 6) % 7]; // Ajustar para que Monday = 0
      
      const upcomingClasses = schedules
        .filter((schedule: any) => {
          const scheduleDay = daysOrder.indexOf(schedule.day_of_week);
          return scheduleDay >= 0;
        })
        .sort((a: any, b: any) => {
          const dayA = daysOrder.indexOf(a.day_of_week);
          const dayB = daysOrder.indexOf(b.day_of_week);
          if (dayA !== dayB) return dayA - dayB;
          return a.start_time.localeCompare(b.start_time);
        })
        .slice(0, 5);

      setStats({
        totalCourses: courses.length,
        totalStudents,
        pendingGrades,
        averageGrade,
        recentTasks: tasks.slice(0, 5),
        activeCourses: courses.slice(0, 4),
        upcomingClasses
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDayLabel = (day: string) => {
    const labels: { [key: string]: string } = {
      'monday': 'Lunes',
      'tuesday': 'Martes',
      'wednesday': 'Miércoles',
      'thursday': 'Jueves',
      'friday': 'Viernes',
      'saturday': 'Sábado',
      'sunday': 'Domingo'
    };
    return labels[day] || day;
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
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Bienvenido, {user?.name}
        </h1>
        <p className="text-gray-600 mt-1">
          Panel de Instructor - Resumen de tus actividades
        </p>
      </div>

      {/* Estadísticas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Cursos Activos</p>
              <p className="text-3xl font-bold text-primary-600 mt-2">
                {stats.totalCourses}
              </p>
            </div>
            <div className="p-3 bg-primary-100 rounded-full">
              <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>
          <Link to="/dashboard/courses" className="text-sm text-primary-600 hover:underline mt-3 block">
            Ver todos →
          </Link>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Estudiantes</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {stats.totalStudents}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            En todos tus cursos
          </p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Por Calificar</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">
                {stats.pendingGrades}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <Link to="/dashboard/tasks" className="text-sm text-orange-600 hover:underline mt-3 block">
            Ir a tareas →
          </Link>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Promedio General</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {stats.averageGrade > 0 ? stats.averageGrade.toFixed(1) : '—'}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            De todas las tareas calificadas
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cursos Activos */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Mis Cursos</h2>
          {stats.activeCourses.length > 0 ? (
            <div className="space-y-3">
              {stats.activeCourses.map((course) => (
                <div key={course.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">{course.name}</h3>
                      <p className="text-sm text-gray-600">{course.code}</p>
                    </div>
                    <span className="text-xs px-2 py-1 bg-primary-100 text-primary-800 rounded-full">
                      {course.current_students}/{course.max_students} estudiantes
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No tienes cursos activos</p>
              <Link to="/dashboard/courses" className="text-primary-600 hover:underline text-sm mt-2 block">
                Crear tu primer curso
              </Link>
            </div>
          )}
        </div>

        {/* Próximas Clases */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Próximas Clases</h2>
          {stats.upcomingClasses.length > 0 ? (
            <div className="space-y-3">
              {stats.upcomingClasses.map((schedule) => (
                <div key={schedule.id} className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-600">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{schedule.course_code}</p>
                      <p className="text-sm text-gray-600">{schedule.course_title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {getDayLabel(schedule.day_of_week)} • {schedule.start_time} - {schedule.end_time}
                      </p>
                      {schedule.room && (
                        <p className="text-xs text-gray-500">📍 {schedule.room}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No hay clases agendadas</p>
              <Link to="/dashboard/schedule" className="text-primary-600 hover:underline text-sm mt-2 block">
                Agendar clases
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Tareas Recientes */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Tareas Recientes</h2>
          <Link to="/dashboard/tasks" className="text-sm text-primary-600 hover:underline">
            Ver todas →
          </Link>
        </div>
        {stats.recentTasks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarea</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Curso</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Límite</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entregas</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.recentTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{task.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{task.course_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(task.due_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                        {task.submitted_count || 0} entregas
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No hay tareas creadas</p>
            <Link to="/dashboard/tasks" className="text-primary-600 hover:underline text-sm mt-2 block">
              Crear tu primera tarea
            </Link>
          </div>
        )}
      </div>

      {/* Accesos Rápidos */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Accesos Rápidos</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/dashboard/courses" className="p-4 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors text-center">
            <div className="text-primary-600 text-2xl mb-2">📚</div>
            <p className="text-sm font-medium text-gray-900">Cursos</p>
          </Link>
          <Link to="/dashboard/tasks" className="p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors text-center">
            <div className="text-orange-600 text-2xl mb-2">📝</div>
            <p className="text-sm font-medium text-gray-900">Tareas</p>
          </Link>
          <Link to="/dashboard/schedule" className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-center">
            <div className="text-blue-600 text-2xl mb-2">📅</div>
            <p className="text-sm font-medium text-gray-900">Cronograma</p>
          </Link>
          <Link to="/dashboard/groups" className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-center">
            <div className="text-green-600 text-2xl mb-2">👥</div>
            <p className="text-sm font-medium text-gray-900">Grupos</p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default InstructorDashboard;
