-- Agregar columnas para códigos de invitación e imágenes a grupos
ALTER TABLE `groups` 
ADD COLUMN `join_code` VARCHAR(8) UNIQUE NULL AFTER `description`,
ADD COLUMN `group_image` VARCHAR(500) NULL AFTER `join_code`,
ADD INDEX `idx_join_code` (`join_code`);

-- Generar códigos únicos para grupos existentes
UPDATE `groups` 
SET `join_code` = UPPER(SUBSTRING(MD5(CONCAT(id, name, RAND())), 1, 8))
WHERE `join_code` IS NULL;

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
  FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
