#!/usr/bin/env pwsh
# LICEA Educational Platform - Instalación Rápida
# Este script instala todas las dependencias necesarias

Write-Host "🎓 LICEA Educational Platform - Instalación" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""

# Verificar Node.js
Write-Host "🔍 Verificando Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js encontrado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js no encontrado. Descarga desde: https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Verificar npm
Write-Host "🔍 Verificando npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "✅ npm encontrado: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm no encontrado" -ForegroundColor Red
    exit 1
}

# Instalar dependencias del backend
Write-Host ""
Write-Host "📦 Instalando dependencias del backend..." -ForegroundColor Yellow
Set-Location backend
if (Test-Path "package.json") {
    npm install --production=false
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Dependencias del backend instaladas" -ForegroundColor Green
    } else {
        Write-Host "❌ Error instalando dependencias del backend" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ package.json no encontrado en backend/" -ForegroundColor Red
    exit 1
}

# Instalar dependencias del frontend
Write-Host ""
Write-Host "📦 Instalando dependencias del frontend..." -ForegroundColor Yellow
Set-Location ../frontend
if (Test-Path "package.json") {
    npm install --production=false
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Dependencias del frontend instaladas" -ForegroundColor Green
    } else {
        Write-Host "❌ Error instalando dependencias del frontend" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ package.json no encontrado en frontend/" -ForegroundColor Red
    exit 1
}

Set-Location ..

Write-Host ""
Write-Host "✅ Instalación completada exitosamente!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Siguiente paso - Configuración:" -ForegroundColor Yellow
Write-Host "1. Asegúrate de tener MySQL/MariaDB ejecutándose" -ForegroundColor White
Write-Host "2. Configura las variables de entorno en backend/.env" -ForegroundColor White
Write-Host "3. Ejecuta: cd backend && node setup-database.js" -ForegroundColor White
Write-Host "4. Para iniciar: .\start-all.ps1" -ForegroundColor White
Write-Host ""
