-- LICEA Educational Platform - Sample Data
USE licea_platform;

-- Insert sample users (passwords are 'password123' hashed with bcrypt)
-- Admin user
INSERT INTO users (name, email, role, password_hash, email_verified, privacy_consent, terms_accepted) VALUES
('Admin User', 'admin@licea.edu', 'admin', '$2b$10$rQyGmJ5oX3.t8UKKMxFqD.5pFv8qX1t2pDKJsQtPh9UqLKx7Hs5by', TRUE, TRUE, TRUE);

-- Instructors
INSERT INTO users (name, email, role, password_hash, email_verified, privacy_consent, terms_accepted) VALUES
('Dr. Sarah Johnson', 'sarah.johnson@licea.edu', 'instructor', '$2b$10$rQyGmJ5oX3.t8UKKMxFqD.5pFv8qX1t2pDKJsQtPh9UqLKx7Hs5by', TRUE, TRUE, TRUE),
('Prof. Michael Chen', 'michael.chen@licea.edu', 'instructor', '$2b$10$rQyGmJ5oX3.t8UKKMxFqD.5pFv8qX1t2pDKJsQtPh9UqLKx7Hs5by', TRUE, TRUE, TRUE),
('Dr. Emily Rodriguez', 'emily.rodriguez@licea.edu', 'instructor', '$2b$10$rQyGmJ5oX3.t8UKKMxFqD.5pFv8qX1t2pDKJsQtPh9UqLKx7Hs5by', TRUE, TRUE, TRUE);

-- Students
INSERT INTO users (name, email, role, password_hash, email_verified, privacy_consent, terms_accepted) VALUES
('Alice Smith', 'alice.smith@student.licea.edu', 'student', '$2b$10$rQyGmJ5oX3.t8UKKMxFqD.5pFv8qX1t2pDKJsQtPh9UqLKx7Hs5by', TRUE, TRUE, TRUE),
('Bob Wilson', 'bob.wilson@student.licea.edu', 'student', '$2b$10$rQyGmJ5oX3.t8UKKMxFqD.5pFv8qX1t2pDKJsQtPh9UqLKx7Hs5by', TRUE, TRUE, TRUE),
('Carol Davis', 'carol.davis@student.licea.edu', 'student', '$2b$10$rQyGmJ5oX3.t8UKKMxFqD.5pFv8qX1t2pDKJsQtPh9UqLKx7Hs5by', TRUE, TRUE, TRUE),
('David Brown', 'david.brown@student.licea.edu', 'student', '$2b$10$rQyGmJ5oX3.t8UKKMxFqD.5pFv8qX1t2pDKJsQtPh9UqLKx7Hs5by', TRUE, TRUE, TRUE),
('Emma Taylor', 'emma.taylor@student.licea.edu', 'student', '$2b$10$rQyGmJ5oX3.t8UKKMxFqD.5pFv8qX1t2pDKJsQtPh9UqLKx7Hs5by', TRUE, TRUE, TRUE),
('Frank Miller', 'frank.miller@student.licea.edu', 'student', '$2b$10$rQyGmJ5oX3.t8UKKMxFqD.5pFv8qX1t2pDKJsQtPh9UqLKx7Hs5by', TRUE, TRUE, TRUE),
('Grace Lee', 'grace.lee@student.licea.edu', 'student', '$2b$10$rQyGmJ5oX3.t8UKKMxFqD.5pFv8qX1t2pDKJsQtPh9UqLKx7Hs5by', TRUE, TRUE, TRUE),
('Henry White', 'henry.white@student.licea.edu', 'student', '$2b$10$rQyGmJ5oX3.t8UKKMxFqD.5pFv8qX1t2pDKJsQtPh9UqLKx7Hs5by', TRUE, TRUE, TRUE);

