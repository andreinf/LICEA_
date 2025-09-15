const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixCoursesTable() {
  let connection = null;
  
  try {
    console.log('🔧 Fixing courses table structure...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'licea_platform'
    });
    
    console.log('✅ Connected to database');
    
    // Check current columns
    const [columns] = await connection.execute('DESCRIBE courses');
    const columnNames = columns.map(col => col.Field);
    console.log('📊 Current columns:', columnNames);
    
    // Add missing columns
    const alterations = [];
    
    if (columnNames.includes('name') && !columnNames.includes('title')) {
      alterations.push('CHANGE COLUMN name title VARCHAR(255) NOT NULL');
    } else if (!columnNames.includes('title')) {
      alterations.push('ADD COLUMN title VARCHAR(255) NOT NULL AFTER id');
    }
    
    if (!columnNames.includes('category')) {
      alterations.push('ADD COLUMN category VARCHAR(100) AFTER instructor_id');
    }
    
    if (!columnNames.includes('level')) {
      alterations.push('ADD COLUMN level ENUM("beginner", "intermediate", "advanced") DEFAULT "beginner" AFTER category');
    }
    
    if (!columnNames.includes('credits')) {
      alterations.push('ADD COLUMN credits INT DEFAULT 3 AFTER level');
    }
    
    if (!columnNames.includes('current_students')) {
      alterations.push('ADD COLUMN current_students INT DEFAULT 0 AFTER max_students');
    }
    
    if (!columnNames.includes('schedule_data')) {
      alterations.push('ADD COLUMN schedule_data JSON AFTER end_date');
    }
    
    if (!columnNames.includes('image_url')) {
      alterations.push('ADD COLUMN image_url VARCHAR(500) AFTER schedule_data');
    }
    
    if (!columnNames.includes('syllabus')) {
      alterations.push('ADD COLUMN syllabus TEXT AFTER image_url');
    }
    
    // Execute alterations
    if (alterations.length > 0) {
      const alterSQL = `ALTER TABLE courses ${alterations.join(', ')}`;
      console.log('🔨 Executing:', alterSQL);
      await connection.execute(alterSQL);
      console.log('✅ Courses table structure updated');
    } else {
      console.log('✅ Courses table already has correct structure');
    }
    
    // Now insert sample data
    console.log('📚 Inserting sample courses...');
    const courses = [
      {
        title: 'Introduction to Computer Science',
        description: 'A comprehensive introduction to programming concepts, algorithms, and data structures.',
        code: 'CS101',
        instructor_id: 2,
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
        instructor_id: 3,
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
        instructor_id: 4,
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
      try {
        await connection.execute(`
          INSERT IGNORE INTO courses (title, description, code, instructor_id, category, level, credits, max_students, start_date, end_date, syllabus, is_active)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
        `, [course.title, course.description, course.code, course.instructor_id, course.category, course.level, course.credits, course.max_students, course.start_date, course.end_date, course.syllabus]);
        console.log(`✅ Inserted course: ${course.title}`);
      } catch (error) {
        console.log(`⚠️  Course ${course.title} might already exist: ${error.message}`);
      }
    }
    
    // Add sample enrollments
    console.log('👥 Adding sample enrollments...');
    const enrollments = [
      { student_id: 5, course_id: 1 }, // Alice in CS101
      { student_id: 6, course_id: 1 }, // Bob in CS101  
      { student_id: 7, course_id: 1 }, // Charlie in CS101
      { student_id: 5, course_id: 3 }, // Alice in Marketing
      { student_id: 8, course_id: 2 }, // Diana in Math
      { student_id: 9, course_id: 2 }  // Eva in Math
    ];
    
    for (const enrollment of enrollments) {
      try {
        await connection.execute(`
          INSERT IGNORE INTO enrollments (student_id, course_id, status)
          VALUES (?, ?, 'enrolled')
        `, [enrollment.student_id, enrollment.course_id]);
      } catch (error) {
        console.log(`⚠️  Enrollment might already exist: ${error.message}`);
      }
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
    
    console.log('🎉 Courses table fixed and populated successfully!');
    
    // Show results
    const [courseCount] = await connection.execute('SELECT COUNT(*) as count FROM courses');
    console.log(`📚 Total courses: ${courseCount[0].count}`);
    
  } catch (error) {
    console.error('❌ Error fixing courses table:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixCoursesTable();