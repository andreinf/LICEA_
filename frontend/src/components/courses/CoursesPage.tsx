import React from 'react';

const CoursesPage: React.FC = () => {
  const courses = [
    {
      id: 1,
      name: 'Introduction to Computer Science',
      code: 'CS101',
      instructor: 'Dr. Sarah Johnson',
      students: 25,
      status: 'Active'
    },
    {
      id: 2,
      name: 'Web Development Basics',
      code: 'WEB101',
      instructor: 'Dr. Sarah Johnson',
      students: 20,
      status: 'Active'
    },
    {
      id: 3,
      name: 'Database Design',
      code: 'DB201',
      instructor: 'Prof. Michael Chen',
      students: 18,
      status: 'Active'
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
          <p className="text-gray-600">Manage your courses and enrollments.</p>
        </div>
        <button className="btn-primary">
          + New Course
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Course</th>
                  <th className="table-header-cell">Code</th>
                  <th className="table-header-cell">Instructor</th>
                  <th className="table-header-cell">Students</th>
                  <th className="table-header-cell">Status</th>
                  <th className="table-header-cell">Actions</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {courses.map((course) => (
                  <tr key={course.id}>
                    <td className="table-cell font-medium">{course.name}</td>
                    <td className="table-cell">{course.code}</td>
                    <td className="table-cell">{course.instructor}</td>
                    <td className="table-cell">{course.students}</td>
                    <td className="table-cell">
                      <span className="badge-success">{course.status}</span>
                    </td>
                    <td className="table-cell">
                      <button className="btn-secondary text-xs mr-2">View</button>
                      <button className="btn-secondary text-xs">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoursesPage;
