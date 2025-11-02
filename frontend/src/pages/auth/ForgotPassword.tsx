import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import axios from 'axios';

interface ForgotPasswordFormData {
  email: string;
}

const ForgotPassword: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>();

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError('');

    try {
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      const response = await axios.post(`${baseURL}/auth/forgot-password-simple`, data);
      
      // Redirigir automáticamente con el email
      window.location.href = `/reset-password?email=${encodeURIComponent(data.email)}`;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Correo electrónico no encontrado');
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
            ¿Olvidaste tu contraseña?
          </h2>
          <p className="text-gray-600">
            No te preocupes, te enviaremos instrucciones para restablecerla
          </p>
        </div>

        {/* Formulario */}
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

          <div className="pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-105 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <span>📨</span>
                  <span>Enviar Instrucciones</span>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="text-center space-y-2">
          <Link 
            to="/login" 
            className="inline-flex items-center text-sm text-gray-600 hover:text-primary-600 font-medium transition-colors"
          >
            <span className="mr-2">←</span> Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
