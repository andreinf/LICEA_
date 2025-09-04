#!/usr/bin/env pwsh
# Script para iniciar el backend de LICEA Educational Platform

Write-Host "🚀 Iniciando Backend LICEA..." -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green

Set-Location backend
npm run dev
