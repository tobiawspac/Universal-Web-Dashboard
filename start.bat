@echo off
chcp 65001 >nul
echo ========================================
echo  BEACON — Field Network Monitor
echo  000004 · FBFEF9 · 0C6291 · A63446 · 7E1946
echo ========================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
  echo ✗ Node.js 18+ required. Get it at https://nodejs.org/
  pause
  exit /b 1
)

REM One-script setup (idempotent, creates .env/devices.json/certs if missing)
if exist "setup.js" (
  echo → Verifying setup...
  node setup.js --skip-install
  if %ERRORLEVEL% neq 0 (
    echo → Setup failed, running full setup...
    node setup.js
  )
) else (
  if not exist "node_modules" (
    echo Installing dependencies...
    npm install
  )
)

echo.
echo Starting server...
echo Default password: admin123 (override with PASSWORD in .env)
echo Access at: http://localhost:3000  Health: http://localhost:3000/health
echo Press Ctrl+C to stop
echo.
node app.js
