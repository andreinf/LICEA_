# Script para iniciar el proyecto LICEA completo
Write-Host "🚀 Iniciando proyecto LICEA Educational Platform..." -ForegroundColor Green

# Verificar si los directorios existen
$backendPath = "C:\Users\Aprendiz\licea-educational-platform\backend"
$frontendPath = "C:\Users\Aprendiz\licea-educational-platform\frontend"

if (-not (Test-Path $backendPath)) {
    Write-Host "❌ Directorio backend no encontrado: $backendPath" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $frontendPath)) {
    Write-Host "❌ Directorio frontend no encontrado: $frontendPath" -ForegroundColor Red
    exit 1
}

# Función para verificar si un puerto está en uso
function Test-Port($port) {
    $result = netstat -an | findstr ":$port "
    return $result -ne $null
}

Write-Host "📋 Estado actual de puertos:" -ForegroundColor Cyan
if (Test-Port 3000) {
    Write-Host "  🔸 Puerto 3000 (frontend): En uso" -ForegroundColor Yellow
} else {
    Write-Host "  🔸 Puerto 3000 (frontend): Libre" -ForegroundColor Green
}

if (Test-Port 3001) {
    Write-Host "  🔸 Puerto 3001 (backend): En uso" -ForegroundColor Yellow
} else {
    Write-Host "  🔸 Puerto 3001 (backend): Libre" -ForegroundColor Green
}

# Preguntar si desea continuar con XAMPP
$startXampp = Read-Host "`n❓ ¿Desea intentar iniciar XAMPP MySQL? (y/N)"
if ($startXampp -eq 'y' -or $startXampp -eq 'Y') {
    Write-Host "🔄 Intentando iniciar XAMPP MySQL..." -ForegroundColor Yellow
    if (Test-Path "C:\xampp\xampp-control.exe") {
        Start-Process "C:\xampp\xampp-control.exe"
        Write-Host "✅ Panel de control de XAMPP iniciado" -ForegroundColor Green
        Write-Host "📝 Por favor, inicie manualmente MySQL desde el panel de control" -ForegroundColor Cyan
    } else {
        Write-Host "❌ XAMPP no encontrado en C:\xampp\" -ForegroundColor Red
    }
}

Write-Host "`n🔄 Iniciando Backend (Puerto 3001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command", 
    "cd '$backendPath'; Write-Host 'Backend LICEA - Puerto 3001' -ForegroundColor Green; npm run dev"
) -WindowStyle Normal

Write-Host "⏳ Esperando 5 segundos antes de iniciar el frontend..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "🔄 Iniciando Frontend (Puerto 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$frontendPath'; Write-Host 'Frontend LICEA - Puerto 3000' -ForegroundColor Blue; npm start"
) -WindowStyle Normal

Write-Host "`n✅ Comandos de inicio ejecutados!" -ForegroundColor Green
Write-Host "📱 URLs de acceso:" -ForegroundColor Cyan
Write-Host "  🌐 Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "  🔗 Backend API: http://localhost:3001" -ForegroundColor White
Write-Host "  📚 API Docs: http://localhost:3001/api-docs (cuando esté funcionando)" -ForegroundColor White

Write-Host "`n📝 Notas importantes:" -ForegroundColor Yellow
Write-Host "  • El backend puede mostrar errores de base de datos hasta que MySQL esté configurado"
Write-Host "  • El frontend debería funcionar normalmente"
Write-Host "  • Presiona Ctrl+C en las ventanas de comandos para detener los servidores"

Write-Host "`n⏳ Esperando 15 segundos para verificar el estado..." -ForegroundColor Cyan
Start-Sleep -Seconds 15

Write-Host "`n🔍 Verificando estado de los servidores..." -ForegroundColor Cyan
$port3000 = netstat -an | findstr ":3000"
$port3001 = netstat -an | findstr ":3001"

if ($port3000) {
    Write-Host "✅ Frontend ejecutándose en puerto 3000" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend no detectado en puerto 3000" -ForegroundColor Red
}

if ($port3001) {
    Write-Host "✅ Backend ejecutándose en puerto 3001" -ForegroundColor Green
} else {
    Write-Host "❌ Backend no detectado en puerto 3001" -ForegroundColor Red
}

Write-Host "`n🎉 ¡Proyecto LICEA iniciado! Revisa las ventanas de comando para más detalles." -ForegroundColor Green
Write-Host "🌐 Abre tu navegador y visita: http://localhost:3000" -ForegroundColor White
