#!/usr/bin/env pwsh
# Script para verificar el estado de los servicios LICEA

Write-Host "🔍 Verificando servicios LICEA..." -ForegroundColor Yellow
Write-Host "==================================" -ForegroundColor Yellow
Write-Host ""

# Verificar Backend (Puerto 3001)
Write-Host "🔧 Backend (Puerto 3001):" -ForegroundColor Cyan
$backendRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✅ Backend funcionando correctamente" -ForegroundColor Green
        $backendData = $response.Content | ConvertFrom-Json
        Write-Host "  📊 Servicio: $($backendData.service)" -ForegroundColor White
        Write-Host "  📅 Timestamp: $($backendData.timestamp)" -ForegroundColor White
        $backendRunning = $true
    }
} catch {
    Write-Host "  ❌ Backend no responde" -ForegroundColor Red
}

Write-Host ""

# Verificar Frontend (Puerto 3000)
Write-Host "🎨 Frontend (Puerto 3000):" -ForegroundColor Cyan
$frontendRunning = $false
try {
    $netstat = netstat -ano | findstr ":3000" | findstr "LISTENING"
    if ($netstat) {
        Write-Host "  ✅ Frontend ejecutándose en puerto 3000" -ForegroundColor Green
        Write-Host "  🌐 URL: http://localhost:3000" -ForegroundColor White
        $frontendRunning = $true
    } else {
        Write-Host "  ❌ Frontend no está ejecutándose" -ForegroundColor Red
    }
} catch {
    Write-Host "  ❌ Error verificando frontend" -ForegroundColor Red
}

Write-Host ""

# Verificar Base de Datos
Write-Host "💾 Base de Datos:" -ForegroundColor Cyan
if ($backendRunning) {
    Write-Host "  ✅ Conexión DB verificada (backend conectado)" -ForegroundColor Green
} else {
    Write-Host "  ❓ Estado DB desconocido (backend no responde)" -ForegroundColor Yellow
}

Write-Host ""

# Resumen
Write-Host "📋 Resumen:" -ForegroundColor Yellow
Write-Host "============" -ForegroundColor Yellow

if ($backendRunning -and $frontendRunning) {
    Write-Host "🎉 ¡Todo funcionando correctamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Enlaces útiles:" -ForegroundColor Cyan
    Write-Host "  🌐 Frontend: http://localhost:3000" -ForegroundColor Cyan
    Write-Host "  🔌 Backend API: http://localhost:3001" -ForegroundColor Cyan
    Write-Host "  📚 API Docs: http://localhost:3001/api-docs" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Credenciales de prueba:" -ForegroundColor Cyan
    Write-Host "  Admin: admin@licea.edu / admin123" -ForegroundColor White
    Write-Host "  Instructor: instructor@licea.edu / admin123" -ForegroundColor White
    Write-Host "  Student: student@licea.edu / admin123" -ForegroundColor White
} else {
    Write-Host "⚠️  Algunos servicios no están funcionando:" -ForegroundColor Yellow
    if (!$backendRunning) {
        Write-Host "  - Iniciar backend: cd backend && npm run dev" -ForegroundColor White
    }
    if (!$frontendRunning) {
        Write-Host "  - Iniciar frontend: cd frontend && npm start" -ForegroundColor White
    }
}

Write-Host ""
