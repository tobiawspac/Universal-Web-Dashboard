@echo off
chcp 65001 >nul
echo ========================================
echo Universal Web Dashboard - Deployment
echo ========================================
echo.

REM Install dependencies
if exist "package.json" (
    echo Installing/Updating dependencies...
    npm install
)

echo.
echo ========================================
echo Deployment Options:
echo ========================================
echo 1. Start server (default port 3000)
echo 2. Start with custom port
echo 3. Exit
echo.

set /p choice=Enter your choice (1-3): 

if "%choice%"=="1" (
    goto start_default
) else if "%choice%"=="2" (
    goto start_custom
) else if "%choice%"=="3" (
    goto exit
) else (
    goto start_default
)

:start_default
echo.
echo Starting server on port 3000...
echo Default password: admin123 (override with the PASSWORD env var)
echo Access at: http://localhost:3000
echo Press Ctrl+C to stop
node app.js
goto end

:start_custom
set /p port=Enter port number: 
if "%port%"=="" set port=3000
echo.
echo Starting server on port %port%...
echo Default password: admin123 (override with the PASSWORD env var)
echo Access at: http://localhost:%port%
echo Press Ctrl+C to stop
set PORT=%port%
node app.js
goto end

:exit
echo Exiting...
goto end

:end
echo.
echo Done.