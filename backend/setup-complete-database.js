const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function setupCompleteDatabase() {
  let connection = null;
  
  try {
    console.log('🏗️  Setting up complete LICEA database...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'licea_platform'
    });
    
    console.log('✅ Connected to database');
    
    // Create courses table
    console.log('📚 Creating courses table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS courses (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        code VARCHAR(50) UNIQUE NOT NULL,
        instructor_id INT NOT NULL,
        category VARCHAR(100),
        level ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner',
        credits INT DEFAULT 3,
        max_students INT DEFAULT 30,
        current_students INT DEFAULT 0,
        start_date DATE,
        end_date DATE,
        schedule_data JSON,
        is_active BOOLEAN DEFAULT TRUE,
        image_url VARCHAR(500),
        syllabus TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_instructor (instructor_id),
        INDEX idx_code (code),
        INDEX idx_category (category),
        INDEX idx_active (is_active)
      )
    `);
    console.log('✅ Courses table created/verified');
    
    // Create enrollments table
    console.log('📝 Creating enrollments table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        student_id INT NOT NULL,
        course_id INT NOT NULL,
        enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status ENUM('enrolled', 'completed', 'dropped', 'suspended') DEFAULT 'enrolled',
        final_grade DECIMAL(5,2),
        completion_date DATE,
        
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        UNIQUE KEY unique_enrollment (student_id, course_id),
        INDEX idx_student (student_id),
        INDEX idx_course (course_id),
        INDEX idx_status (status)
      )
    `);
    console.log('✅ Enrollments table created/verified');
    
    // Create schedules table
    console.log('📅 Creating schedules table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS schedules (
        id INT PRIMARY KEY AUTO_INCREMENT,
        course_id INT NOT NULL,
        day_of_week ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        location VARCHAR(100),
        session_type ENUM('lecture', 'lab', 'seminar', 'workshop', 'exam') DEFAULT 'lecture',
        is_recurring BOOLEAN DEFAULT TRUE,
        specific_date DATE NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        INDEX idx_course (course_id),
        INDEX idx_day (day_of_week),
        INDEX idx_time (start_time, end_time)
      )
    `);
    console.log('✅ Schedules table created/verified');
    
    // Create assignments table
    console.log('📋 Creating assignments table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS assignments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        course_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        instructions TEXT,
        due_date DATETIME NOT NULL,
        max_points DECIMAL(6,2) DEFAULT 100.00,
        weight DECIMAL(5,2) DEFAULT 1.00,
        assignment_type ENUM('homework', 'quiz', 'exam', 'project', 'participation') DEFAULT 'homework',
        is_published BOOLEAN DEFAULT FALSE,
        allow_late_submission BOOLEAN DEFAULT FALSE,
        late_penalty_percent DECIMAL(5,2) DEFAULT 10.00,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_course (course_id),
        INDEX idx_due_date (due_date),
        INDEX idx_published (is_published)
      )
    `);
    console.log('✅ Assignments table created/verified');
    
    // Create grades table
    console.log('📊 Creating grades table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS grades (
        id INT PRIMARY KEY AUTO_INCREMENT,
        student_id INT NOT NULL,
        assignment_id INT NOT NULL,
        course_id INT NOT NULL,
        points_earned DECIMAL(6,2),
        max_points DECIMAL(6,2) NOT NULL,
        percentage DECIMAL(5,2),
        letter_grade VARCHAR(2),
        feedback TEXT,
        graded_by INT,
        graded_at DATETIME,
        is_late BOOLEAN DEFAULT FALSE,
        submission_date DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        FOREIGN KEY (graded_by) REFERENCES users(id) ON DELETE SET NULL,
        UNIQUE KEY unique_grade (student_id, assignment_id),
        INDEX idx_student (student_id),
        INDEX idx_assignment (assignment_id),
        INDEX idx_course (course_id)
      )
    `);
    console.log('✅ Grades table created/verified');
    
    // Create course_materials table
    console.log('📚 Creating course materials table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS course_materials (
        id INT PRIMARY KEY AUTO_INCREMENT,
        course_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        material_type ENUM('document', 'video', 'link', 'image', 'presentation', 'other') NOT NULL,
        file_path VARCHAR(500),
        file_size BIGINT,
        mime_type VARCHAR(100),
        url TEXT,
        order_index INT DEFAULT 0,
        is_visible BOOLEAN DEFAULT TRUE,
        download_count INT DEFAULT 0,
        uploaded_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_course (course_id),
        INDEX idx_type (material_type),
        INDEX idx_visible (is_visible)
      )
    `);
    console.log('✅ Course materials table created/verified');
    
    // Insert sample courses
    console.log('📚 Inserting sample courses...');
    const courses = [
      {
        title: 'Introduction to Computer Science',
        description: 'A comprehensive introduction to programming concepts, algorithms, and data structures.',
        code: 'CS101',
        instructor_id: 2, // Sarah Johnson
        category: 'Computer Science',
        level: 'beginner',
        credits: 4,
        max_students: 30,
        start_date: '2024-01-15',
        end_date: '2024-05-15',
        syllabus: 'Week 1-4: Programming Basics\nWeek 5-8: Data Structures\nWeek 9-12: Algorithms\nWeek 13-16: Final Project'
      },
      {
        title: 'Advanced Mathematics',
        description: 'Calculus, linear algebra, and statistical analysis for advanced students.',
        code: 'MATH301',
        instructor_id: 3, // Michael Chen
        category: 'Mathematics',
        level: 'advanced',
        credits: 3,
        max_students: 25,
        start_date: '2024-01-15',
        end_date: '2024-05-15',
        syllabus: 'Week 1-6: Advanced Calculus\nWeek 7-12: Linear Algebra\nWeek 13-16: Statistics'
      },
      {
        title: 'Digital Marketing Strategy',
        description: 'Learn modern digital marketing techniques and social media strategies.',
        code: 'MKT201',
        instructor_id: 4, // Emily Rodriguez
        category: 'Marketing',
        level: 'intermediate',
        credits: 3,
        max_students: 35,
        start_date: '2024-01-15',
        end_date: '2024-05-15',
        syllabus: 'Week 1-4: SEO & SEM\nWeek 5-8: Social Media Marketing\nWeek 9-12: Content Strategy\nWeek 13-16: Analytics'
      }
    ];
    
    for (const course of courses) {
      await connection.execute(`
        INSERT IGNORE INTO courses (title, description, code, instructor_id, category, level, credits, max_students, start_date, end_date, syllabus)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [course.title, course.description, course.code, course.instructor_id, course.category, course.level, course.credits, course.max_students, course.start_date, course.end_date, course.syllabus]);
    }
    
    // Insert sample schedules
    console.log('📅 Inserting sample schedules...');
    const schedules = [
      { course_id: 1, day_of_week: 'monday', start_time: '09:00:00', end_time: '10:30:00', location: 'Room A101', session_type: 'lecture' },
      { course_id: 1, day_of_week: 'wednesday', start_time: '09:00:00', end_time: '10:30:00', location: 'Room A101', session_type: 'lecture' },
      { course_id: 1, day_of_week: 'friday', start_time: '14:00:00', end_time: '16:00:00', location: 'Lab B201', session_type: 'lab' },
      { course_id: 2, day_of_week: 'tuesday', start_time: '11:00:00', end_time: '12:30:00', location: 'Room C301', session_type: 'lecture' },
      { course_id: 2, day_of_week: 'thursday', start_time: '11:00:00', end_time: '12:30:00', location: 'Room C301', session_type: 'lecture' },
      { course_id: 3, day_of_week: 'monday', start_time: '16:00:00', end_time: '17:30:00', location: 'Room D401', session_type: 'lecture' },
      { course_id: 3, day_of_week: 'wednesday', start_time: '16:00:00', end_time: '17:30:00', location: 'Room D401', session_type: 'seminar' }
    ];
    
    for (const schedule of schedules) {
      await connection.execute(`
        INSERT IGNORE INTO schedules (course_id, day_of_week, start_time, end_time, location, session_type)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [schedule.course_id, schedule.day_of_week, schedule.start_time, schedule.end_time, schedule.location, schedule.session_type]);
    }
    
    // Insert sample assignments
    console.log('📋 Inserting sample assignments...');
    const assignments = [
      {
        course_id: 1,
        title: 'Programming Assignment 1',
        description: 'Create a basic calculator program using Python',
        instructions: 'Write a program that can perform basic arithmetic operations. Include error handling and user input validation.',
        due_date: '2024-02-15 23:59:59',
        max_points: 100,
        assignment_type: 'homework',
        is_published: true,
        created_by: 2
      },
      {
        course_id: 1,
        title: 'Midterm Exam',
        description: 'Comprehensive exam covering weeks 1-8',
        instructions: 'Closed book exam. Bring calculator and pencils.',
        due_date: '2024-03-15 14:00:00',
        max_points: 200,
        weight: 2.0,
        assignment_type: 'exam',
        is_published: true,
        created_by: 2
      },
      {
        course_id: 2,
        title: 'Calculus Problem Set 1',
        description: 'Solve integration and differentiation problems',
        due_date: '2024-02-20 23:59:59',
        max_points: 80,
        assignment_type: 'homework',
        is_published: true,
        created_by: 3
      }
    ];
    
    for (const assignment of assignments) {
      await connection.execute(`
        INSERT IGNORE INTO assignments (course_id, title, description, instructions, due_date, max_points, weight, assignment_type, is_published, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [assignment.course_id, assignment.title, assignment.description, assignment.instructions, assignment.due_date, assignment.max_points, assignment.weight || 1.0, assignment.assignment_type, assignment.is_published, assignment.created_by]);
    }
    
    // Enroll some students in courses
    console.log('👥 Creating sample enrollments...');
    const enrollments = [
      { student_id: 5, course_id: 1 }, // Alice in CS101
      { student_id: 6, course_id: 1 }, // Bob in CS101  
      { student_id: 7, course_id: 1 }, // Charlie in CS101
      { student_id: 5, course_id: 3 }, // Alice in Marketing
      { student_id: 8, course_id: 2 }, // Diana in Math
      { student_id: 9, course_id: 2 }  // Eva in Math
    ];
    
    for (const enrollment of enrollments) {
      await connection.execute(`
        INSERT IGNORE INTO enrollments (student_id, course_id)
        VALUES (?, ?)
      `, [enrollment.student_id, enrollment.course_id]);
    }
    
    // Add sample grades
    console.log('📊 Adding sample grades...');
    const grades = [
      { student_id: 5, assignment_id: 1, course_id: 1, points_earned: 85, max_points: 100, percentage: 85.0, letter_grade: 'B', graded_by: 2 },
      { student_id: 6, assignment_id: 1, course_id: 1, points_earned: 92, max_points: 100, percentage: 92.0, letter_grade: 'A', graded_by: 2 },
      { student_id: 7, assignment_id: 1, course_id: 1, points_earned: 78, max_points: 100, percentage: 78.0, letter_grade: 'C', graded_by: 2 },
      { student_id: 8, assignment_id: 3, course_id: 2, points_earned: 75, max_points: 80, percentage: 93.75, letter_grade: 'A', graded_by: 3 }
    ];
    
    for (const grade of grades) {
      await connection.execute(`
        INSERT IGNORE INTO grades (student_id, assignment_id, course_id, points_earned, max_points, percentage, letter_grade, graded_by, graded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [grade.student_id, grade.assignment_id, grade.course_id, grade.points_earned, grade.max_points, grade.percentage, grade.letter_grade, grade.graded_by]);
    }
    
    // Update course student counts
    await connection.execute(`
      UPDATE courses 
      SET current_students = (
        SELECT COUNT(*) 
        FROM enrollments 
        WHERE enrollments.course_id = courses.id 
        AND enrollments.status = 'enrolled'
      )
    `);
    
    console.log('\n🎉 Complete database setup finished successfully!');
    console.log('📊 Summary:');
    
    const [courseCount] = await connection.execute('SELECT COUNT(*) as count FROM courses');
    const [scheduleCount] = await connection.execute('SELECT COUNT(*) as count FROM schedules');
    const [assignmentCount] = await connection.execute('SELECT COUNT(*) as count FROM assignments');
    const [enrollmentCount] = await connection.execute('SELECT COUNT(*) as count FROM enrollments');
    const [gradeCount] = await connection.execute('SELECT COUNT(*) as count FROM grades');
    
    console.log(`   📚 Courses: ${courseCount[0].count}`);
    console.log(`   📅 Schedules: ${scheduleCount[0].count}`);
    console.log(`   📋 Assignments: ${assignmentCount[0].count}`);
    console.log(`   👥 Enrollments: ${enrollmentCount[0].count}`);
    console.log(`   📊 Grades: ${gradeCount[0].count}`);
    
  } catch (error) {
    console.error('❌ Error setting up complete database:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupCompleteDatabase();