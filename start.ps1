# Universal Web Dashboard - Start Script
Write-Host "========================================"
Write-Host "Universal Web Dashboard - Starting..."
Write-Host "========================================`n"

# Check if node_modules exists, if not install dependencies
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..."
    npm install
}

Write-Host "Starting server..."
Write-Host "Default password: admin123"
Write-Host "Access at: http://localhost:3000"
node app.js