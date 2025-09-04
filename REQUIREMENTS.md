# LICEA Educational Platform - Requisitos del Sistema

## Requisitos Previos

### Software Requerido

1. **Node.js** (v18.0 o superior)
   - Descarga: https://nodejs.org/
   - Incluye npm automáticamente

2. **MySQL/MariaDB** 
   - **Opción A**: XAMPP (Recomendado para desarrollo)
     - Descarga: https://www.apachefriends.org/
   - **Opción B**: MySQL Standalone
     - Descarga: https://dev.mysql.com/downloads/mysql/
   - **Opción C**: MariaDB
     - Descarga: https://mariadb.org/download/

3. **Git** (opcional, para clonación)
   - Descarga: https://git-scm.com/

### Requisitos de Sistema

- **SO**: Windows 10/11, macOS 10.15+, Linux Ubuntu 18.04+
- **RAM**: Mínimo 4GB, recomendado 8GB
- **Almacenamiento**: 2GB libres
- **Puertos**: 3000 (Frontend), 3001 (Backend), 3306 (MySQL)

## Instalación Rápida

### Windows

```powershell
# Clonar el repositorio
git clone [repository-url]
cd licea-educational-platform

# Ejecutar instalador automático
.\install.ps1

# Configurar base de datos
cd backend
node setup-database.js

# Iniciar aplicación
cd ..
.\start-all.ps1
```

### Linux/macOS

```bash
# Clonar el repositorio
git clone [repository-url]
cd licea-educational-platform

# Instalar dependencias
cd backend && npm install
cd ../frontend && npm install

# Configurar base de datos
cd ../backend
node setup-database.js

# Iniciar aplicación
npm run dev  # Backend (terminal 1)
cd ../frontend && npm start  # Frontend (terminal 2)
```

## Configuración Manual

### 1. Dependencias del Backend

```bash
cd backend
npm install
```

**Paquetes principales:**
- express (servidor web)
- mysql2 (conexión base de datos)
- bcrypt (encriptación contraseñas)
- jsonwebtoken (autenticación)
- cors (CORS)
- helmet (seguridad)
- nodemailer (emails)

### 2. Dependencias del Frontend

```bash
cd frontend  
npm install
```

**Paquetes principales:**
- react (interfaz)
- typescript (tipado)
- tailwindcss (estilos)
- axios (peticiones HTTP)
- react-router-dom (navegación)
- chart.js (gráficos)

### 3. Base de Datos

```bash
cd backend
node setup-database.js
```

Esto crea:
- Base de datos `licea_platform`
- Todas las tablas necesarias
- Usuarios de prueba

## Variables de Entorno

### Backend (.env)

```env
# Servidor
PORT=3001
NODE_ENV=development

# Base de datos
DB_HOST=localhost
DB_PORT=3306
DB_NAME=licea_platform
DB_USER=root
DB_PASSWORD=

# JWT
JWT_SECRET=tu_clave_secreta_jwt
JWT_REFRESH_SECRET=tu_clave_refresh_jwt
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Email (opcional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tu_email@gmail.com
EMAIL_PASS=tu_password_app
```

### Frontend (.env)

```env
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_APP_NAME=LICEA Educational Platform
```

## Usuarios de Prueba

Después de ejecutar `setup-database.js`:

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | admin@licea.edu | admin123 |
| Instructor | instructor@licea.edu | admin123 |
| Student | student@licea.edu | admin123 |

⚠️ **Cambiar contraseñas en producción**

## Puertos Utilizados

- **3000**: Frontend React
- **3001**: Backend API  
- **3306**: MySQL/MariaDB

## Estructura de Directorios

```
licea-educational-platform/
├── backend/           # API Node.js/Express
│   ├── config/       # Configuración BD
│   ├── routes/       # Rutas API
│   ├── middleware/   # Middleware
│   └── services/     # Servicios
├── frontend/         # App React/TypeScript
│   ├── src/         # Código fuente
│   └── public/      # Archivos públicos
├── database/        # Esquemas SQL
├── docs/           # Documentación
└── scripts/        # Scripts utilidades
```

## Solución de Problemas

### Error: ECONNREFUSED 3306
- MySQL no está ejecutándose
- Iniciar XAMPP o servicio MySQL

### Error: Access denied for user
- Verificar credenciales en .env
- Verificar que el usuario tenga permisos

### Error: Cannot find module
- Ejecutar `npm install` en backend y frontend

### Puerto ya en uso
- Cambiar puerto en .env (backend)
- O detener proceso existente

## Comandos Útiles

```bash
# Ver procesos en puertos
netstat -ano | findstr ":3000"
netstat -ano | findstr ":3001"

# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install

# Ver logs backend
npm run dev  # modo desarrollo con logs

# Verificar base de datos
node setup-database.js test
```

## Soporte

Para problemas o dudas:
1. Verificar logs en consola
2. Comprobar que todos los servicios estén ejecutándose
3. Verificar configuración en archivos .env
