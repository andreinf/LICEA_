import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Group {
  id: number;
  name: string;
  course_name?: string;
  course_code?: string;
  description?: string;
  max_members: number;
  member_count: number;
  instructor_name?: string;
  members?: Array<{
    id: number;
    name: string;
    email: string;
    member_role: string;
  }>;
}

const Groups: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [createdGroupCode, setCreatedGroupCode] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    max_members: 5,
    course_id: ''
  });
  const [availableCourses, setAvailableCourses] = useState<any[]>([]);

  useEffect(() => {
    fetchGroups();
    if (user?.role === 'student') {
      fetchMyCourses();
      fetchAvailableGroups();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('licea_access_token');
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      const response = await axios.get(`${baseURL}/groups/my/groups`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGroups(response.data.data || []);
    } catch (error) {
      setError('Error al cargar los grupos');
      console.error('Error fetching groups:', error);
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
      setAvailableCourses(response.data.data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchAvailableGroups = async () => {
    try {
      const token = localStorage.getItem('licea_access_token');
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      const response = await axios.get(`${baseURL}/groups`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Filtrar grupos que no sean míos
      const myGroupIds = groups.map(g => g.id);
      const available = (response.data.data || []).filter(
        (g: Group) => !myGroupIds.includes(g.id) && g.member_count < g.max_members
      );
      setAvailableGroups(available);
    } catch (error) {
      console.error('Error fetching available groups:', error);
    }
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('licea_access_token');
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      const response = await axios.post(
        `${baseURL}/groups/join-by-code`,
        { join_code: joinCode },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert(response.data.message || '¡Te has unido al grupo exitosamente!');
      setShowJoinModal(false);
      setJoinCode('');
      fetchGroups();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Código inválido o error al unirse');
    }
  };

  const fetchGroupDetails = async (groupId: number) => {
    try {
      const token = localStorage.getItem('licea_access_token');
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      const response = await axios.get(`${baseURL}/groups/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedGroup(response.data.data);
    } catch (error) {
      console.error('Error fetching group details:', error);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('licea_access_token');
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      const response = await axios.post(`${baseURL}/groups`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Mostrar código de invitación
      setCreatedGroupCode(response.data.data.join_code);
      setFormData({
        name: '',
        description: '',
        max_members: 5,
        course_id: ''
      });
      fetchGroups();
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Error al crear el grupo');
    }
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
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {user?.role === 'student' ? 'Mis Grupos de Estudio' : 'Gestión de Grupos'}
            </h1>
            <p className="mt-2 text-gray-600">
              {user?.role === 'student'
                ? 'Crea y gestiona grupos de estudio con tus compañeros'
                : 'Administra grupos de trabajo para tus cursos'
              }
            </p>
          </div>
          {user?.role === 'student' && (
            <div className="flex space-x-3">
              <button
                onClick={() => setShowJoinModal(true)}
                className="btn-secondary flex items-center space-x-2"
              >
                <span>👥</span>
                <span>Unirse a Grupo</span>
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary flex items-center space-x-2"
              >
                <span>➥</span>
                <span>Crear Grupo</span>
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <div
              key={group.id}
              className="card hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/dashboard/groups/${group.id}`)}
            >
              <div className="card-header">
                <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
                <p className="text-sm text-gray-500">
                  {group.course_code} - {group.course_name}
                </p>
              </div>
              <div className="card-body">
                {group.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {group.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-500">
                    <span className="mr-1">👥</span>
                    <span>{group.member_count} / {group.max_members}</span>
                  </div>
                  {group.instructor_name && (
                    <span className="text-gray-500">👨‍🏫 {group.instructor_name}</span>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full"
                      style={{ width: `${(group.member_count / group.max_members) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {Math.round((group.member_count / group.max_members) * 100)}% ocupado
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {groups.length === 0 && !loading && !error && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-gray-500 text-lg">No hay grupos disponibles</p>
            <p className="text-gray-400 mt-2">
              {user?.role === 'student'
                ? 'Serás asignado a un grupo cuando el instructor lo configure'
                : 'Crea tu primer grupo para organizar a los estudiantes'
              }
            </p>
          </div>
        )}
      </div>

      {/* Modal de detalles del grupo */}
      {selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedGroup.name}</h2>
                  <p className="text-gray-600">
                    {selectedGroup.course_code} - {selectedGroup.course_name}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedGroup(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {selectedGroup.description && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Descripción</h3>
                  <p className="text-gray-900">{selectedGroup.description}</p>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Miembros ({selectedGroup.members?.length || 0})
                </h3>
                <div className="space-y-2">
                  {selectedGroup.members?.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{member.name}</p>
                        <p className="text-sm text-gray-500">{member.email}</p>
                      </div>
                      {member.member_role === 'leader' && (
                        <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                          ⭐ Líder
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => setSelectedGroup(null)}
                  className="btn-secondary"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para crear grupo */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Crear Grupo de Estudio</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Grupo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Ej: Grupo de Programación"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

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
                    {availableCourses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.code} - {course.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={3}
                    placeholder="¿De qué trata este grupo?"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Máximo de Miembros
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="10"
                    value={formData.max_members}
                    onChange={(e) => setFormData({...formData, max_members: parseInt(e.target.value)})}
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
                    Crear Grupo
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal para unirse a grupo con código */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Unirse a un Grupo</h2>
                <button
                  onClick={() => setShowJoinModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <form onSubmit={handleJoinByCode}>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🔑 Código de Invitación
                  </label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="Ejemplo: ABC12345"
                    maxLength={10}
                    className="w-full px-4 py-3 border-2 rounded-lg text-center text-xl font-mono uppercase tracking-wider"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Pide el código al creador del grupo o al instructor
                  </p>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => { setShowJoinModal(false); setJoinCode(''); }}
                    className="btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={joinCode.length < 6}
                  >
                    Unirse
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de éxito al crear grupo */}
      {createdGroupCode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="text-center mb-4">
                <div className="text-6xl mb-4">✅</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Grupo Creado!</h2>
                <p className="text-gray-600">Comparte este código con tus compañeros:</p>
              </div>

              <div className="bg-gradient-to-r from-primary-50 to-accent-50 border-2 border-primary-300 rounded-lg p-6 mb-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">🔑 Código de Invitación</p>
                  <p className="text-4xl font-bold text-primary-600 font-mono tracking-widest">
                    {createdGroupCode}
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  💡 <strong>Consejo:</strong> Copia este código y compártelo por WhatsApp, email o tu plataforma favorita.
                </p>
              </div>

              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(createdGroupCode);
                    alert('Código copiado al portapapeles!');
                  }}
                  className="btn-secondary"
                >
                  📋 Copiar Código
                </button>
                <button
                  onClick={() => { setCreatedGroupCode(''); setShowCreateModal(false); }}
                  className="btn-primary"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Groups;
