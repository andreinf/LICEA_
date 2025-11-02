import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Student {
  id: number;
  name: string;
  email: string;
  institution_id: number;
  institution_name?: string;
  institution_code?: string;
  courses: string;
}

const StudentsList: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('licea_access_token');
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      const response = await axios.get(`${baseURL}/attendance/students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(response.data.data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      alert('Error al cargar estudiantes');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(search.toLowerCase()) ||
    student.email.toLowerCase().includes(search.toLowerCase()) ||
    student.courses.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">👨‍🎓 Mis Estudiantes</h1>
        <p className="text-gray-600 mt-2">Lista completa de estudiantes inscritos en tus cursos</p>
      </div>

      {/* Search and Stats */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🔍 Buscar Estudiante
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nombre, email o curso..."
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="text-center p-4 bg-primary-50 rounded-lg">
            <p className="text-4xl font-bold text-primary-600">{students.length}</p>
            <p className="text-sm text-gray-600">Total Estudiantes</p>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-primary-500 to-accent-500 text-white">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold">#</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Nombre</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Email</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Institución</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Cursos Inscritos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    {search ? 'No se encontraron estudiantes con ese criterio' : 'No hay estudiantes inscritos aún'}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, index) => (
                  <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-600 font-medium">{index + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="font-medium text-gray-900">{student.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{student.email}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          {student.institution_name || 'N/A'}
                        </div>
                        {student.institution_code && (
                          <div className="text-gray-500 text-xs">
                            {student.institution_code}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-700">
                        {student.courses}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Card */}
      {students.length > 0 && (
        <div className="bg-gradient-to-r from-primary-50 to-accent-50 rounded-xl p-6 border-2 border-primary-200">
          <h3 className="text-lg font-bold text-gray-900 mb-2">📊 Resumen</h3>
          <p className="text-gray-700">
            Tienes <span className="font-bold text-primary-600">{students.length}</span> estudiante{students.length !== 1 ? 's' : ''} inscrito{students.length !== 1 ? 's' : ''} en tus cursos.
          </p>
          {search && (
            <p className="text-gray-600 mt-2 text-sm">
              Mostrando {filteredStudents.length} resultado{filteredStudents.length !== 1 ? 's' : ''} de la búsqueda.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentsList;
