import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { RegisterData } from '../../types';
import axios from 'axios';

const Register: React.FC = () => {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [institutions, setInstitutions] = useState<any[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterData & { confirmPassword: string }>();

  const password = watch('password');

  useEffect(() => {
    fetchInstitutions();
  }, []);

  const fetchInstitutions = async () => {
    try {
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      const response = await axios.get(`${baseURL}/institutions`);
      setInstitutions(response.data.data || []);
    } catch (error) {
      console.error('Error fetching institutions:', error);
    }
  };

  const onSubmit = async (data: RegisterData & { confirmPassword: string }) => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
        role: 'student',
        institution_id: parseInt(data.institution_id as any),
        privacyConsent: data.privacyConsent,
        termsAccepted: data.termsAccepted,
      });
      setSuccess('Registration successful! Please check your email to verify your account.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-3xl font-bold text-gray-900">Registration Successful!</h2>
            <p className="mt-4 text-gray-600">
              We've sent a verification email to your address. Please check your inbox and click the verification link to activate your account.
            </p>
            <div className="mt-6">
              <Link to="/login" className="btn-primary">
                Go to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            Crea tu cuenta
          </h2>
          <p className="text-gray-600">
            ¿Ya tienes cuenta?{' '}
            <Link
              to="/login"
              className="font-semibold text-primary-600 hover:text-primary-500 transition-colors"
            >
              Inicia sesión aquí
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

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="label">
                Full Name
              </label>
              <input
                {...register('name', {
                  required: 'Name is required',
                  minLength: {
                    value: 2,
                    message: 'Name must be at least 2 characters',
                  },
                })}
                type="text"
                className={`input ${errors.name ? 'input-error' : ''}`}
                placeholder="Enter your full name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-danger-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="label">
                Email address
              </label>
              <input
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
                type="email"
                className={`input ${errors.email ? 'input-error' : ''}`}
                placeholder="Enter your email"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-danger-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="institution_id" className="label">
                🏫 Institución Educativa
              </label>
              <select
                {...register('institution_id', { required: 'La institución es requerida' })}
                className={`input ${(errors as any).institution_id ? 'input-error' : ''}`}
              >
                <option value="">Selecciona tu institución</option>
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name} - {inst.city}
                  </option>
                ))}
              </select>
              {(errors as any).institution_id && (
                <p className="mt-1 text-sm text-danger-600">{(errors as any).institution_id.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 8,
                    message: 'Password must be at least 8 characters',
                  },
                  pattern: {
                    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
                    message: 'Password must contain uppercase, lowercase, number, and special character',
                  },
                })}
                type="password"
                className={`input ${errors.password ? 'input-error' : ''}`}
                placeholder="Create a strong password"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-danger-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="label">
                Confirm Password
              </label>
              <input
                {...register('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: value => value === password || 'Passwords do not match',
                })}
                type="password"
                className={`input ${errors.confirmPassword ? 'input-error' : ''}`}
                placeholder="Confirm your password"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-danger-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-start">
                <input
                  {...register('privacyConsent', { required: 'You must accept the privacy policy' })}
                  id="privacyConsent"
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mt-0.5"
                />
                <label htmlFor="privacyConsent" className="ml-2 text-sm text-gray-900">
                  I agree to the{' '}
                  <a href="#" className="text-primary-600 hover:text-primary-500">
                    Privacy Policy
                  </a>
                </label>
              </div>
              {errors.privacyConsent && (
                <p className="text-sm text-danger-600">{errors.privacyConsent.message}</p>
              )}

              <div className="flex items-start">
                <input
                  {...register('termsAccepted', { required: 'You must accept the terms of service' })}
                  id="termsAccepted"
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mt-0.5"
                />
                <label htmlFor="termsAccepted" className="ml-2 text-sm text-gray-900">
                  I agree to the{' '}
                  <a href="#" className="text-primary-600 hover:text-primary-500">
                    Terms of Service
                  </a>
                </label>
              </div>
              {errors.termsAccepted && (
                <p className="text-sm text-danger-600">{errors.termsAccepted.message}</p>
              )}
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
                  <span>Creando cuenta...</span>
                </>
              ) : (
                <>
                  <span>✨</span>
                  <span>Crear Cuenta</span>
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

export default Register;
