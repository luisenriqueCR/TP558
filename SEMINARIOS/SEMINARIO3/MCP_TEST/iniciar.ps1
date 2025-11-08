#!/usr/bin/env pwsh
# Script para iniciar PDF2Agent con un solo click
# Ejecutar con: PowerShell -NoProfile -ExecutionPolicy Bypass -File "iniciar.ps1"

Write-Host "`n" -ForegroundColor Green
Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   INICIANDO PDF2AGENT ANALYZER            ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# Paso 1: Limpiar procesos anteriores
Write-Host "[1/3] Limpiando procesos anteriores..." -ForegroundColor Cyan
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# Paso 2: Iniciar servidor en nueva ventana
Write-Host "[2/3] Iniciando servidor..." -ForegroundColor Cyan
$serverPath = "c:\Users\luise\Downloads\agtmcp\pdf-agent-backend"
$pwshExe = (Get-Command powershell).Source

Start-Process -FilePath $pwshExe -ArgumentList @(
    "-NoProfile",
    "-Command",
    "cd '$serverPath'; node server-llm.js; Read-Host 'Presiona Enter para cerrar'"
) -WindowStyle Normal

# Esperar a que inicie (5 segundos)
Start-Sleep -Seconds 5

# Paso 3: Abrir navegador
Write-Host "[3/3] Abriendo interfaz en navegador..." -ForegroundColor Cyan
$htmlPath = "c:\Users\luise\Downloads\agtmcp\pdf2agent-real.html"
Start-Process $htmlPath

Write-Host ""
Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   ✅ SISTEMA INICIADO                     ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "📊 INFORMACIÓN:" -ForegroundColor Yellow
Write-Host "   Servidor: http://localhost:3001" -ForegroundColor White
Write-Host "   Interfaz: pdf2agent-real.html" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  IMPORTANTE:" -ForegroundColor Yellow
Write-Host "   NO cierres la ventana del servidor" -ForegroundColor White
Write-Host ""
