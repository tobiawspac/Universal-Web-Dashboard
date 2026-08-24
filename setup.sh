#!/usr/bin/env bash
set -e

# BEACON — One-script setup for Linux / macOS / WSL / Git Bash
# Usage: ./setup.sh [--force] [--seed] [--check]
# From GitHub:
#   git clone https://github.com/tobiawspac/Universal-Web-Dashboard.git
#   cd Universal-Web-Dashboard
#   ./setup.sh && npm start

echo "◉ BEACON — setup.sh (000004 · FBFEF9 · 0C6291 · A63446 · 7E1946)"
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "✗ node not found. Install Node.js 18+ from https://nodejs.org/"
  exit 1
fi

echo "→ Running node setup.js $@"
node setup.js "$@"
