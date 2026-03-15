@echo off
echo ========================================
echo    SherLock - Stopping All Services
echo ========================================
echo.

:: Stop Node.js processes
echo Stopping Node.js backend...
taskkill /F /IM node.exe >nul 2>&1

:: Stop Python processes (be careful - this stops ALL python)
echo Stopping Python AI service...
taskkill /F /FI "WINDOWTITLE eq AI Service*" >nul 2>&1

echo.
echo All services stopped.
echo ========================================
pause
