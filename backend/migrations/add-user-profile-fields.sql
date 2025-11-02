-- Agregar campos de perfil a tabla users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone VARCHAR(20) NULL AFTER email,
ADD COLUMN IF NOT EXISTS bio TEXT NULL AFTER phone;
