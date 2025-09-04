# LICEA - Acceso a la Base de Datos

## 📊 Información de la Base de Datos

- **Nombre**: `licea_platform`
- **Servidor**: `localhost`  
- **Puerto**: `3306`
- **Usuario**: `root`
- **Contraseña**: (vacía por defecto, o la configurada en backend/.env)

## 🌐 Acceso via phpMyAdmin

### URL de Acceso
```
http://localhost/phpmyadmin/
```

### Credenciales
- **Servidor**: `localhost`
- **Usuario**: `root`  
- **Contraseña**: (dejar vacío si no configuraste una)

### Pasos para Acceder

1. **Asegúrate de que XAMPP esté ejecutándose**
   - Abre XAMPP Control Panel
   - Inicia `Apache` y `MySQL`

2. **Abre el navegador y ve a:**
   ```
   http://localhost/phpmyadmin/
   ```

3. **Busca la base de datos `licea_platform`**
   - En el panel izquierdo, busca y haz clic en `licea_platform`

4. **Explora las tablas:**
   - `users` - Usuarios del sistema
   - `courses` - Cursos
   - `materials` - Material educativo
   - `tasks` - Tareas/Asignaciones
   - `submissions` - Envíos de estudiantes
   - `attendance` - Asistencias
   - `alerts` - Alertas del sistema
   - Y más...

## 📋 Tablas Principales

### `users` (Usuarios)
Contiene toda la información de usuarios (admin, instructores, estudiantes):
- `id`, `name`, `email`, `role`, `password_hash`
- `email_verified`, `is_active`, etc.

### `courses` (Cursos)  
Información de cursos disponibles:
- `id`, `title`, `description`, `instructor_id`
- `start_date`, `end_date`, `is_active`

### `materials` (Materiales)
Archivos y recursos educativos:
- `id`, `course_id`, `title`, `type`, `file_path`

### `tasks` (Tareas)
Asignaciones y exámenes:
- `id`, `course_id`, `title`, `due_date`, `max_points`

### `submissions` (Envíos)
Trabajos entregados por estudiantes:
- `id`, `task_id`, `student_id`, `grade`, `feedback`

## 🔧 Consultas Útiles

### Ver todos los usuarios
```sql
SELECT id, name, email, role, email_verified, is_active 
FROM users;
```

### Ver cursos activos
```sql
SELECT c.id, c.title, c.code, u.name as instructor
FROM courses c
JOIN users u ON c.instructor_id = u.id
WHERE c.is_active = 1;
```

### Ver tareas pendientes
```sql
SELECT t.title, c.title as course, t.due_date
FROM tasks t
JOIN courses c ON t.course_id = c.id
WHERE t.due_date > NOW()
ORDER BY t.due_date;
```

## ⚠️ Ubicación Física de la Base de Datos

Si estás usando XAMPP, los archivos de la base de datos se encuentran en:
```
C:\xampp\mysql\data\licea_platform\
```

## 🛠️ Alternativas a phpMyAdmin

### 1. MySQL Workbench
- Descarga: https://dev.mysql.com/downloads/workbench/
- Más potente para desarrollo

### 2. HeidiSQL (Windows)
- Descarga: https://www.heidisql.com/
- Ligero y rápido

### 3. DBeaver (Multiplataforma)
- Descarga: https://dbeaver.io/
- Soporte para múltiples bases de datos

### 4. Línea de Comandos
```bash
mysql -u root -p
USE licea_platform;
SHOW TABLES;
```

## 🔍 Verificar Conexión

Para verificar que todo funciona, puedes ejecutar:

```bash
cd backend
node -e "
const { executeQuery } = require('./config/database');
executeQuery('SELECT COUNT(*) as total FROM users').then(result => {
  console.log('Usuarios encontrados:', result[0].total);
}).catch(console.error);
"
```

## 📝 Backup de la Base de Datos

### Crear backup
```bash
mysqldump -u root -p licea_platform > backup_licea.sql
```

### Restaurar backup
```bash
mysql -u root -p licea_platform < backup_licea.sql
```

## 🚨 Solución de Problemas

### No puedo acceder a phpMyAdmin
1. Verificar que XAMPP esté ejecutándose
2. Verificar que MySQL esté iniciado en XAMPP
3. Intentar: http://localhost:8080/phpmyadmin/ (si Apache usa puerto 8080)

### Error de conexión
1. Verificar credenciales en `backend/.env`
2. Verificar que MySQL esté ejecutándose en puerto 3306
3. Reiniciar servicios de XAMPP

### Base de datos no aparece
1. Ejecutar: `cd backend && node setup-database.js`
2. Refrescar phpMyAdmin (F5)
