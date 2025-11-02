import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

interface Course {
  id: number;
  name: string;
  description?: string;
  code: string;
  instructor_name?: string;
  instructor_email?: string;
  current_students?: number;
  max_students: number;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  category?: string;
  level?: string;
}

const CoursesPage: React.FC = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    code: '',
    category: '',
    level: 'beginner',
    max_students: 30,
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('licea_access_token');
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      
      // Estudiantes e instructores ven sus cursos
      const endpoint = `${baseURL}/courses/my/courses`;
      
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Cursos obtenidos:', response.data.data);
      setCourses(response.data.data || []);
    } catch (error) {
      setError('Error al cargar los cursos');
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('licea_access_token');
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      await axios.post(`${baseURL}/courses`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setShowCreateModal(false);
      setFormData({
        name: '',
        description: '',
        code: '',
        category: '',
        level: 'beginner',
        max_students: 30,
        start_date: '',
        end_date: ''
      });
      fetchCourses();
    } catch (error) {
      console.error('Error creating course:', error);
      alert('Error al crear el curso');
    }
  };

  const handleEnrollCourse = async (courseId: number) => {
    try {
      const token = localStorage.getItem('licea_access_token');
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      await axios.post(`${baseURL}/courses/${courseId}/enroll`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('¡Inscripción exitosa!');
      fetchCourses();
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Error al inscribirse');
    }
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('licea_access_token');
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      const response = await axios.post(`${baseURL}/courses/enroll-by-code`, 
        { code: joinCode },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      alert(response.data.message || '¡Te has unido al curso!');
      setShowJoinModal(false);
      setJoinCode('');
      fetchCourses();
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Código inválido');
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Cursos</h1>
          <p className="text-gray-600">
            {user?.role === 'student' ? 'Mis cursos inscritos' :
             user?.role === 'instructor' ? 'Cursos que imparto' :
             'Gestión de todos los cursos'}
          </p>
        </div>
        <div className="flex gap-2">
          {user?.role === 'student' && (
            <button 
              onClick={() => setShowJoinModal(true)}
              className="btn-secondary flex items-center space-x-2"
            >
              <span>🔑</span>
              <span>Unirse con Código</span>
            </button>
          )}
          {(user?.role === 'instructor' || user?.role === 'admin') && (
            <button 
              onClick={() => setShowCreateModal(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <span>➥</span>
              <span>Nuevo Curso</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Vista de tarjetas para cursos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => (
          <div key={course.id} className="card hover:shadow-lg transition-shadow">
            <div className="card-header">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {course.name}
                  </h3>
                  <p className="text-sm text-gray-500">{course.code}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  course.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {course.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
            <div className="card-body">
              {course.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {course.description}
                </p>
              )}
              
              <div className="space-y-2 text-sm">
                {course.instructor_name && (
                  <div className="flex items-center text-gray-600">
                    <span className="mr-2">👨‍🏫</span>
                    <span>{course.instructor_name}</span>
                  </div>
                )}
                
                <div className="flex items-center text-gray-600">
                  <span className="mr-2">👥</span>
                  <span>{course.current_students || 0} / {course.max_students} estudiantes</span>
                </div>
                
                {course.level && (
                  <div className="flex items-center text-gray-600">
                    <span className="mr-2">📊</span>
                    <span className="capitalize">{course.level}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t flex justify-between">
                <button 
                  onClick={() => setSelectedCourse(course)}
                  className="text-primary-600 hover:text-primary-800 font-medium text-sm"
                >
                  Ver detalles
                </button>
                {user?.role === 'student' && (
                  <button 
                    onClick={() => handleEnrollCourse(course.id)}
                    className="text-accent-600 hover:text-accent-800 font-medium text-sm"
                  >
                    Inscribirse
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {courses.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <p className="text-gray-500 text-lg">No hay cursos disponibles</p>
        </div>
      )}

      {/* Modal para crear curso */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Crear Nuevo Curso</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <form onSubmit={handleCreateCourse} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Curso *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Categoría
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nivel
                    </label>
                    <select
                      value={formData.level}
                      onChange={(e) => setFormData({...formData, level: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="beginner">Principiante</option>
                      <option value="intermediate">Intermedio</option>
                      <option value="advanced">Avanzado</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Máximo de Estudiantes
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.max_students}
                    onChange={(e) => setFormData({...formData, max_students: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de Inicio
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de Fin
                    </label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
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
                    Crear Curso
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalles del curso */}
      {selectedCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedCourse.name}</h2>
                  <p className="text-gray-600">{selectedCourse.code}</p>
                </div>
                <button
                  onClick={() => setSelectedCourse(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                {selectedCourse.description && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Descripción</h3>
                    <p className="mt-1 text-gray-900">{selectedCourse.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {selectedCourse.instructor_name && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Instructor</h3>
                      <p className="mt-1 text-gray-900">{selectedCourse.instructor_name}</p>
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Estudiantes</h3>
                    <p className="mt-1 text-gray-900">
                      {selectedCourse.current_students || 0} / {selectedCourse.max_students}
                    </p>
                  </div>

                  {selectedCourse.level && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Nivel</h3>
                      <p className="mt-1 text-gray-900 capitalize">{selectedCourse.level}</p>
                    </div>
                  )}

                  {selectedCourse.category && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Categoría</h3>
                      <p className="mt-1 text-gray-900">{selectedCourse.category}</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={() => setSelectedCourse(null)}
                    className="btn-secondary"
                  >
                    Cerrar
                  </button>
                  {user?.role === 'student' && (
                    <button
                      onClick={() => {
                        handleEnrollCourse(selectedCourse.id);
                        setSelectedCourse(null);
                      }}
                      className="btn-primary"
                    >
                      Inscribirse
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para unirse con código */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Unirse a un Curso</h2>
                <button
                  onClick={() => setShowJoinModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <form onSubmit={handleJoinByCode} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código del Curso
                  </label>
                  <input
                    type="text"
                    required
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="Ej: PROG101"
                    className="w-full px-3 py-2 border rounded-md text-lg font-mono"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Ingresa el código del curso que te proporcionó tu instructor
                  </p>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowJoinModal(false)}
                    className="btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                  >
                    Unirse al Curso
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

export default CoursesPage;
