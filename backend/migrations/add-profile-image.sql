-- Agregar columna para foto de perfil
ALTER TABLE users 
ADD COLUMN profile_image VARCHAR(500) NULL AFTER bio;
