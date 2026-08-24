@echo off
chcp 65001 >nul
echo ========================================
echo Universal Web Dashboard - Starting...
echo ========================================
echo.

REM Check if node_modules exists, if not install dependencies
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
)

echo Starting server...
echo Default password: admin123 (override with the PASSWORD env var)
echo Access at: http://localhost:3000
node app.js