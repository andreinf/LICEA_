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

  const navigation = [
    {
      name: 'Dashboard',
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
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4 bg-primary-600">
          <div className="text-white font-bold text-xl">LICEA</div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white hover:text-gray-200"
          >
            ✕
          </button>
        </div>
        
        <nav className="mt-8 px-4">
          <ul className="space-y-2">
            {navigation.map((item) => (
              <li key={item.name}>
                <button
                  onClick={() => handleNavigation(item.href)}
                  className={`w-full text-left px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 flex items-center space-x-3 ${
                    item.current
                      ? 'bg-primary-100 text-primary-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* User info at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.name}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {user?.role}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full mt-3 btn-secondary text-xs"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-600 hover:text-gray-900"
            >
              <span className="text-xl">☰</span>
            </button>
            
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900 capitalize">
                {user?.role} Dashboard
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Welcome, {user?.name}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
