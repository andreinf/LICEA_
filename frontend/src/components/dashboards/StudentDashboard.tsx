import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import axios from 'axios';

interface StudentStats {
  enrolledCourses: number;
  pendingTasks: number;
  completedTasks: number;
  averageGrade: number;
  myCourses: Array<{
    id: number;
    name: string;
    code: string;
    instructor_name: string;
  }>;
  upcomingTasks: Array<{
    id: number;
    title: string;
    course_name: string;
    due_date: string;
    max_grade: number;
  }>;
  recentGrades: Array<{
    task_title: string;
    course_name: string;
    grade: number;
    max_grade: number;
    feedback: string;
  }>;
  upcomingClasses: Array<{
    course_code: string;
    course_title: string;
    day_of_week: string;
    start_time: string;
    end_time: string;
    room?: string;
  }>;
}

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<StudentStats>({
    enrolledCourses: 0,
    pendingTasks: 0,
    completedTasks: 0,
    averageGrade: 0,
    myCourses: [],
    upcomingTasks: [],
    recentGrades: [],
    upcomingClasses: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudentData();
  }, []);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('licea_access_token');
      const headers = { Authorization: `Bearer ${token}` };
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

      // Obtener cursos inscritos
      const coursesRes = await axios.get(`${baseURL}/courses/my/courses`, { headers });
      const courses = coursesRes.data.data || [];

      // Obtener tareas
      const tasksRes = await axios.get(`${baseURL}/tasks`, { headers });
      const tasks = tasksRes.data.data || [];

      // Obtener horarios
      const schedulesRes = await axios.get(`${baseURL}/schedules/my`, { headers });
      const schedules = schedulesRes.data.data || [];

      // Calcular tareas pendientes (sin entregar o vencidas)
      const now = new Date();
      const pendingTasks = tasks.filter((task: any) => 
        !task.my_submission && new Date(task.due_date) > now
      ).length;

      // Calcular tareas completadas (entregadas)
      const completedTasks = tasks.filter((task: any) => task.my_submission).length;

      // Calcular promedio de calificaciones
      const gradedTasks = tasks.filter((task: any) => 
        task.my_submission && task.my_submission.grade !== null && task.my_submission.grade !== undefined
      );
      const averageGrade = gradedTasks.length > 0
        ? gradedTasks.reduce((sum: number, task: any) => sum + task.my_submission.grade, 0) / gradedTasks.length
        : 0;

      // Próximas tareas (5 más cercanas)
      const upcomingTasks = tasks
        .filter((task: any) => !task.my_submission && new Date(task.due_date) > now)
        .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
        .slice(0, 5);

      // Calificaciones recientes (últimas 5)
      const recentGrades = gradedTasks
        .slice(-5)
        .reverse()
        .map((task: any) => ({
          task_title: task.title,
          course_name: task.course_name,
          grade: task.my_submission.grade,
          max_grade: task.max_grade,
          feedback: task.my_submission.feedback || ''
        }));

      // Próximas clases
      const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const upcomingClasses = schedules
        .sort((a: any, b: any) => {
          const dayA = daysOrder.indexOf(a.day_of_week);
          const dayB = daysOrder.indexOf(b.day_of_week);
          if (dayA !== dayB) return dayA - dayB;
          return a.start_time.localeCompare(b.start_time);
        })
        .slice(0, 5);

      setStats({
        enrolledCourses: courses.length,
        pendingTasks,
        completedTasks,
        averageGrade,
        myCourses: courses.slice(0, 4),
        upcomingTasks,
        recentGrades,
        upcomingClasses
      });
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDayLabel = (day: string) => {
    const labels: { [key: string]: string } = {
      'monday': 'Lunes', 'tuesday': 'Martes', 'wednesday': 'Miércoles',
      'thursday': 'Jueves', 'friday': 'Viernes', 'saturday': 'Sábado', 'sunday': 'Domingo'
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
          Panel de Estudiante - Tu progreso académico
        </p>
      </div>

      {/* Estadísticas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Cursos Inscritos</p>
              <p className="text-3xl font-bold text-primary-600 mt-2">
                {stats.enrolledCourses}
              </p>
            </div>
            <div className="p-3 bg-primary-100 rounded-full">
              <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>
          <Link to="/dashboard/courses" className="text-sm text-primary-600 hover:underline mt-3 block">
            Ver cursos →
          </Link>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tareas Pendientes</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">
                {stats.pendingTasks}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <Link to="/dashboard/tasks" className="text-sm text-orange-600 hover:underline mt-3 block">
            Ver tareas →
          </Link>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tareas Completadas</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {stats.completedTasks}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Entregas realizadas
          </p>
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            De tareas calificadas
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mis Cursos */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Mis Cursos</h2>
          {stats.myCourses.length > 0 ? (
            <div className="space-y-3">
              {stats.myCourses.map((course) => (
                <div key={course.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">{course.name}</h3>
                      <p className="text-sm text-gray-600">{course.code}</p>
                      {course.instructor_name && (
                        <p className="text-xs text-gray-500">👨‍🏫 {course.instructor_name}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No estás inscrito en ningún curso</p>
              <Link to="/dashboard/courses" className="text-primary-600 hover:underline text-sm mt-2 block">
                Buscar cursos
              </Link>
            </div>
          )}
        </div>

        {/* Próximas Clases */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Próximas Clases</h2>
          {stats.upcomingClasses.length > 0 ? (
            <div className="space-y-3">
              {stats.upcomingClasses.map((schedule, index) => (
                <div key={index} className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-600">
                  <p className="font-medium text-gray-900">{schedule.course_code}</p>
                  <p className="text-sm text-gray-600">{schedule.course_title}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {getDayLabel(schedule.day_of_week)} • {schedule.start_time} - {schedule.end_time}
                  </p>
                  {schedule.room && (
                    <p className="text-xs text-gray-500">📍 {schedule.room}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No hay clases agendadas</p>
              <Link to="/dashboard/schedule" className="text-primary-600 hover:underline text-sm mt-2 block">
                Ver cronograma
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Tareas Próximas */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Tareas Próximas</h2>
          <Link to="/dashboard/tasks" className="text-sm text-primary-600 hover:underline">
            Ver todas →
          </Link>
        </div>
        {stats.upcomingTasks.length > 0 ? (
          <div className="space-y-3">
            {stats.upcomingTasks.map((task) => (
              <div key={task.id} className="p-4 bg-yellow-50 border-l-4 border-yellow-600 rounded">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{task.title}</h3>
                    <p className="text-sm text-gray-600">{task.course_name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      📅 Vence: {new Date(task.due_date).toLocaleDateString()} - 🎯 {task.max_grade} puntos
                    </p>
                  </div>
                  <Link 
                    to="/dashboard/tasks" 
                    className="btn-primary text-sm ml-4"
                  >
                    Entregar
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No tienes tareas pendientes</p>
            <p className="text-sm mt-2">¡Excelente trabajo! 🎉</p>
          </div>
        )}
      </div>

      {/* Calificaciones Recientes */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Calificaciones Recientes</h2>
          <Link to="/dashboard/grades" className="text-sm text-primary-600 hover:underline">
            Ver todas →
          </Link>
        </div>
        {stats.recentGrades.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarea</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Curso</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Calificación</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Retroalimentación</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.recentGrades.map((grade, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{grade.task_title}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{grade.course_name}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`font-bold ${
                        grade.grade >= grade.max_grade * 0.9 ? 'text-green-600' :
                        grade.grade >= grade.max_grade * 0.7 ? 'text-blue-600' :
                        grade.grade >= grade.max_grade * 0.6 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {grade.grade}/{grade.max_grade}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {grade.feedback || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No tienes calificaciones aún</p>
            <p className="text-sm mt-2">Las calificaciones aparecerán aquí cuando tus tareas sean evaluadas</p>
          </div>
        )}
      </div>

      {/* Accesos Rápidos */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Accesos Rápidos</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/dashboard/courses" className="p-4 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors text-center">
            <div className="text-primary-600 text-2xl mb-2">📚</div>
            <p className="text-sm font-medium text-gray-900">Mis Cursos</p>
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

export default StudentDashboard;
