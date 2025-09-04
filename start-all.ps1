#!/usr/bin/env pwsh
# Script para iniciar toda la plataforma LICEA Educational Platform

Write-Host "🎓 LICEA Educational Platform" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green
Write-Host ""

Write-Host "Verificando servicios..." -ForegroundColor Yellow

# Verificar que las dependencias estén instaladas
if (!(Test-Path "backend/node_modules")) {
    Write-Host "❌ Dependencias del backend no encontradas. Ejecutando npm install..." -ForegroundColor Red
    Set-Location backend
    npm install
    Set-Location ..
}

if (!(Test-Path "frontend/node_modules")) {
    Write-Host "❌ Dependencias del frontend no encontradas. Ejecutando npm install..." -ForegroundColor Red
    Set-Location frontend
    npm install
    Set-Location ..
}

Write-Host "✅ Dependencias verificadas" -ForegroundColor Green
Write-Host ""

Write-Host "🚀 Iniciando servicios..." -ForegroundColor Yellow
Write-Host "Esto abrirá dos ventanas de terminal:" -ForegroundColor Cyan
Write-Host "- Backend API en http://localhost:3001" -ForegroundColor Cyan
Write-Host "- Frontend en http://localhost:3000" -ForegroundColor Cyan
Write-Host ""

# Iniciar backend en nueva ventana
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PWD\backend'; npm run dev"

# Esperar un poco para que el backend inicie
Start-Sleep -Seconds 3

# Iniciar frontend en nueva ventana
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PWD\frontend'; npm start"

Write-Host "✅ ¡Servicios iniciados!" -ForegroundColor Green
Write-Host ""
Write-Host "Enlaces útiles:" -ForegroundColor Cyan
Write-Host "🌐 Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔌 Backend API: http://localhost:3001" -ForegroundColor Cyan
Write-Host "📚 Documentación API: http://localhost:3001/api-docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para detener los servicios, cierra las ventanas de terminal que se abrieron." -ForegroundColor Yellow
