import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface DashboardStats {
  totalUsers: number;
  totalInstructors: number;
  totalStudents: number;
  totalCourses: number;
  totalInstitutions: number;
  activeUsers: number;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalInstructors: 0,
    totalStudents: 0,
    totalCourses: 0,
    totalInstitutions: 0,
    activeUsers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('licea_access_token');
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

      // Fetch users
      const usersRes = await axios.get(`${baseURL}/users?limit=1000`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const users = usersRes.data.data || [];
      const totalUsers = users.length;
      const totalInstructors = users.filter((u: any) => u.role === 'instructor').length;
      const totalStudents = users.filter((u: any) => u.role === 'student').length;
      const activeUsers = users.filter((u: any) => u.is_active).length;

      // Fetch courses
      const coursesRes = await axios.get(`${baseURL}/courses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const totalCourses = coursesRes.data.data?.length || 0;

      // Fetch institutions
      const institutionsRes = await axios.get(`${baseURL}/institutions`);
      const totalInstitutions = institutionsRes.data.data?.length || 0;

      setStats({
        totalUsers,
        totalInstructors,
        totalStudents,
        totalCourses,
        totalInstitutions,
        activeUsers,
      });
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Error al cargar datos';
      setError(errorMsg);
      alert(`Error al cargar estadísticas: ${errorMsg}. Por favor, verifica que el servidor esté corriendo y recarga la página.`);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Total Usuarios', value: stats.totalUsers, icon: '👥', color: 'bg-blue-500' },
    { title: 'Estudiantes', value: stats.totalStudents, icon: '🎓', color: 'bg-green-500' },
    { title: 'Instructores', value: stats.totalInstructors, icon: '👨‍🏫', color: 'bg-purple-500' },
    { title: 'Cursos Activos', value: stats.totalCourses, icon: '📚', color: 'bg-orange-500' },
    { title: 'Instituciones', value: stats.totalInstitutions, icon: '🏫', color: 'bg-indigo-500' },
    { title: 'Usuarios Activos', value: stats.activeUsers, icon: '✓', color: 'bg-emerald-500' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6">
        <h2 className="text-xl font-bold text-red-900 mb-2">⚠️ Error al Cargar Datos</h2>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={() => { setError(null); setLoading(true); fetchStats(); }}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">📊 Panel de Administración</h1>
        <p className="text-gray-600 mt-2">Vista general del sistema y estadísticas</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center">
              <div className={`p-4 rounded-xl ${stat.color} shadow-lg`}>
                <span className="text-3xl text-white">{stat.icon}</span>
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">📈 Resumen del Sistema</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">👥 Usuarios</h4>
              <p className="text-sm text-blue-800">
                {stats.activeUsers} de {stats.totalUsers} usuarios están activos ({((stats.activeUsers / stats.totalUsers) * 100).toFixed(1)}%)
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">📚 Cursos</h4>
              <p className="text-sm text-green-800">
                {stats.totalCourses} cursos disponibles en la plataforma
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-semibold text-purple-900 mb-2">🏫 Instituciones</h4>
              <p className="text-sm text-purple-800">
                {stats.totalInstitutions} instituciones registradas
              </p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <h4 className="font-semibold text-orange-900 mb-2">👨‍🏫 Distribución</h4>
              <p className="text-sm text-orange-800">
                {stats.totalInstructors} instructores y {stats.totalStudents} estudiantes
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