-- Insert sample courses
INSERT INTO courses (name, description, instructor_id, code, start_date, end_date, max_students) VALUES
('Introduction to Computer Science', 'Fundamental concepts of computer science including programming, algorithms, and data structures.', 2, 'CS101', '2024-01-15', '2024-05-15', 30),
('Web Development Basics', 'Learn HTML, CSS, JavaScript and modern web development frameworks.', 2, 'WEB101', '2024-02-01', '2024-06-01', 25),
('Database Design', 'Principles of database design, normalization, and SQL programming.', 3, 'DB201', '2024-01-20', '2024-05-20', 20),
('Advanced Mathematics', 'Calculus, linear algebra, and statistical methods for science and engineering.', 4, 'MATH301', '2024-01-10', '2024-05-10', 35),
('Digital Marketing', 'Modern digital marketing strategies, social media, and analytics.', 4, 'MKT201', '2024-02-15', '2024-06-15', 40);

-- Insert course enrollments
INSERT INTO course_enrollments (course_id, student_id, status) VALUES
-- CS101 enrollments
(1, 5, 'active'), (1, 6, 'active'), (1, 7, 'active'), (1, 8, 'active'), (1, 9, 'active'),
-- WEB101 enrollments  
(2, 5, 'active'), (2, 7, 'active'), (2, 9, 'active'), (2, 11, 'active'),
-- DB201 enrollments
(3, 6, 'active'), (3, 8, 'active'), (3, 10, 'active'), (3, 12, 'active'),
-- MATH301 enrollments
(4, 5, 'active'), (4, 6, 'active'), (4, 8, 'active'), (4, 10, 'active'), (4, 11, 'active'),
-- MKT201 enrollments
(5, 7, 'active'), (5, 9, 'active'), (5, 11, 'active'), (5, 12, 'active');

-- Insert sample materials
INSERT INTO materials (course_id, title, description, file_url, file_type, order_index) VALUES
(1, 'Course Syllabus', 'Complete course syllabus and requirements', '/materials/cs101/syllabus.pdf', 'document', 1),
(1, 'Introduction to Programming', 'Basic programming concepts and syntax', '/materials/cs101/intro-programming.pdf', 'document', 2),
(1, 'Programming Tutorial Video', 'Step-by-step programming tutorial', '/materials/cs101/tutorial.mp4', 'video', 3),
(2, 'HTML Basics', 'Introduction to HTML markup language', '/materials/web101/html-basics.pdf', 'document', 1),
(2, 'CSS Styling Guide', 'Comprehensive CSS styling guide', '/materials/web101/css-guide.pdf', 'document', 2),
(2, 'JavaScript Fundamentals', 'Core JavaScript concepts and examples', '/materials/web101/js-fundamentals.pdf', 'document', 3),
(3, 'Database Design Principles', 'Fundamental principles of database design', '/materials/db201/design-principles.pdf', 'document', 1),
(3, 'SQL Reference Guide', 'Complete SQL command reference', '/materials/db201/sql-reference.pdf', 'document', 2);

-- Insert sample tasks
INSERT INTO tasks (course_id, title, description, instructions, due_date, max_grade, is_published) VALUES
(1, 'Hello World Program', 'Create your first program that displays "Hello World"', 'Write a program in any programming language that outputs "Hello World" to the console. Submit your source code file.', '2024-02-15 23:59:59', 100.00, TRUE),
(1, 'Variables and Data Types', 'Demonstrate understanding of variables and data types', 'Create a program that uses different data types (integer, string, boolean) and performs basic operations.', '2024-02-28 23:59:59', 100.00, TRUE),
(1, 'Control Structures Assignment', 'Implement loops and conditional statements', 'Write a program that uses if/else statements and loops to solve a given problem.', '2024-03-15 23:59:59', 100.00, TRUE),
(2, 'Personal Website', 'Create a personal website using HTML and CSS', 'Build a responsive personal website with at least 3 pages using HTML and CSS.', '2024-03-01 23:59:59', 100.00, TRUE),
(2, 'Interactive Web Page', 'Add JavaScript functionality to your website', 'Enhance your personal website with JavaScript interactions and form validation.', '2024-03-20 23:59:59', 100.00, TRUE),
(3, 'Database Schema Design', 'Design a database schema for a given scenario', 'Create an ER diagram and normalized database schema for a library management system.', '2024-02-25 23:59:59', 100.00, TRUE),
(3, 'SQL Queries Assignment', 'Write complex SQL queries', 'Write SQL queries to retrieve, update, and analyze data from the provided sample database.', '2024-03-10 23:59:59', 100.00, TRUE);

