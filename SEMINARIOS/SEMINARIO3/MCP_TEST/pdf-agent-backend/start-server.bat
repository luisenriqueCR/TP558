@echo off
REM PDF2Agent Real Analysis Server Launcher
setlocal enabledelayedexpansion

cd /d c:\Users\luise\Downloads\agtmcp\pdf-agent-backend

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║      PDF2Agent - Real Analysis Backend Server              ║
echo ║            Starting on http://localhost:3001               ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

:restart
echo [%date% %time%] Starting server-real.js...
node server-real.js

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Server crashed with exit code %ERRORLEVEL%
    echo Waiting 5 seconds before restart...
    timeout /t 5 /nobreak
    goto restart
) else (
    echo.
    echo Server finished normally
)

pause
