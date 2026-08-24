# BEACON — Field Network Monitor — Start Script
Write-Host "========================================" -ForegroundColor DarkCyan
Write-Host " BEACON — Field Network Monitor" -ForegroundColor Cyan
Write-Host " 000004 · FBFEF9 · 0C6291 · A63446 · 7E1946" -ForegroundColor Gray
Write-Host "========================================`n"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "✗ Node.js 18+ required. Get it at https://nodejs.org/" -ForegroundColor Red
  exit 1
}

# One-script setup (idempotent)
if (Test-Path "setup.js") {
  Write-Host "→ Verifying setup..." -ForegroundColor Yellow
  node setup.js --skip-install
  if ($LASTEXITCODE -ne 0) {
    Write-Host "→ Running full setup..." -ForegroundColor Yellow
    node setup.js
  }
} elseif (-not (Test-Path "node_modules")) {
  Write-Host "Installing dependencies..." -ForegroundColor Yellow
  npm install
}

Write-Host "`nStarting server..." -ForegroundColor Green
Write-Host "Default password: admin123 (override with PASSWORD in .env)"
Write-Host "Access at: http://localhost:3000  Health: http://localhost:3000/health"
Write-Host "Press Ctrl+C to stop`n"
node app.js
