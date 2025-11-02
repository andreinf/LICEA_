-- Script para crear la tabla de notificaciones
-- Ejecutar en phpMyAdmin o HeidiSQL en la base de datos licea_platform

USE licea_platform;

-- Crear tabla notifications
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('task_assigned', 'task_graded', 'task_reminder', 'course_enrolled', 'announcement', 'system') NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  link VARCHAR(500),
  related_id INT,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_read (user_id, is_read),
  INDEX idx_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verificar que se creó
SHOW TABLES LIKE 'notifications';

-- Ver estructura
DESCRIBE notifications;

SELECT 'Tabla notifications creada exitosamente!' as mensaje;
