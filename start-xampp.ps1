# Script para iniciar servicios de XAMPP
Write-Host "🚀 Iniciando servicios XAMPP..." -ForegroundColor Green

# Verificar si XAMPP existe
if (-not (Test-Path "C:\xampp")) {
    Write-Host "❌ XAMPP no encontrado en C:\xampp" -ForegroundColor Red
    exit 1
}

# Intentar iniciar MySQL
Write-Host "🔄 Iniciando MySQL..." -ForegroundColor Yellow
try {
    # Detener cualquier instancia previa
    Get-Process mysqld -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    
    # Esperar un poco
    Start-Sleep -Seconds 2
    
    # Iniciar MySQL
    Start-Process -FilePath "C:\xampp\mysql\bin\mysqld.exe" -ArgumentList "--defaults-file=C:\xampp\mysql\bin\my.ini" -WindowStyle Hidden
    
    # Esperar que se inicie
    Start-Sleep -Seconds 5
    
    # Verificar si está ejecutándose
    $mysqlProcess = Get-Process mysqld -ErrorAction SilentlyContinue
    if ($mysqlProcess) {
        Write-Host "✅ MySQL iniciado correctamente" -ForegroundColor Green
    } else {
        Write-Host "❌ No se pudo iniciar MySQL" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error al iniciar MySQL: $_" -ForegroundColor Red
}

# Intentar iniciar Apache
Write-Host "🔄 Iniciando Apache..." -ForegroundColor Yellow
try {
    Start-Process -FilePath "C:\xampp\apache\bin\httpd.exe" -WindowStyle Hidden
    Start-Sleep -Seconds 3
    
    $apacheProcess = Get-Process httpd -ErrorAction SilentlyContinue
    if ($apacheProcess) {
        Write-Host "✅ Apache iniciado correctamente" -ForegroundColor Green
    } else {
        Write-Host "❌ No se pudo iniciar Apache" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error al iniciar Apache: $_" -ForegroundColor Red
}

Write-Host "🔍 Verificando servicios..." -ForegroundColor Cyan
netstat -an | findstr ":80\|:3306" | ForEach-Object { 
    if ($_ -match ":80") { Write-Host "✅ Apache ejecutándose en puerto 80" -ForegroundColor Green }
    if ($_ -match ":3306") { Write-Host "✅ MySQL ejecutándose en puerto 3306" -ForegroundColor Green }
}

Write-Host "📝 Servicios XAMPP iniciados. Presiona cualquier tecla para continuar..." -ForegroundColor Cyan
