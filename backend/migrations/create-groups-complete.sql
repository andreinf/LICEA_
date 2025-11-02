-- Crear tabla de grupos de estudio (course_groups)
CREATE TABLE IF NOT EXISTS `course_groups` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `join_code` VARCHAR(8) UNIQUE NOT NULL,
  `group_image` VARCHAR(500),
  `course_id` INT NOT NULL,
  `max_members` INT DEFAULT 10,
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_course` (`course_id`),
  INDEX `idx_join_code` (`join_code`),
  INDEX `idx_active` (`is_active`),
  FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crear tabla de miembros de grupos
CREATE TABLE IF NOT EXISTS `group_members` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `group_id` INT NOT NULL,
  `student_id` INT NOT NULL,
  `role` ENUM('leader', 'member') DEFAULT 'member',
  `joined_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_group_member` (`group_id`, `student_id`),
  INDEX `idx_student` (`student_id`),
  FOREIGN KEY (`group_id`) REFERENCES `course_groups`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crear tabla de mensajes de grupo para chat
CREATE TABLE IF NOT EXISTS `group_messages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `group_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `message` TEXT,
  `file_url` VARCHAR(500),
  `file_name` VARCHAR(255),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_group_messages` (`group_id`, `created_at` DESC),
  INDEX `idx_user_messages` (`user_id`),
  FOREIGN KEY (`group_id`) REFERENCES `course_groups`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Función para generar códigos únicos (trigger)
DELIMITER $$

CREATE TRIGGER `generate_join_code_before_insert`
BEFORE INSERT ON `course_groups`
FOR EACH ROW
BEGIN
  IF NEW.join_code IS NULL OR NEW.join_code = '' THEN
    SET NEW.join_code = UPPER(SUBSTRING(MD5(CONCAT(UNIX_TIMESTAMP(), RAND())), 1, 8));
  END IF;
END$$

DELIMITER ;

-- Generar códigos para grupos existentes (si hay alguno)
UPDATE `course_groups` 
SET `join_code` = UPPER(SUBSTRING(MD5(CONCAT(id, name, RAND())), 1, 8))
WHERE `join_code` IS NULL OR `join_code` = '';
