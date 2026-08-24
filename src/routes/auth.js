const express = require('express');
const config = require('../config');
const { verifyPassword, getHashedPassword, checkRateLimit, createSession, deleteSession, isValidSession, isTotpEnabled, getTotpSecret, setPassword, setTotpSecret, setTotpEnabled, getAllSessions } = require('../auth');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');

const router = express.Router();

router.post('/api/login', (req, res) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many attempts. Try again in a minute.' });
  }

  const { password, totpCode } = req.body || {};
  if (typeof password !== 'string' || !verifyPassword(password, getHashedPassword())) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  // Check 2FA if enabled
  if (isTotpEnabled()) {
    if (!totpCode) {
      return res.status(200).json({ ok: false, requires2fa: true });
    }
    const secret = getTotpSecret();
    const isValid = authenticator.verify({ token: totpCode, secret });
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid 2FA code' });
    }
  }

  const token = createSession();
  res.cookie(config.sessionCookie, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.secure,
    maxAge: config.sessionTtlMs,
    path: '/',
  });
  res.json({ ok: true });
});

router.post('/api/logout', (req, res) => {
  const token = req.cookies[config.sessionCookie];
  if (token) deleteSession(token);
  res.cookie(config.sessionCookie, '', { httpOnly: true, expires: new Date(0), path: '/' });
  res.json({ ok: true });
});

router.get('/api/check-auth', (req, res) => {
  res.json({
    authenticated: isValidSession(req.cookies[config.sessionCookie]),
    totpEnabled: isTotpEnabled(),
  });
});

// --- Settings ---
router.get('/api/settings/status', (req, res) => {
  res.json({
    totpEnabled: isTotpEnabled(),
    sessionCount: getAllSessions().length,
  });
});

router.post('/api/settings/password', async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword required' });
  }
  if (!verifyPassword(currentPassword, getHashedPassword())) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  if (newPassword.length < 4) {
    return res.status(400).json({ error: 'New password must be at least 4 characters' });
  }
  await setPassword(newPassword);
  res.json({ ok: true, message: 'Password changed' });
});

router.post('/api/settings/2fa/setup', async (req, res) => {
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri('Universal Web Dashboard', 'dashboard', secret);
  try {
    const qrDataUrl = await QRCode.toDataURL(otpauth);
    await setTotpSecret(secret);
    res.json({ secret, qrCode: qrDataUrl, otpauth });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/settings/2fa/verify', async (req, res) => {
  const { code } = req.body || {};
  const secret = getTotpSecret();
  if (!secret) return res.status(400).json({ error: 'Run /api/settings/2fa/setup first' });
  const isValid = authenticator.verify({ token: code, secret });
  if (!isValid) return res.status(400).json({ error: 'Invalid code' });
  await setTotpEnabled(true);
  res.json({ ok: true, message: '2FA enabled' });
});

router.post('/api/settings/2fa/disable', async (req, res) => {
  const { password } = req.body || {};
  if (!password || !verifyPassword(password, getHashedPassword())) {
    return res.status(401).json({ error: 'Password required to disable 2FA' });
  }
  await setTotpEnabled(false);
  await setTotpSecret(null);
  res.json({ ok: true, message: '2FA disabled' });
});

router.get('/api/settings/sessions', (req, res) => {
  res.json(getAllSessions());
});

router.get('/health', (req, res) => res.json({ ok: true, service: 'dashboard' }));

module.exports = router;
