-- Crear tabla de instituciones
CREATE TABLE IF NOT EXISTS institutions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  code VARCHAR(50) NOT NULL UNIQUE,
  type ENUM('school', 'university', 'institute') DEFAULT 'school',
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Colombia',
  logo_url VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_code (code),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar instituciones de ejemplo
INSERT INTO institutions (name, code, type, city) VALUES
('Colegio San José', 'CSJ', 'school', 'Bogotá'),
('Instituto Técnico Industrial', 'ITI', 'institute', 'Medellín'),
('Colegio La Salle', 'CLS', 'school', 'Cali'),
('Liceo Nacional', 'LN', 'school', 'Barranquilla'),
('Instituto Pedagógico Nacional', 'IPN', 'institute', 'Bogotá'),
('Colegio Americano', 'CA', 'school', 'Bogotá'),
('Universidad Nacional de Colombia', 'UNAL', 'university', 'Bogotá'),
('Colegio Gimnasio Moderno', 'CGM', 'school', 'Bogotá');

-- Agregar columna institution_id a users
ALTER TABLE users 
ADD COLUMN institution_id INT NULL AFTER email,
ADD CONSTRAINT fk_users_institution 
  FOREIGN KEY (institution_id) REFERENCES institutions(id) 
  ON DELETE SET NULL;

-- Crear índice
ALTER TABLE users ADD INDEX idx_institution (institution_id);