-- Insert sample submissions
INSERT INTO submissions (task_id, student_id, submission_text, grade, feedback, status, submitted_at, graded_at) VALUES
(1, 5, 'print("Hello World")', 95.00, 'Excellent work! Clean and correct implementation.', 'graded', '2024-02-14 15:30:00', '2024-02-16 10:00:00'),
(1, 6, 'console.log("Hello World");', 90.00, 'Good work! Consider adding comments to your code.', 'graded', '2024-02-15 20:45:00', '2024-02-16 10:15:00'),
(1, 7, 'System.out.println("Hello World");', 88.00, 'Correct implementation. Nice use of Java.', 'graded', '2024-02-15 23:30:00', '2024-02-16 10:30:00'),
(2, 5, 'Created a comprehensive program demonstrating all data types with proper documentation.', 92.00, 'Great understanding of data types. Excellent documentation.', 'graded', '2024-02-27 18:00:00', '2024-03-01 09:00:00'),
(2, 6, 'Program shows basic understanding but lacks some edge cases.', 78.00, 'Good start, but please handle edge cases and add more examples.', 'graded', '2024-02-28 22:15:00', '2024-03-01 09:15:00'),
(4, 5, 'Created a beautiful responsive website with clean HTML and CSS.', 96.00, 'Outstanding work! Great use of CSS Grid and modern design principles.', 'graded', '2024-02-28 16:20:00', '2024-03-02 11:00:00'),
(4, 7, 'Basic website structure completed with good styling.', 82.00, 'Good foundation. Consider improving the responsive design for mobile devices.', 'graded', '2024-03-01 21:10:00', '2024-03-02 11:15:00');

-- Insert sample attendance records
INSERT INTO attendance (course_id, student_id, date, status, recorded_by) VALUES
-- CS101 attendance
(1, 5, '2024-01-15', 'present', 2), (1, 6, '2024-01-15', 'present', 2), (1, 7, '2024-01-15', 'present', 2),
(1, 8, '2024-01-15', 'late', 2), (1, 9, '2024-01-15', 'present', 2),
(1, 5, '2024-01-17', 'present', 2), (1, 6, '2024-01-17', 'absent', 2), (1, 7, '2024-01-17', 'present', 2),
(1, 8, '2024-01-17', 'present', 2), (1, 9, '2024-01-17', 'present', 2),
(1, 5, '2024-01-19', 'present', 2), (1, 6, '2024-01-19', 'present', 2), (1, 7, '2024-01-19', 'absent', 2),
(1, 8, '2024-01-19', 'present', 2), (1, 9, '2024-01-19', 'present', 2),
-- WEB101 attendance
(2, 5, '2024-02-01', 'present', 2), (2, 7, '2024-02-01', 'present', 2), (2, 9, '2024-02-01', 'present', 2),
(2, 11, '2024-02-01', 'late', 2),
(2, 5, '2024-02-03', 'present', 2), (2, 7, '2024-02-03', 'absent', 2), (2, 9, '2024-02-03', 'present', 2),
(2, 11, '2024-02-03', 'present', 2),
-- DB201 attendance
(3, 6, '2024-01-20', 'present', 3), (3, 8, '2024-01-20', 'present', 3), (3, 10, '2024-01-20', 'present', 3),
(3, 12, '2024-01-20', 'absent', 3);

-- Insert sample alerts (AI-generated risk assessments)
INSERT INTO alerts (student_id, course_id, risk_level, alert_type, title, description, recommendation) VALUES
(6, 1, 'medium', 'attendance', 'Attendance Concern', 'Student has missed 1 out of 3 recent classes in CS101', 'Consider reaching out to the student to discuss any challenges they might be facing.'),
(7, 1, 'medium', 'attendance', 'Attendance Pattern', 'Student shows irregular attendance pattern in CS101', 'Monitor attendance closely and provide additional support if needed.'),
(7, 2, 'high', 'attendance', 'High Absence Rate', 'Student has missed recent classes in WEB101', 'Immediate intervention recommended. Schedule a meeting with the student.'),
(6, 1, 'medium', 'performance', 'Grade Below Average', 'Student\'s recent assignment grade is below class average', 'Offer additional tutoring or study resources to help improve performance.'),
(12, 3, 'high', 'attendance', 'Multiple Absences', 'Student has not attended recent DB201 classes', 'Contact student immediately to assess situation and provide support.');

