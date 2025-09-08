# 🚀 LICEA Educational Platform - Inicio Rápido

## ¿Cómo iniciar el proyecto?

### Opción 1: Script Automático (RECOMENDADO)
```powershell
# Desde PowerShell, navega al directorio del proyecto y ejecuta:
.\start-project.ps1
```

### Opción 2: Inicio Manual
```powershell
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend  
npm start
```

## 🌐 URLs de Acceso
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Documentación API**: http://localhost:3001/api-docs

## ⚠️ Problemas Conocidos y Soluciones

### MySQL no conecta
**Problema**: Error de conexión a base de datos
**Soluciones**:
1. Abrir XAMPP Control Panel
2. Iniciar Apache y MySQL
3. Verificar que MySQL esté en puerto 3306
4. Ejecutar: `npm run setup-db` desde el directorio backend

### Puerto ya en uso
**Problema**: `EADDRINUSE: address already in use`
**Solución**: Terminar procesos existentes o usar puertos diferentes

### Errores de dependencias  
**Problema**: Módulos no encontrados
**Solución**:
```powershell
# En backend
cd backend
npm install

# En frontend  
cd frontend
npm install
```

## 📝 Usuarios por Defecto (después de configurar DB)
- **Admin**: admin@licea.edu / admin123
- **Instructor**: instructor@licea.edu / admin123  
- **Student**: student@licea.edu / admin123

## 🔧 Comandos Útiles

### Backend
```powershell
cd backend
npm run dev          # Iniciar en modo desarrollo
npm run setup-db     # Configurar base de datos
npm run test-db      # Probar conexión DB
```

### Frontend
```powershell
cd frontend
npm start            # Iniciar desarrollo
npm run build        # Crear build producción
npm test             # Ejecutar tests
```

## 🆘 ¿Necesitas Ayuda?

### Verificar estado de servicios
```powershell
# Verificar puertos en uso
netstat -an | findstr ":3000 :3001 :3306"

# Verificar procesos Node.js
Get-Process node -ErrorAction SilentlyContinue

# Verificar MySQL
Get-Process mysqld -ErrorAction SilentlyContinue
```

### Reiniciar completamente
```powershell
# Terminar todos los procesos Node.js
Get-Process node | Stop-Process -Force

# Terminar MySQL si es necesario
Get-Process mysqld | Stop-Process -Force

# Luego reiniciar con .\start-project.ps1
```

## 🎯 Próximos Pasos
1. ✅ Proyecto iniciado
2. ⏳ Configurar base de datos MySQL
3. 🔐 Configurar autenticación 
4. 📧 Configurar servicio de email (opcional)
5. 🤖 Configurar funciones AI (opcional)

---
**Tip**: Mantén las ventanas de comando abiertas para ver logs en tiempo real.
