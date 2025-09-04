import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  const features = [
    {
      title: 'Course Management',
      description: 'Create and manage courses with ease. Upload materials, create assignments, and track student progress.',
      icon: '📚',
    },
    {
      title: 'AI-Powered Analytics',
      description: 'Get insights into student performance with AI-powered analytics and risk detection.',
      icon: '🤖',
    },
    {
      title: 'Interactive Chatbot',
      description: 'Get instant help with our AI chatbot assistant for students and instructors.',
      icon: '💬',
    },
    {
      title: 'Smart Scheduling',
      description: 'Optimize your study time with intelligent scheduling and deadline management.',
      icon: '📅',
    },
    {
      title: 'Real-time Collaboration',
      description: 'Collaborate with classmates and instructors in real-time with modern tools.',
      icon: '🤝',
    },
    {
      title: 'Comprehensive Reports',
      description: 'Generate detailed reports on performance, attendance, and engagement.',
      icon: '📊',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="text-2xl font-bold text-primary-600">LICEA</div>
              <div className="ml-2 text-sm text-gray-600">Educational Platform</div>
            </div>
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <span className="text-gray-700">Welcome, {user?.name}</span>
                  <Link to="/dashboard" className="btn-primary">
                    Dashboard
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn-secondary">
                    Log In
                  </Link>
                  <Link to="/register" className="btn-primary">
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Welcome to{' '}
            <span className="text-primary-600">LICEA</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            A comprehensive educational platform that combines modern technology with AI-powered insights
            to enhance learning experiences for students, instructors, and administrators.
          </p>
          <div className="flex justify-center space-x-4">
            {!isAuthenticated && (
              <>
                <Link to="/register" className="btn-primary text-lg px-8 py-3">
                  Start Learning Today
                </Link>
                <Link to="/login" className="btn-secondary text-lg px-8 py-3">
                  Sign In
                </Link>
              </>
            )}
            {isAuthenticated && (
              <Link to="/dashboard" className="btn-primary text-lg px-8 py-3">
                Go to Dashboard
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Powerful Features for Modern Education
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              LICEA provides all the tools you need for effective online and hybrid learning
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card p-6 text-center hover:shadow-lg transition-shadow">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Designed for Everyone
            </h2>
            <p className="text-lg text-gray-600">
              Whether you're a student, instructor, or administrator, LICEA has the right tools for you
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card p-8 text-center">
              <div className="text-5xl mb-4">🎓</div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Students</h3>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li>• Access course materials</li>
                <li>• Submit assignments</li>
                <li>• Track progress</li>
                <li>• Get AI-powered insights</li>
                <li>• Chat with AI assistant</li>
              </ul>
              {!isAuthenticated && (
                <Link to="/register" className="btn-primary w-full">
                  Join as Student
                </Link>
              )}
            </div>
            <div className="card p-8 text-center">
              <div className="text-5xl mb-4">👨‍🏫</div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Instructors</h3>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li>• Create and manage courses</li>
                <li>• Upload materials</li>
                <li>• Grade assignments</li>
                <li>• Monitor attendance</li>
                <li>• Generate reports</li>
              </ul>
              {!isAuthenticated && (
                <Link to="/register" className="btn-primary w-full">
                  Teach with LICEA
                </Link>
              )}
            </div>
            <div className="card p-8 text-center">
              <div className="text-5xl mb-4">👨‍💼</div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Administrators</h3>
              <ul className="text-gray-600 space-y-2 mb-6">
                <li>• Manage users and roles</li>
                <li>• Monitor system activity</li>
                <li>• Generate analytics</li>
                <li>• Oversee all courses</li>
                <li>• Configure platform settings</li>
              </ul>
              {!isAuthenticated && (
                <Link to="/register" className="btn-primary w-full">
                  Manage Platform
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!isAuthenticated && (
        <section className="py-20 bg-primary-600">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Transform Your Educational Experience?
            </h2>
            <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
              Join thousands of students and educators already using LICEA to enhance their learning journey
            </p>
            <div className="flex justify-center space-x-4">
              <Link to="/register" className="bg-white text-primary-600 hover:bg-gray-50 px-8 py-3 text-lg font-medium rounded-md transition-colors">
                Get Started Free
              </Link>
              <Link to="/login" className="border-2 border-white text-white hover:bg-white hover:text-primary-600 px-8 py-3 text-lg font-medium rounded-md transition-colors">
                Sign In
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="text-2xl font-bold mb-4">LICEA</div>
            <p className="text-gray-400 mb-6">
              Learning • Innovation • Collaboration • Excellence • Achievement
            </p>
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} LICEA Educational Platform. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
