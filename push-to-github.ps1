#!/usr/bin/env pwsh
# Script para subir LICEA a GitHub

Write-Host "🚀 Subiendo LICEA Educational Platform a GitHub..." -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host ""

Write-Host "📝 Instrucciones:" -ForegroundColor Yellow
Write-Host "1. Ve a https://github.com/new" -ForegroundColor White
Write-Host "2. Repository name: licea-educational-platform" -ForegroundColor White
Write-Host "3. Description: 🎓 LICEA Educational Platform - Complete LMS" -ForegroundColor White
Write-Host "4. NO marques 'Add README' ni '.gitignore'" -ForegroundColor White
Write-Host "5. Crea el repositorio y copia la URL" -ForegroundColor White
Write-Host ""

$repoUrl = Read-Host "Pega aquí la URL de tu repositorio GitHub (ej: https://github.com/tuusuario/licea-educational-platform.git)"

if ($repoUrl) {
    Write-Host ""
    Write-Host "🔗 Conectando con repositorio remoto..." -ForegroundColor Yellow
    
    try {
        git remote add origin $repoUrl
        Write-Host "✅ Repositorio remoto agregado" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "📤 Subiendo archivos a GitHub..." -ForegroundColor Yellow
        git branch -M main
        git push -u origin main
        
        Write-Host ""
        Write-Host "🎉 ¡Proyecto subido exitosamente!" -ForegroundColor Green
        Write-Host "Tu repositorio está disponible en: $repoUrl" -ForegroundColor Cyan
        
    } catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Verifica que la URL sea correcta y que tengas permisos" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ URL no proporcionada. Proceso cancelado." -ForegroundColor Red
}

Write-Host ""
Write-Host "📋 Comandos alternativos:" -ForegroundColor Yellow
Write-Host "git remote add origin TU_URL_AQUI" -ForegroundColor White
Write-Host "git branch -M main" -ForegroundColor White  
Write-Host "git push -u origin main" -ForegroundColor White
