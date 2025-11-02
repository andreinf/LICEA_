import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

interface Grade {
  submission_id: number;
  task_id: number;
  task_title: string;
  task_description: string;
  course_id: number;
  course_name: string;
  course_code: string;
  grade: number;
  max_grade: number;
  feedback: string | null;
  graded_at: string;
  due_date: string;
  submitted_at: string;
}

interface GroupedGrades {
  [courseName: string]: Grade[];
}

const Grades: React.FC = () => {
  const { user } = useAuth();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [groupedGrades, setGroupedGrades] = useState<GroupedGrades>({});
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalGrades: 0,
    averageGrade: 0,
    highestGrade: 0,
    lowestGrade: 0,
  });

  useEffect(() => {
    fetchGrades();
  }, []);

  const fetchGrades = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('licea_access_token');
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      
      // Obtener todas las tareas del estudiante
      const tasksRes = await axios.get(`${baseURL}/tasks`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const tasks = tasksRes.data.data || [];
      
      // Filtrar solo las tareas con calificaciones
      const gradedTasks: Grade[] = tasks
        .filter((task: any) => task.my_submission && task.my_submission.grade !== null && task.my_submission.grade !== undefined)
        .map((task: any) => ({
          submission_id: task.my_submission.id,
          task_id: task.id,
          task_title: task.title,
          task_description: task.description,
          course_id: task.course_id,
          course_name: task.course_name,
          course_code: task.course_code,
          grade: task.my_submission.grade,
          max_grade: task.max_grade,
          feedback: task.my_submission.feedback,
          graded_at: task.my_submission.graded_at || task.my_submission.submitted_at,
          due_date: task.due_date,
          submitted_at: task.my_submission.submitted_at,
        }));

      // Agrupar por curso
      const grouped: GroupedGrades = {};
      gradedTasks.forEach((grade) => {
        const key = `${grade.course_code} - ${grade.course_name}`;
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(grade);
      });

      // Calcular estadísticas
      if (gradedTasks.length > 0) {
        const totalGrades = gradedTasks.length;
        const averageGrade = gradedTasks.reduce((sum, g) => sum + g.grade, 0) / totalGrades;
        const highestGrade = Math.max(...gradedTasks.map(g => g.grade));
        const lowestGrade = Math.min(...gradedTasks.map(g => g.grade));

        setStats({ totalGrades, averageGrade, highestGrade, lowestGrade });
      }

      setGrades(gradedTasks);
      setGroupedGrades(grouped);
    } catch (error) {
      console.error('Error fetching grades:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (grade: number, maxGrade: number) => {
    const percentage = (grade / maxGrade) * 100;
    if (percentage >= 90) return 'text-green-600 bg-green-50';
    if (percentage >= 80) return 'text-blue-600 bg-blue-50';
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-50';
    if (percentage >= 60) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getGradeEmoji = (grade: number, maxGrade: number) => {
    const percentage = (grade / maxGrade) * 100;
    if (percentage >= 90) return '🌟';
    if (percentage >= 80) return '😊';
    if (percentage >= 70) return '👍';
    if (percentage >= 60) return '😐';
    return '📚';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (grades.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Mis Calificaciones</h1>
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No tienes calificaciones aún
          </h3>
          <p className="text-gray-600">
            Tus calificaciones aparecerán aquí cuando los instructores evalúen tus tareas
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis Calificaciones</h1>
        <p className="text-gray-600">Historial completo de tus evaluaciones</p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-gray-600 mb-1">Total Calificaciones</p>
          <p className="text-2xl font-bold text-primary-600">{stats.totalGrades}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600 mb-1">Promedio General</p>
          <p className="text-2xl font-bold text-blue-600">
            {stats.averageGrade.toFixed(1)}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600 mb-1">Calificación Más Alta</p>
          <p className="text-2xl font-bold text-green-600">{stats.highestGrade}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600 mb-1">Calificación Más Baja</p>
          <p className="text-2xl font-bold text-orange-600">{stats.lowestGrade}</p>
        </div>
      </div>

      {/* Calificaciones agrupadas por curso */}
      <div className="space-y-6">
        {Object.entries(groupedGrades).map(([courseName, courseGrades]) => {
          const courseAvg = courseGrades.reduce((sum, g) => sum + g.grade, 0) / courseGrades.length;
          
          return (
            <div key={courseName} className="card">
              <div className="flex justify-between items-center mb-4 pb-4 border-b">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{courseName}</h3>
                  <p className="text-sm text-gray-600">{courseGrades.length} tareas calificadas</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Promedio del Curso</p>
                  <p className="text-2xl font-bold text-primary-600">{courseAvg.toFixed(1)}</p>
                </div>
              </div>

              <div className="space-y-3">
                {courseGrades.map((grade) => (
                  <div
                    key={grade.submission_id}
                    className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-1">
                          {getGradeEmoji(grade.grade, grade.max_grade)} {grade.task_title}
                        </h4>
                        <p className="text-sm text-gray-600">{grade.task_description}</p>
                      </div>
                      <div className={`px-4 py-2 rounded-lg font-bold text-xl ${getGradeColor(grade.grade, grade.max_grade)}`}>
                        {grade.grade}/{grade.max_grade}
                      </div>
                    </div>

                    {grade.feedback && (
                      <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                        <p className="text-sm font-medium text-blue-900 mb-1">
                          💬 Retroalimentación del Instructor:
                        </p>
                        <p className="text-sm text-blue-800">{grade.feedback}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                      <span>📅 Entregado: {new Date(grade.submitted_at).toLocaleDateString()}</span>
                      <span>✅ Calificado: {new Date(grade.graded_at).toLocaleDateString()}</span>
                      <span>
                        📊 Desempeño: {((grade.grade / grade.max_grade) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Grades;
