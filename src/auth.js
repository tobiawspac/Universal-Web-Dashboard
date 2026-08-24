const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const config = require('./config');
const { dbRun, dbAll } = require('./db');

const sessions = new Map();
const loginAttempts = new Map();

const LOGIN_MAX_ATTEMPTS = 20;
const LOGIN_WINDOW_MS = 5 * 60 * 1000;
const BCRYPT_ROUNDS = 10;

let hashedPassword = null;
let totpSecret = null;
let totpEnabled = false;


function hashPassword(plaintext) {
  return bcrypt.hashSync(plaintext, BCRYPT_ROUNDS);
}

function verifyPassword(plaintext, hash) {
  return bcrypt.compareSync(plaintext, hash);
}

async function loadSettings() {
  try {
    const rows = await dbAll("SELECT key, value FROM settings WHERE key IN ('password_hash','totp_secret','totp_enabled')");
    for (const row of rows) {
      if (row.key === 'password_hash') hashedPassword = row.value;
      if (row.key === 'totp_secret') totpSecret = row.value;
      if (row.key === 'totp_enabled') totpEnabled = row.value === '1';
    }
  } catch {}
}

async function saveSetting(key, value) {
  const existing = await dbAll('SELECT key FROM settings WHERE key = ?', [key]);
  if (existing.length) {
    await dbRun('UPDATE settings SET value = ? WHERE key = ?', [String(value), key]);
  } else {
    await dbRun('INSERT INTO settings (key, value) VALUES (?, ?)', [key, String(value)]);
  }
}

async function initAuth() {
  await loadSettings();
  if (!hashedPassword) {
    if (config.password.startsWith('$2')) {
      hashedPassword = config.password;
    } else {
      hashedPassword = hashPassword(config.password);
    }
    await saveSetting('password_hash', hashedPassword);
  }
  console.log('[INFO] Auth initialized.');
}

// Called explicitly from server.js after migrations, NOT auto-invoked on require.

function getHashedPassword() {
  return hashedPassword;
}

async function setPassword(newPassword) {
  hashedPassword = hashPassword(newPassword);
  await saveSetting('password_hash', hashedPassword);
}

function getTotpSecret() {
  return totpSecret;
}

function isTotpEnabled() {
  return totpEnabled;
}

async function setTotpSecret(secret) {
  totpSecret = secret;
  await saveSetting('totp_secret', secret);
}

async function setTotpEnabled(enabled) {
  totpEnabled = enabled;
  await saveSetting('totp_enabled', enabled ? '1' : '0');
}

function createSession() {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, Date.now() + config.sessionTtlMs);
  return token;
}

function isValidSession(token) {
  if (!token) return false;
  const expiry = sessions.get(token);
  if (!expiry) return false;
  if (expiry < Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function deleteSession(token) {
  sessions.delete(token);
}

function getAllSessions() {
  const now = Date.now();
  const active = [];
  for (const [token, expiry] of sessions) {
    if (expiry > now) active.push({ token: token.substring(0, 8) + '...', expiresAt: expiry });
  }
  return active;
}

setInterval(() => {
  const now = Date.now();
  for (const [token, expiry] of sessions) {
    if (expiry < now) sessions.delete(token);
  }
}, 10 * 60 * 1000);

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || entry.resetAt < now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return true;
  }
  if (entry.count >= LOGIN_MAX_ATTEMPTS) return false;
  entry.count += 1;
  return true;
}

function requireAuth(req, res, next) {
  if (isValidSession(req.cookies[config.sessionCookie])) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

module.exports = {
  hashPassword,
  verifyPassword,
  getHashedPassword,
  setPassword,
  getTotpSecret,
  isTotpEnabled,
  setTotpSecret,
  setTotpEnabled,
  createSession,
  isValidSession,
  deleteSession,
  getAllSessions,
  checkRateLimit,
  requireAuth,
  initAuth,
};