-- Insert sample schedules
INSERT INTO schedules (user_id, title, description, activity_type, start_time, end_time, deadline, priority, course_id, task_id) VALUES
(5, 'CS101 Assignment Due', 'Complete Hello World Program', 'task', '2024-02-14 09:00:00', '2024-02-14 11:00:00', '2024-02-15 23:59:59', 'high', 1, 1),
(5, 'Study Session - Variables', 'Prepare for Variables and Data Types assignment', 'study', '2024-02-26 14:00:00', '2024-02-26 16:00:00', '2024-02-28 23:59:59', 'medium', 1, 2),
(5, 'CS101 Class', 'Regular class session', 'class', '2024-02-19 10:00:00', '2024-02-19 11:30:00', NULL, 'medium', 1, NULL),
(7, 'Web Development Project', 'Work on personal website', 'task', '2024-02-28 15:00:00', '2024-02-28 18:00:00', '2024-03-01 23:59:59', 'high', 2, 4),
(6, 'Database Design Review', 'Review ER diagram concepts', 'study', '2024-02-24 13:00:00', '2024-02-24 15:00:00', '2024-02-25 23:59:59', 'medium', 3, 6);

-- Insert sample chat conversations
INSERT INTO chat_conversations (user_id, title) VALUES
(5, 'Assignment Help - CS101'),
(7, 'Course Information'),
(6, 'Study Schedule Assistance');

-- Insert sample chat messages
INSERT INTO chat_messages (conversation_id, sender_type, message) VALUES
(1, 'user', 'I need help with my Hello World assignment. What programming language should I use?'),
(1, 'ai', 'Great question! You can use any programming language for the Hello World assignment. Popular choices include Python (print("Hello World")), JavaScript (console.log("Hello World")), or Java (System.out.println("Hello World")). Choose the one you\'re most comfortable with or would like to learn!'),
(1, 'user', 'I think I\'ll go with Python. Can you show me the exact syntax?'),
(1, 'ai', 'Perfect choice! Here\'s the Python syntax:\n\n```python\nprint("Hello World")\n```\n\nThat\'s it! Make sure to save your file with a .py extension and you can run it from the command line. Good luck with your assignment!'),

(2, 'user', 'What are the upcoming deadlines for my courses?'),
(2, 'ai', 'Based on your enrolled courses, here are your upcoming deadlines:\n\n• **CS101 - Variables and Data Types**: Due Feb 28, 2024 at 11:59 PM\n• **WEB101 - Personal Website**: Due March 1, 2024 at 11:59 PM\n\nI recommend starting on these assignments soon to ensure you have enough time. Would you like me to help you create a study schedule?'),

(3, 'user', 'Can you help me plan my study schedule for this week?'),
(3, 'ai', 'I\'d be happy to help you create a study schedule! Based on your current courses and upcoming deadlines, I can suggest optimal study times. Let me know:\n\n1. How many hours per day can you dedicate to studying?\n2. Do you have any preferred study times?\n3. Are there any specific subjects you\'d like to focus on more?\n\nWith this information, I can create a personalized schedule that maximizes your learning efficiency.');

-- Insert audit logs for sample actions
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address) VALUES
(2, 'CREATE', 'course', 1, '192.168.1.100'),
(2, 'CREATE', 'task', 1, '192.168.1.100'),
(5, 'SUBMIT', 'submission', 1, '192.168.1.105'),
(5, 'LOGIN', 'user', 5, '192.168.1.105'),
(6, 'LOGIN', 'user', 6, '192.168.1.106'),
(7, 'SUBMIT', 'submission', 7, '192.168.1.107'),
(2, 'GRADE', 'submission', 1, '192.168.1.100');

-- Update last login timestamps for active users
UPDATE users SET last_login = '2024-02-16 08:30:00' WHERE id = 5;
UPDATE users SET last_login = '2024-02-16 09:15:00' WHERE id = 6;
UPDATE users SET last_login = '2024-02-16 10:45:00' WHERE id = 7;
UPDATE users SET last_login = '2024-02-15 14:20:00' WHERE id = 2;
UPDATE users SET last_login = '2024-02-15 16:30:00' WHERE id = 3;
