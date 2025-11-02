import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const ProfileSettings: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bio: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: (user as any).phone || '',
        bio: (user as any).bio || ''
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('licea_access_token');
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      
      await axios.put(
        `${baseURL}/users/profile`,
        {
          name: formData.name,
          phone: formData.phone,
          bio: formData.bio
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('¡Perfil actualizado exitosamente! 🎉');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al actualizar el perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">⚙️ Configuración de Perfil</h1>
        <p className="text-gray-600">Personaliza tu información y mantén tu perfil actualizado</p>
      </div>

      {/* Alertas */}
      {success && (
        <div className="mb-6 bg-green-50 border-l-4 border-green-400 p-4 rounded-lg animate-fade-in">
          <div className="flex items-center">
            <span className="text-2xl mr-3">✅</span>
            <p className="text-green-800 font-medium">{success}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
          <div className="flex items-center">
            <span className="text-2xl mr-3">❌</span>
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Card principal */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Avatar section */}
        <div className="bg-gradient-to-r from-primary-500 to-accent-500 px-8 py-12 text-center">
          <div className="inline-block">
            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center text-6xl font-bold text-primary-600 shadow-2xl border-4 border-white">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
          </div>
          <h2 className="mt-4 text-2xl font-bold text-white">{user?.name}</h2>
          <p className="text-primary-100">{user?.email}</p>
          <div className="mt-3 inline-block px-4 py-1 bg-white/20 rounded-full text-white text-sm font-medium">
            {user?.role === 'student' ? '🎓 Estudiante' : 
             user?.role === 'instructor' ? '👨‍🏫 Instructor' : '👑 Administrador'}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-8 space-y-6">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              👤 Nombre Completo
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary-200 focus:border-primary-500 transition-all"
              placeholder="Ej: Juan Pérez"
              required
            />
          </div>

          {/* Email (readonly) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📧 Correo Electrónico
            </label>
            <input
              type="email"
              value={formData.email}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-600 cursor-not-allowed"
              disabled
            />
            <p className="mt-1 text-xs text-gray-500">
              💡 El correo no puede ser modificado
            </p>
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📱 Teléfono (opcional)
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary-200 focus:border-primary-500 transition-all"
              placeholder="Ej: +57 300 123 4567"
            />
          </div>

          {/* Biografía */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              ✍️ Biografía (opcional)
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary-200 focus:border-primary-500 transition-all resize-none"
              placeholder="Cuéntanos un poco sobre ti... 🌟"
              maxLength={1000}
            />
            <p className="mt-1 text-xs text-gray-500 text-right">
              {formData.bio.length}/1000 caracteres
            </p>
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white font-semibold rounded-xl hover:from-primary-600 hover:to-accent-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <span>💾</span>
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
            <span className="mr-2">🔒</span> Seguridad
          </h3>
          <p className="text-sm text-blue-800">
            Tu información está protegida y solo será visible para ti y los administradores.
          </p>
        </div>

        <div className="bg-purple-50 border-l-4 border-purple-400 p-6 rounded-lg">
          <h3 className="font-semibold text-purple-900 mb-2 flex items-center">
            <span className="mr-2">💡</span> Consejo
          </h3>
          <p className="text-sm text-purple-800">
            Mantén tu perfil actualizado para que tus compañeros e instructores puedan contactarte fácilmente.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
