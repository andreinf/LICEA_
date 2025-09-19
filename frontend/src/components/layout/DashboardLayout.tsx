import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleGoHome = () => {
    navigate('/');
  };

  // Función para traducir roles al español
  const translateRole = (role: string) => {
    const translations = {
      'admin': 'Administrador',
      'instructor': 'Instructor',
      'student': 'Estudiante'
    };
    return translations[role as keyof typeof translations] || role;
  };

  const navigation = [
    {
      name: 'Panel Principal',
      href: `/dashboard/${user?.role}`,
      icon: '🏠',
      current: location.pathname === `/dashboard/${user?.role}`,
    },
    {
      name: 'Cursos',
      href: '/dashboard/courses',
      icon: '📚',
      current: location.pathname.startsWith('/dashboard/courses'),
    },
    {
      name: 'Cronograma',
      href: '/dashboard/schedule',
      icon: '📅',
      current: location.pathname.startsWith('/dashboard/schedule'),
    },
    {
      name: 'Asistente IA',
      href: '/dashboard/chatbot',
      icon: '🤖',
      current: location.pathname.startsWith('/dashboard/chatbot'),
    },
  ];

  // Add role-specific navigation items
  if (user?.role === 'admin') {
    navigation.splice(1, 0, {
      name: 'Usuarios',
      href: '/dashboard/users',
      icon: '👥',
      current: location.pathname.startsWith('/dashboard/users'),
    });
    navigation.splice(2, 0, {
      name: 'Reportes',
      href: '/dashboard/reports',
      icon: '📊',
      current: location.pathname.startsWith('/dashboard/reports'),
    });
    // Add after the main navigation items
    navigation.push({
      name: 'Configuración',
      href: '/dashboard/settings',
      icon: '⚙️',
      current: location.pathname.startsWith('/dashboard/settings'),
    });
  }

  if (user?.role === 'instructor') {
    navigation.push({
      name: 'Tareas',
      href: '/dashboard/assignments',
      icon: '📝',
      current: location.pathname.startsWith('/dashboard/assignments'),
    });
    navigation.push({
      name: 'Estudiantes',
      href: '/dashboard/students',
      icon: '🎓',
      current: location.pathname.startsWith('/dashboard/students'),
    });
    navigation.push({
      name: 'Calificaciones',
      href: '/dashboard/grading',
      icon: '📊',
      current: location.pathname.startsWith('/dashboard/grading'),
    });
  }

  if (user?.role === 'student') {
    navigation.push({
      name: 'Mis Tareas',
      href: '/dashboard/assignments',
      icon: '📝',
      current: location.pathname.startsWith('/dashboard/assignments'),
    });
    navigation.push({
      name: 'Calificaciones',
      href: '/dashboard/grades',
      icon: '📈',
      current: location.pathname.startsWith('/dashboard/grades'),
    });
    navigation.push({
      name: 'Progreso',
      href: '/dashboard/progress',
      icon: '📈',
      current: location.pathname.startsWith('/dashboard/progress'),
    });
  }

  const handleNavigation = (href: string) => {
    navigate(href);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-25 to-accent-25">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-30 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Nuevo menú lateral flotante */}
      <aside
        className={`fixed top-4 left-4 bottom-4 z-50 w-80 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-primary-200/50 transform transition-all duration-700 ease-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Cabecera moderna con glassmorphism */}
        <div className="relative p-6 bg-gradient-to-r from-primary-600/10 to-accent-500/10 rounded-t-3xl border-b border-primary-200/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center shadow-xl">
                  <span className="text-2xl">🎓</span>
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-accent-400 rounded-full flex items-center justify-center text-xs text-white font-bold shadow-lg animate-pulse">
                  L
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-700 to-accent-600 bg-clip-text text-transparent">
                  LICEA
                </h1>
                <p className="text-sm text-gray-500 font-medium">Sistema Educativo Integral</p>
              </div>
            </div>
            
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors duration-200"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Menú de navegación con diseño de tarjetas flotantes */}
        <nav className="p-4 space-y-3 max-h-96 overflow-y-auto scrollbar-hide">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-4">
            Navegación Principal
          </div>
          
          {navigation.map((item, index) => (
            <div key={item.name} className="relative">
              <button
                onClick={() => handleNavigation(item.href)}
                className={`group w-full text-left p-4 rounded-2xl transition-all duration-500 flex items-center space-x-4 relative overflow-hidden border-2 ${
                  item.current
                    ? 'bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-xl scale-105 border-primary-300 shadow-primary-500/25'
                    : 'bg-white/50 text-gray-700 hover:bg-gradient-to-br hover:from-primary-50 hover:to-accent-50 hover:text-primary-800 hover:shadow-lg hover:scale-102 border-gray-200/50 hover:border-primary-300/50'
                }`}
                style={{ 
                  animationDelay: `${index * 100}ms`,
                  animationFillMode: 'both'
                }}
              >
                {/* Icono con efecto glassmorphism */}
                <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all duration-300 ${
                  item.current 
                    ? 'bg-white/20 backdrop-blur-sm text-white shadow-lg' 
                    : 'bg-primary-100/80 text-primary-700 group-hover:bg-primary-200/80 group-hover:shadow-md'
                }`}>
                  {item.icon}
                  {item.current && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent-300 rounded-full animate-ping"></div>
                  )}
                </div>
                
                {/* Contenido del botón */}
                <div className="flex-1">
                  <div className={`font-bold text-base transition-all duration-300 ${
                    item.current ? 'text-white' : 'text-gray-800 group-hover:text-primary-800'
                  }`}>
                    {item.name}
                  </div>
                  <div className={`text-xs mt-1 transition-all duration-300 ${
                    item.current ? 'text-white/80' : 'text-gray-500 group-hover:text-primary-600'
                  }`}>
                    Acceso rápido
                  </div>
                </div>
                
                {/* Indicador de estado activo */}
                {item.current && (
                  <div className="flex flex-col items-center space-y-1">
                    <div className="w-3 h-3 bg-white rounded-full shadow-lg animate-pulse"></div>
                    <div className="text-xs text-white/80 font-medium">Activo</div>
                  </div>
                )}
                
                {/* Efecto de brillo en hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-full group-hover:translate-x-0 transition-transform duration-1000"></div>
              </button>
            </div>
          ))}
        </nav>

        {/* Sección de usuario moderna */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white/95 to-transparent backdrop-blur-sm rounded-b-3xl">
          {/* Perfil de usuario */}
          <div className="mb-4 p-4 bg-gradient-to-r from-primary-50/80 to-accent-50/80 backdrop-blur-sm rounded-2xl border border-primary-200/30">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-primary-400 to-accent-500 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg">
                  {user?.name.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-white flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-800 truncate">{user?.name}</h3>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-accent-400 rounded-full"></div>
                  <span className="text-sm text-gray-600 font-medium">{translateRole(user?.role || '')}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Botones de acción modernos */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleGoHome}
              className="group bg-gradient-to-r from-primary-500 to-primary-400 hover:from-primary-400 hover:to-primary-300 text-white px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>Página Principal</span>
            </button>
            <button
              onClick={handleLogout}
              className="group bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-400 hover:to-pink-400 text-white px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Área de contenido principal moderna con diseño adaptativo */}
      <main className="lg:ml-96 transition-all duration-700 ease-out">
        {/* Header flotante moderno */}
        <div className="sticky top-4 z-30 mx-4 mb-6">
          <header className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-primary-200/30 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Botón de menú móvil */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 text-white rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                
                {/* Título de la sección */}
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-700 to-accent-600 bg-clip-text text-transparent">
                    Panel de {translateRole(user?.role || '')}
                  </h1>
                  <p className="text-sm text-gray-500">Gestión y control educativo</p>
                </div>
              </div>

              {/* Sección de usuario en header */}
              <div className="flex items-center space-x-4">
                {/* Notificaciones */}
                <button className="relative w-12 h-12 bg-primary-100 hover:bg-primary-200 rounded-xl flex items-center justify-center transition-all duration-300 group">
                  <svg className="w-6 h-6 text-primary-600 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5-5V9a6 6 0 10-12 0v3l-5 5h5m0 0v1a3 3 0 106 0v-1m-6 0h6" />
                  </svg>
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
                    3
                  </div>
                </button>
                
                {/* Perfil de usuario compacto */}
                <div className="hidden sm:flex items-center space-x-3 bg-gradient-to-r from-primary-50 to-accent-50 px-4 py-2 rounded-xl border border-primary-200/50">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-accent-500 rounded-xl flex items-center justify-center text-white font-bold shadow-md">
                    {user?.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800 truncate max-w-32">{user?.name}</p>
                    <p className="text-xs text-gray-500">{translateRole(user?.role || '')}</p>
                  </div>
                </div>
              </div>
            </div>
          </header>
        </div>

        {/* Contenido principal con cards flotantes */}
        <div className="px-4 pb-8">
          <div className="max-w-7xl mx-auto">
            {/* Contenedor de contenido con glassmorphism */}
            <div className="bg-white/60 backdrop-blur-sm rounded-3xl shadow-xl border border-primary-200/30 p-8 min-h-[calc(100vh-12rem)]">
              {children}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;