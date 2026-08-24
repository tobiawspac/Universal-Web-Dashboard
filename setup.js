#!/usr/bin/env node
/**
 * BEACON — One-script installer
 * Works on Windows / macOS / Linux
 * Usage:
 *   node setup.js           # full setup (idempotent)
 *   node setup.js --check   # only verify, no install
 *   node setup.js --force   # force reinstall
 *   npm run setup           # alias
 */

const fs = require('fs');
const path = require('path');
const { spawnSync, execSync } = require('child_process');

const ROOT = __dirname;
const NODE_MIN = 18;

function log(msg) { console.log(msg); }
function ok(msg) { console.log(`\x1b[32m✓\x1b[0m ${msg}`); }
function warn(msg) { console.log(`\x1b[33m!\x1b[0m ${msg}`); }
function fail(msg) { console.error(`\x1b[31m✗\x1b[0m ${msg}`); }

function banner() {
  console.log(`
\x1b[38;2;12;98;145m  ◉ BEACON\x1b[0m — Field Network Monitor  \x1b[2m000004 · FBFEF9 · 0C6291 · A63446 · 7E1946\x1b[0m
  One-script setup · idempotent · cross-platform
`);
}

function checkNode() {
  const v = process.versions.node.split('.').map(Number);
  if (v[0] < NODE_MIN) {
    fail(`Node.js ${NODE_MIN}+ required, found ${process.versions.node}.`);
    fail(`Get it from https://nodejs.org/`);
    process.exit(1);
  }
  ok(`Node.js ${process.versions.node} OK`);
  try {
    const npmV = execSync('npm --version', { encoding: 'utf8' }).trim();
    ok(`npm ${npmV} OK`);
  } catch {
    fail('npm not found. Install Node.js from https://nodejs.org/');
    process.exit(1);
  }
}

function ensureFile(src, dest, label) {
  if (!fs.existsSync(dest)) {
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      ok(`${label} created from ${path.basename(src)}`);
    } else {
      // fallback defaults
      if (label.includes('.env')) {
        fs.writeFileSync(dest, 'PORT=3000\nPASSWORD=admin123\nPING_INTERVAL_MS=60000\nHTTPS_ENABLED=false\nHTTPS_PORT=3443\nSSL_CERT_PATH=./certs/cert.pem\nSSL_KEY_PATH=./certs/key.pem\n');
        ok(`${label} created (defaults)`);
      } else if (label.includes('devices.json')) {
        fs.writeFileSync(dest, '[]', 'utf8');
        ok(`${label} created (empty)`);
      }
    }
  } else {
    ok(`${label} exists`);
  }
}

function ensureDir(dir, label) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    ok(`${label} created`);
  } else {
    ok(`${label} exists`);
  }
}

function runNpmInstall(force) {
  const hasModules = fs.existsSync(path.join(ROOT, 'node_modules'));
  if (!hasModules || force) {
    log(`\n→ Installing dependencies (${force ? 'force' : 'missing'})...`);
    const res = spawnSync('npm', ['install'], { stdio: 'inherit', cwd: ROOT, shell: true });
    if (res.status !== 0) {
      fail('npm install failed. Try: npm install --verbose');
      process.exit(res.status || 1);
    }
    ok('Dependencies installed');
  } else {
    ok('Dependencies present (node_modules)');
    // quick integrity check
    const pkgLock = path.join(ROOT, 'package-lock.json');
    if (fs.existsSync(pkgLock)) {
      // optional: npm ci check not needed
    }
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    check: args.includes('--check'),
    force: args.includes('--force'),
    help: args.includes('--help') || args.includes('-h'),
    seed: args.includes('--seed'),
    skipInstall: args.includes('--skip-install'),
  };
}

function printHelp() {
  console.log(`
Usage: node setup.js [options]

Options:
  --check         Verify setup without installing
  --force         Force reinstall (npm install)
  --seed          Seed demo device if DB empty
  --skip-install  Skip npm install
  --help          Show this

One-liners (fresh clone):
  git clone https://github.com/tobiawspac/Universal-Web-Dashboard.git
  cd Universal-Web-Dashboard
  node setup.js && npm start

  # or with npm:
  npm run setup && npm start

  # or with bash (Linux/macOS/WSL):
  ./setup.sh

  # or Windows:
  setup.bat
`);
}

async function main() {
  banner();
  const opts = parseArgs();
  if (opts.help) { printHelp(); return; }

  checkNode();

  // 1. Ensure structure
  ensureDir(path.join(ROOT, 'certs'), 'certs/');
  ensureDir(path.join(ROOT, 'data'), 'data/');
  // plugins dir may be gitignored but ensure
  ensureDir(path.join(ROOT, 'plugins'), 'plugins/');
  ensureFile(path.join(ROOT, '.env.example'), path.join(ROOT, '.env'), '.env');
  ensureFile(path.join(ROOT, 'devices.json'), path.join(ROOT, 'devices.json'), 'devices.json');

  // 2. Install deps (unless --check or --skip-install)
  if (!opts.check && !opts.skipInstall) {
    runNpmInstall(opts.force);
  } else if (opts.check) {
    const hasModules = fs.existsSync(path.join(ROOT, 'node_modules'));
    log(hasModules ? '✓ node_modules present' : '✗ node_modules missing (run without --check)');
  }

  // 3. Optional seed (only if DB empty)
  if (opts.seed) {
    try {
      const { dbAll } = require('./src/db');
      const rows = await dbAll('SELECT COUNT(*) as c FROM devices');
      if (rows[0].c === 0) {
        const { dbRun } = require('./src/db');
        await dbRun('INSERT INTO devices (name, ip, type) VALUES (?,?,?)', ['Demo Router', '192.168.1.1', 'router']);
        ok('Seeded demo device');
      } else {
        ok('Seed skipped — devices already present');
      }
    } catch (e) {
      warn(`Seed skipped: ${e.message}`);
    }
  }

  // 4. Verify critical files
  const checks = [
    ['package.json', fs.existsSync(path.join(ROOT, 'package.json'))],
    ['public/index.html', fs.existsSync(path.join(ROOT, 'public/index.html'))],
    ['src/server.js', fs.existsSync(path.join(ROOT, 'src/server.js'))],
  ];
  for (const [f, okFlag] of checks) {
    if (okFlag) ok(`${f} OK`);
    else fail(`${f} missing!`);
  }

  log(`
\x1b[32mSetup complete.\x1b[0m

Next:
  \x1b[38;2;12;98;145m  npm start\x1b[0m        — start HTTP on http://localhost:3000 (password: admin123)
  \x1b[38;2;12;98;145m  start.bat\x1b[0m        — Windows one-click
  \x1b[38;2;12;98;145m  ./setup.sh\x1b[0m       — Unix one-click (calls this)
  \x1b[38;2;12;98;145m  docker compose up\x1b[0m — Docker one-command (if Docker installed)

Health:
  curl http://localhost:3000/health
  npm test
  npm run health

Config: edit \x1b[2m.env\x1b[0m (see \x1b[2m.env.example\x1b[0m)
`);
}

main().catch(e => { fail(e.message); console.error(e); process.exit(1); });
