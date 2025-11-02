import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import axios from 'axios';

interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get('email');
  
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string>('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>();

  const password = watch('password');

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-25 to-accent-25 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-primary-200/50 p-8 text-center">
            <div className="text-6xl mb-6">❌</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Acceso Inválido</h2>
            <p className="text-gray-600 mb-8">
              Por favor, ingresa tu correo electrónico primero.
            </p>
            <Link 
              to="/forgot-password" 
              className="inline-block bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white font-bold py-3 px-8 rounded-full transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-105"
            >
              Recuperar Contraseña
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true);
    setError('');
    setSuccess(false);

    try {
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      await axios.post(`${baseURL}/auth/reset-password-simple`, {
        email,
        password: data.password
      });
      
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al restablecer la contraseña');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-25 to-accent-25 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-primary-200/50 p-8 text-center">
            <div className="text-6xl mb-6">✅</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">¡Contraseña Restablecida!</h2>
            <p className="text-gray-600 mb-6">
              Tu contraseña ha sido actualizada exitosamente.
            </p>
            <p className="text-sm text-gray-500 mb-8">
              Serás redirigido al inicio de sesión en unos segundos...
            </p>
            <Link 
              to="/login" 
              className="inline-block bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white font-bold py-3 px-8 rounded-full transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-105"
            >
              Ir a Iniciar Sesión
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-25 to-accent-25 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center shadow-2xl overflow-hidden">
                <img src="/images/logo-gato.png" alt="LICEA Logo" className="w-12 h-12 object-contain" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-accent-400 rounded-full flex items-center justify-center text-xs text-white font-bold shadow-lg animate-pulse">L</div>
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-700 to-accent-600 bg-clip-text text-transparent">LICEA</h1>
              <p className="text-sm text-gray-600 font-medium">Sistema Educativo Integral</p>
            </div>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Nueva Contraseña</h2>
          <p className="text-gray-600">Ingresa tu nueva contraseña segura</p>
        </div>

        <form className="mt-8 space-y-6 bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-primary-200/50 p-8" onSubmit={handleSubmit(onSubmit)}>
          {error && (
            <div className="rounded-2xl bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex items-center">
                <span className="text-2xl mr-3">⚠️</span>
                <div className="text-sm text-red-700 font-medium">{error}</div>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">🔒 Nueva Contraseña</label>
            <input
              {...register('password', {
                required: 'La contraseña es requerida',
                minLength: { value: 8, message: 'Mínimo 8 caracteres' },
                pattern: { value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, message: 'Debe contener mayúsculas, minúsculas, números y caracteres especiales' },
              })}
              type="password"
              className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-primary-200 ${errors.password ? 'border-red-300 bg-red-50 focus:border-red-500' : 'border-gray-300 bg-white hover:border-primary-300 focus:border-primary-500'}`}
              placeholder="••••••••"
            />
            {errors.password && <p className="mt-2 text-sm text-red-600 flex items-center"><span className="mr-1">❌</span>{errors.password.message}</p>}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">🔒 Confirmar Contraseña</label>
            <input
              {...register('confirmPassword', {
                required: 'Confirma tu contraseña',
                validate: value => value === password || 'Las contraseñas no coinciden',
              })}
              type="password"
              className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-primary-200 ${errors.confirmPassword ? 'border-red-300 bg-red-50 focus:border-red-500' : 'border-gray-300 bg-white hover:border-primary-300 focus:border-primary-500'}`}
              placeholder="••••••••"
            />
            {errors.confirmPassword && <p className="mt-2 text-sm text-red-600 flex items-center"><span className="mr-1">❌</span>{errors.confirmPassword.message}</p>}
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-105 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (<><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div><span>Restableciendo...</span></>) : (<><span>🔐</span><span>Restablecer Contraseña</span></>)}
            </button>
          </div>
        </form>

        <div className="text-center space-y-2">
          <Link to="/login" className="inline-flex items-center text-sm text-gray-600 hover:text-primary-600 font-medium transition-colors">
            <span className="mr-2">←</span> Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
