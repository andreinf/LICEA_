import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import AdminDashboard from '../components/dashboards/AdminDashboard';
import InstructorDashboard from '../components/dashboards/InstructorDashboard';
import StudentDashboard from '../components/dashboards/StudentDashboard';
import CoursesPage from '../components/courses/CoursesPage';
import ChatPage from '../components/chat/ChatPage';
import Schedule from './Schedule';
import Chatbot from './Chatbot';
import Tasks from './Tasks';
import Groups from './Groups';
import GroupDetail from './GroupDetail';
import AIAssistant from './AIAssistant';
import Grades from './Grades';
import ProfileSettings from './ProfileSettings';
import UserManagement from './UserManagement';
import InstitutionManagement from './InstitutionManagement';
import StudentsList from './StudentsList';

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
          <>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/institutions" element={<InstitutionManagement />} />
          </>
        )}
        
        {/* Instructor Routes */}
        {hasRole(['admin', 'instructor']) && (
          <Route path="/instructor" element={<InstructorDashboard />} />
        )}
        
        {/* Student Routes */}
        <Route path="/student" element={<StudentDashboard />} />
        
        {/* Common Routes */}
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/students" element={<StudentsList />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/assignments" element={<Tasks />} />
        <Route path="/grades" element={<Grades />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/groups/:id" element={<GroupDetail />} />
        <Route path="/profile" element={<ProfileSettings />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/ai-assistant" element={<AIAssistant />} />
        <Route path="/chatbot" element={<Chatbot />} />
        <Route path="/chat" element={<ChatPage />} />
        
        {/* Catch all */}
        <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
      </Routes>
    </DashboardLayout>
  );
};

export default Dashboard;
