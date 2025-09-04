import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import AdminDashboard from '../components/dashboards/AdminDashboard';
import InstructorDashboard from '../components/dashboards/InstructorDashboard';
import StudentDashboard from '../components/dashboards/StudentDashboard';
import CoursesPage from '../components/courses/CoursesPage';
import ChatPage from '../components/chat/ChatPage';

const Dashboard: React.FC = () => {
  const { user, hasRole } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const getDefaultRoute = () => {
    switch (user.role) {
      case 'admin':
        return '/dashboard/admin';
      case 'instructor':
        return '/dashboard/instructor';
      case 'student':
        return '/dashboard/student';
      default:
        return '/dashboard/student';
    }
  };

  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />
        
        {/* Admin Routes */}
        {hasRole('admin') && (
          <Route path="/admin" element={<AdminDashboard />} />
        )}
        
        {/* Instructor Routes */}
        {hasRole(['admin', 'instructor']) && (
          <Route path="/instructor" element={<InstructorDashboard />} />
        )}
        
        {/* Student Routes */}
        <Route path="/student" element={<StudentDashboard />} />
        
        {/* Common Routes */}
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/chat" element={<ChatPage />} />
        
        {/* Catch all */}
        <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
      </Routes>
    </DashboardLayout>
  );
};

export default Dashboard;
