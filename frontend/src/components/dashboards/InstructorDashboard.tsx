import React from 'react';

const InstructorDashboard: React.FC = () => {
  const stats = [
    { title: 'My Courses', value: '3', icon: '📚', color: 'bg-blue-500' },
    { title: 'Total Students', value: '47', icon: '🎓', color: 'bg-green-500' },
    { title: 'Pending Submissions', value: '12', icon: '📝', color: 'bg-yellow-500' },
    { title: 'Average Class Grade', value: '87%', icon: '📊', color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Instructor Dashboard</h1>
        <p className="text-gray-600">Manage your courses and track student progress.</p>
      </div>

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

      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        </div>
        <div className="card-body">
          <p className="text-gray-600">Instructor dashboard features will be implemented in the full version.</p>
        </div>
      </div>
    </div>
  );
};

export default InstructorDashboard;
