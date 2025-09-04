-- LICEA Educational Platform Database Schema
-- MySQL Database Schema

CREATE DATABASE IF NOT EXISTS licea_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE licea_platform;

-- Drop tables in reverse order to handle foreign key constraints
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS schedules;
DROP TABLE IF EXISTS alerts;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS submissions;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS materials;
DROP TABLE IF EXISTS course_enrollments;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS password_resets;
DROP TABLE IF EXISTS email_verifications;
DROP TABLE IF EXISTS users;

-- Users table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role ENUM('admin', 'instructor', 'student') NOT NULL DEFAULT 'student',
    password_hash VARCHAR(255) NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    failed_login_attempts INT DEFAULT 0,
    locked_until DATETIME NULL,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    privacy_consent BOOLEAN DEFAULT FALSE,
    terms_accepted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_active (is_active)
);

-- Email verifications table
CREATE TABLE email_verifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_expires (expires_at)
);

-- Password resets table
CREATE TABLE password_resets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_expires (expires_at)
);

-- Courses table
CREATE TABLE courses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    instructor_id INT NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    max_students INT DEFAULT 50,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_instructor (instructor_id),
    INDEX idx_code (code),
    INDEX idx_active (is_active)
);

-- Course enrollments table
CREATE TABLE course_enrollments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    student_id INT NOT NULL,
    enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('active', 'dropped', 'completed') DEFAULT 'active',
    final_grade DECIMAL(5,2) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_enrollment (course_id, student_id),
    INDEX idx_course (course_id),
    INDEX idx_student (student_id),
    INDEX idx_status (status)
);

-- Materials table
CREATE TABLE materials (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_path VARCHAR(500),
    file_url VARCHAR(500),
    file_type ENUM('document', 'video', 'audio', 'image', 'link', 'other') DEFAULT 'document',
    file_size BIGINT,
    is_downloadable BOOLEAN DEFAULT TRUE,
    order_index INT DEFAULT 0,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    INDEX idx_course (course_id),
    INDEX idx_type (file_type),
    INDEX idx_order (order_index)
);

-- Tasks/Assignments table
CREATE TABLE tasks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    instructions TEXT,
    due_date DATETIME NOT NULL,
    max_grade DECIMAL(5,2) DEFAULT 100.00,
    submission_type ENUM('file', 'text', 'both') DEFAULT 'both',
    is_published BOOLEAN DEFAULT FALSE,
    late_submission_allowed BOOLEAN DEFAULT TRUE,
    late_penalty DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    INDEX idx_course (course_id),
    INDEX idx_due_date (due_date),
    INDEX idx_published (is_published)
);

-- Submissions table
CREATE TABLE submissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    task_id INT NOT NULL,
    student_id INT NOT NULL,
    submission_text TEXT,
    file_path VARCHAR(500),
    file_url VARCHAR(500),
    grade DECIMAL(5,2) NULL,
    feedback TEXT,
    status ENUM('draft', 'submitted', 'graded', 'returned') DEFAULT 'draft',
    submitted_at TIMESTAMP NULL,
    graded_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_submission (task_id, student_id),
    INDEX idx_task (task_id),
    INDEX idx_student (student_id),
    INDEX idx_status (status),
    INDEX idx_submitted (submitted_at)
);

-- Attendance table
CREATE TABLE attendance (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    student_id INT NOT NULL,
    date DATE NOT NULL,
    status ENUM('present', 'absent', 'late', 'excused') NOT NULL,
    notes TEXT,
    recorded_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_attendance (course_id, student_id, date),
    INDEX idx_course_date (course_id, date),
    INDEX idx_student (student_id),
    INDEX idx_status (status)
);

-- Alerts table for AI-generated risk assessments
CREATE TABLE alerts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    course_id INT,
    risk_level ENUM('low', 'medium', 'high', 'critical') NOT NULL,
    alert_type ENUM('performance', 'attendance', 'submission', 'engagement') NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    recommendation TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_by INT NULL,
    resolved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_student (student_id),
    INDEX idx_course (course_id),
    INDEX idx_risk_level (risk_level),
    INDEX idx_type (alert_type),
    INDEX idx_unread (is_read),
    INDEX idx_unresolved (is_resolved)
);

