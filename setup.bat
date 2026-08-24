@echo off
chcp 65001 >nul
echo ◉ BEACON — setup.bat (000004 · FBFEF9 · 0C6291 · A63446 · 7E1946)
echo.

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
  echo ✗ node not found. Install Node.js 18+ from https://nodejs.org/
  exit /b 1
)

echo → Running node setup.js %*
node setup.js %*
if %ERRORLEVEL% neq 0 exit /b %ERRORLEVEL%
