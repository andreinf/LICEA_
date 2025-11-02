-- Script para verificar datos reales en la base de datos

-- Total de usuarios
SELECT 'TOTAL USUARIOS' as Metrica, COUNT(*) as Cantidad FROM users;

-- Usuarios por rol
SELECT 'USUARIOS POR ROL' as Metrica, role as Rol, COUNT(*) as Cantidad 
FROM users 
GROUP BY role;

-- Usuarios activos
SELECT 'USUARIOS ACTIVOS' as Metrica, 
       SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as Activos,
       SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as Inactivos
FROM users;

-- Total de instituciones
SELECT 'TOTAL INSTITUCIONES' as Metrica, COUNT(*) as Cantidad FROM institutions;

-- Instituciones activas
SELECT 'INSTITUCIONES ACTIVAS' as Metrica,
       SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as Activas,
       SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as Inactivas
FROM institutions;

-- Total de cursos
SELECT 'TOTAL CURSOS' as Metrica, COUNT(*) as Cantidad FROM courses;

-- Usuarios sin institución
SELECT 'USUARIOS SIN INSTITUCIÓN' as Metrica, COUNT(*) as Cantidad 
FROM users 
WHERE institution_id IS NULL;