-- Schedules table for smart scheduling
CREATE TABLE schedules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    activity_type ENUM('task', 'exam', 'class', 'meeting', 'study', 'other') NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    deadline DATETIME,
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    status ENUM('scheduled', 'in_progress', 'completed', 'cancelled') DEFAULT 'scheduled',
    reminder_sent BOOLEAN DEFAULT FALSE,
    reminder_time DATETIME,
    course_id INT NULL,
    task_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_course (course_id),
    INDEX idx_task (task_id),
    INDEX idx_start_time (start_time),
    INDEX idx_deadline (deadline),
    INDEX idx_status (status)
);

-- Audit logs table for security and tracking
CREATE TABLE audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NULL,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id INT NULL,
    old_values JSON NULL,
    new_values JSON NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
);

-- Chat conversations table for AI chatbot
CREATE TABLE chat_conversations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(255) DEFAULT 'New Conversation',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_created_at (created_at)
);

-- Chat messages table for AI chatbot
CREATE TABLE chat_messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    conversation_id INT NOT NULL,
    sender_type ENUM('user', 'ai') NOT NULL,
    message TEXT NOT NULL,
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE,
    INDEX idx_conversation (conversation_id),
    INDEX idx_created_at (created_at)
);

-- Create indexes for performance optimization
CREATE INDEX idx_users_email_role ON users(email, role);
CREATE INDEX idx_courses_instructor_active ON courses(instructor_id, is_active);
CREATE INDEX idx_tasks_course_due ON tasks(course_id, due_date);
CREATE INDEX idx_submissions_student_status ON submissions(student_id, status);
CREATE INDEX idx_attendance_student_date ON attendance(student_id, date);

-- Create views for common queries
CREATE VIEW student_course_summary AS
SELECT 
    u.id as student_id,
    u.name as student_name,
    u.email as student_email,
    c.id as course_id,
    c.name as course_name,
    c.code as course_code,
    ce.enrollment_date,
    ce.status as enrollment_status,
    ce.final_grade,
    COUNT(DISTINCT t.id) as total_tasks,
    COUNT(DISTINCT s.id) as submitted_tasks,
    AVG(s.grade) as average_grade,
    COUNT(DISTINCT a.id) as total_attendance_records,
    SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count
FROM users u
JOIN course_enrollments ce ON u.id = ce.student_id
JOIN courses c ON ce.course_id = c.id
LEFT JOIN tasks t ON c.id = t.course_id AND t.is_published = TRUE
LEFT JOIN submissions s ON t.id = s.task_id AND s.student_id = u.id AND s.status = 'graded'
LEFT JOIN attendance a ON c.id = a.course_id AND a.student_id = u.id
WHERE u.role = 'student'
GROUP BY u.id, c.id, ce.enrollment_date, ce.status, ce.final_grade;

-- Instructor course summary view
CREATE VIEW instructor_course_summary AS
SELECT 
    u.id as instructor_id,
    u.name as instructor_name,
    c.id as course_id,
    c.name as course_name,
    c.code as course_code,
    COUNT(DISTINCT ce.student_id) as enrolled_students,
    COUNT(DISTINCT t.id) as total_tasks,
    COUNT(DISTINCT m.id) as total_materials,
    c.start_date,
    c.end_date,
    c.is_active
FROM users u
JOIN courses c ON u.id = c.instructor_id
LEFT JOIN course_enrollments ce ON c.id = ce.course_id AND ce.status = 'active'
LEFT JOIN tasks t ON c.id = t.course_id
LEFT JOIN materials m ON c.id = m.course_id
WHERE u.role = 'instructor'
GROUP BY u.id, c.id;

-- Performance analytics view
CREATE VIEW performance_analytics AS
SELECT 
    s.student_id,
    s.course_id,
    AVG(sub.grade) as average_grade,
    COUNT(sub.id) as total_submissions,
    COUNT(CASE WHEN sub.grade >= 70 THEN 1 END) as passing_submissions,
    COUNT(CASE WHEN sub.submitted_at > t.due_date THEN 1 END) as late_submissions,
    AVG(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as attendance_rate,
    COUNT(DISTINCT a.date) as total_classes,
    MAX(sub.submitted_at) as last_submission_date
FROM student_course_summary s
LEFT JOIN submissions sub ON s.student_id = sub.student_id
LEFT JOIN tasks t ON sub.task_id = t.id AND t.course_id = s.course_id
LEFT JOIN attendance a ON s.student_id = a.student_id AND s.course_id = a.course_id
GROUP BY s.student_id, s.course_id;
