import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { LoginFormData } from '../../types';

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  const from = location.state?.from?.pathname || '/dashboard';

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError('');

    try {
      await login(data.email, data.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-25 to-accent-25 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo y encabezado */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center shadow-2xl overflow-hidden">
                <img src="/images/logo-gato.png" alt="LICEA Logo" className="w-12 h-12 object-contain" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-accent-400 rounded-full flex items-center justify-center text-xs text-white font-bold shadow-lg animate-pulse">
                L
              </div>
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-700 to-accent-600 bg-clip-text text-transparent">
                LICEA
              </h1>
              <p className="text-sm text-gray-600 font-medium">Sistema Educativo Integral</p>
            </div>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
            Bienvenido de nuevo
          </h2>
          <p className="text-gray-600">
            ¿No tienes cuenta?{' '}
            <Link
              to="/register"
              className="font-semibold text-primary-600 hover:text-primary-500 transition-colors"
            >
              Regístrate aquí
            </Link>
          </p>
        </div>

        {/* Formulario con tarjeta moderna */}
        <form className="mt-8 space-y-6 bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-primary-200/50 p-8" onSubmit={handleSubmit(onSubmit)}>
          {error && (
            <div className="rounded-2xl bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex items-center">
                <span className="text-2xl mr-3">⚠️</span>
                <div className="text-sm text-red-700 font-medium">{error}</div>
              </div>
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                📧 Correo Electrónico
              </label>
              <input
                {...register('email', {
                  required: 'El correo electrónico es requerido',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Formato de correo electrónico inválido',
                  },
                })}
                type="email"
                className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-primary-200 ${
                  errors.email 
                    ? 'border-red-300 bg-red-50 focus:border-red-500' 
                    : 'border-gray-300 bg-white hover:border-primary-300 focus:border-primary-500'
                }`}
                placeholder="tu@email.com"
              />
              {errors.email && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <span className="mr-1">❌</span>{errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                🔒 Contraseña
              </label>
              <input
                {...register('password', {
                  required: 'La contraseña es requerida',
                  minLength: {
                    value: 6,
                    message: 'La contraseña debe tener al menos 6 caracteres',
                  },
                })}
                type="password"
                className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-primary-200 ${
                  errors.password 
                    ? 'border-red-300 bg-red-50 focus:border-red-500' 
                    : 'border-gray-300 bg-white hover:border-primary-300 focus:border-primary-500'
                }`}
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <span className="mr-1">❌</span>{errors.password.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center">
              <input
                {...register('rememberMe')}
                id="rememberMe"
                type="checkbox"
                className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded-lg transition-all"
              />
              <label htmlFor="rememberMe" className="ml-3 block text-sm font-medium text-gray-700">
                Recordarme
              </label>
            </div>

            <div className="text-sm">
              <Link
                to="/forgot-password"
                className="font-semibold text-primary-600 hover:text-primary-500 transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-105 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Ingresando...</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Iniciar Sesión</span>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="text-center">
          <Link 
            to="/" 
            className="inline-flex items-center text-sm text-gray-600 hover:text-primary-600 font-medium transition-colors"
          >
            <span className="mr-2">←</span> Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
