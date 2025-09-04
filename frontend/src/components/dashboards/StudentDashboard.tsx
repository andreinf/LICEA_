import React from 'react';

const StudentDashboard: React.FC = () => {
  // Mock data for demonstration
  const stats = [
    {
      title: 'Enrolled Courses',
      value: '4',
      icon: '📚',
      color: 'bg-blue-500',
    },
    {
      title: 'Pending Assignments',
      value: '7',
      icon: '📝',
      color: 'bg-yellow-500',
    },
    {
      title: 'Average Grade',
      value: '85%',
      icon: '📊',
      color: 'bg-green-500',
    },
    {
      title: 'Attendance Rate',
      value: '92%',
      icon: '📅',
      color: 'bg-purple-500',
    },
  ];

  const upcomingDeadlines = [
    {
      course: 'Web Development',
      assignment: 'Personal Website Project',
      dueDate: '2024-09-10',
      priority: 'high',
    },
    {
      course: 'Database Design',
      assignment: 'SQL Queries Assignment',
      dueDate: '2024-09-12',
      priority: 'medium',
    },
    {
      course: 'Introduction to CS',
      assignment: 'Control Structures',
      dueDate: '2024-09-15',
      priority: 'low',
    },
  ];

  const recentGrades = [
    {
      course: 'Introduction to CS',
      assignment: 'Hello World Program',
      grade: '95%',
      status: 'excellent',
    },
    {
      course: 'Web Development',
      assignment: 'HTML/CSS Basics',
      grade: '88%',
      status: 'good',
    },
    {
      course: 'Database Design',
      assignment: 'ER Diagram',
      grade: '92%',
      status: 'excellent',
    },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getGradeColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'needs-improvement': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Student Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's your academic overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="card p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <span className="text-2xl text-white">{stat.icon}</span>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Deadlines */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Deadlines</h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {upcomingDeadlines.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.assignment}</p>
                    <p className="text-sm text-gray-600">{item.course}</p>
                    <p className="text-xs text-gray-500">Due: {new Date(item.dueDate).toLocaleDateString()}</p>
                  </div>
                  <div className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(item.priority)}`}>
                    {item.priority}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Grades */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Recent Grades</h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {recentGrades.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.assignment}</p>
                    <p className="text-sm text-gray-600">{item.course}</p>
                  </div>
                  <div className={`text-lg font-bold ${getGradeColor(item.status)}`}>
                    {item.grade}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">🤖 AI Insights</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Performance Trend</h4>
              <p className="text-sm text-blue-700">
                Your grades have improved by 8% over the last month. Keep up the excellent work!
              </p>
            </div>
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium text-yellow-900 mb-2">Study Recommendation</h4>
              <p className="text-sm text-yellow-700">
                Consider spending more time on Database Design concepts. Your recent quiz scores suggest additional practice could help.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="btn-primary flex items-center justify-center space-x-2">
              <span>📚</span>
              <span>View Courses</span>
            </button>
            <button className="btn-secondary flex items-center justify-center space-x-2">
              <span>📝</span>
              <span>Submit Assignment</span>
            </button>
            <button className="btn-secondary flex items-center justify-center space-x-2">
              <span>💬</span>
              <span>Ask AI Assistant</span>
            </button>
            <button className="btn-secondary flex items-center justify-center space-x-2">
              <span>📊</span>
              <span>View Progress</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
