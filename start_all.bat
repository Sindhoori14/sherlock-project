@echo off
echo ========================================
echo    SherLock - Starting All Services
echo ========================================
echo.

:: Start AI Service (Python Flask on port 5001)
echo [1/2] Starting AI Service on port 5001...
start "AI Service - Port 5001" cmd /k "cd /d %~dp0ai_service && python app.py"

:: Wait 5 seconds for AI to initialize
echo Waiting for AI service to initialize...
timeout /t 5 /nobreak >nul

:: Start Backend (Node.js on port 5000)
echo [2/2] Starting Backend on port 5000...
start "Backend - Port 5000" cmd /k "cd /d %~dp0backend && node server.js"

echo.
echo ========================================
echo    All Services Started!
echo ========================================
echo.
echo    AI Service:  http://localhost:5001
echo    Backend:     http://localhost:5000
echo    Frontend:    http://localhost:5000
echo.
echo    Admin Login: admin / Admin@123
echo ========================================
echo.
pause
