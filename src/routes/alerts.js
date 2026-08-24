const express = require('express');
const { dbAll, dbRun } = require('../db');
const { requireAuth } = require('../auth');
const { encryptConfig, decryptConfig, safeConfigForResponse } = require('../alerts/config');
const alertManager = require('../alerts/manager');
const channels = require('../alerts/channels');

const router = express.Router();

// --- Alert Channels CRUD ---
router.get('/api/alerts/channels', requireAuth, async (req, res) => {
  const rows = await dbAll('SELECT * FROM alert_channels ORDER BY created_at DESC');
  res.json(rows.map((r) => ({
    ...r,
    config_json: safeConfigForResponse(JSON.parse(r.config_json)),
  })));
});

router.post('/api/alerts/channels', requireAuth, async (req, res) => {
  const { type, name, config } = req.body || {};
  if (!type || !name || !config) return res.status(400).json({ error: 'type, name, config required' });
  if (!['webhook', 'discord', 'telegram', 'email'].includes(type)) {
    return res.status(400).json({ error: 'Invalid channel type' });
  }
  const encrypted = encryptConfig(config);
  const result = await dbRun(
    'INSERT INTO alert_channels (type, name, config_json, enabled) VALUES (?, ?, ?, 1)',
    [type, name, JSON.stringify(encrypted)]
  );
  res.status(201).json({ id: result.lastID, type, name });
});

router.put('/api/alerts/channels/:id', requireAuth, async (req, res) => {
  const { name, config, enabled } = req.body || {};
  const updates = [];
  const params = [];
  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (config !== undefined) { updates.push('config_json = ?'); params.push(JSON.stringify(encryptConfig(config))); }
  if (enabled !== undefined) { updates.push('enabled = ?'); params.push(enabled ? 1 : 0); }
  if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
  params.push(req.params.id);
  await dbRun(`UPDATE alert_channels SET ${updates.join(', ')} WHERE id = ?`, params);
  res.json({ ok: true });
});

router.delete('/api/alerts/channels/:id', requireAuth, async (req, res) => {
  await dbRun('DELETE FROM alert_channels WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

router.post('/api/alerts/channels/:id/test', requireAuth, async (req, res) => {
  const rows = await dbAll('SELECT * FROM alert_channels WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Channel not found' });
  const ch = rows[0];
  const config = decryptConfig(JSON.parse(ch.config_json));
  const sendFn = channels[ch.type];
  if (!sendFn) return res.status(400).json({ error: 'Unknown channel type' });

  const testAlert = {
    deviceName: 'Test Device',
    ip: '127.0.0.1',
    eventType: 'device_down',
    message: 'Test alert from Universal Web Dashboard',
    timestamp: new Date().toISOString(),
    downtimeSec: 0,
  };
  const result = await sendFn(testAlert, config);
  res.json(result);
});

// --- Alert Rules ---
router.get('/api/alerts/rules', requireAuth, async (req, res) => {
  const deviceId = req.query.deviceId;
  const rules = await alertManager.getRules(deviceId ? Number(deviceId) : undefined);
  res.json(rules);
});

router.put('/api/alerts/rules/:deviceId', requireAuth, async (req, res) => {
  const { debounceCount, cooldownSec, enabled } = req.body || {};
  await alertManager.setRule(Number(req.params.deviceId), { debounceCount, cooldownSec, enabled });
  res.json({ ok: true });
});

// --- Alert Log ---
router.get('/api/alerts/log', requireAuth, async (req, res) => {
  const limit = parseInt(req.query.limit || '100', 10);
  const deviceId = req.query.deviceId;
  let sql = 'SELECT al.*, d.name as device_name FROM alert_log al LEFT JOIN devices d ON al.device_id = d.id';
  const params = [];
  if (deviceId) { sql += ' WHERE al.device_id = ?'; params.push(Number(deviceId)); }
  sql += ' ORDER BY al.sent_at DESC LIMIT ?';
  params.push(limit);
  const rows = await dbAll(sql, params);
  res.json(rows);
});

// --- Maintenance Windows ---
router.get('/api/maintenance', requireAuth, async (req, res) => {
  const rows = await dbAll('SELECT mw.*, d.name as device_name FROM maintenance_windows mw LEFT JOIN devices d ON mw.device_id = d.id ORDER BY mw.starts_at DESC');
  res.json(rows);
});

router.post('/api/maintenance', requireAuth, async (req, res) => {
  const { deviceId, startsAt, endsAt, note } = req.body || {};
  if (!deviceId || !startsAt || !endsAt) return res.status(400).json({ error: 'deviceId, startsAt, endsAt required' });
  const result = await dbRun(
    'INSERT INTO maintenance_windows (device_id, starts_at, ends_at, note) VALUES (?, ?, ?, ?)',
    [deviceId, startsAt, endsAt, note || null]
  );
  res.status(201).json({ id: result.lastID });
});

router.delete('/api/maintenance/:id', requireAuth, async (req, res) => {
  await dbRun('DELETE FROM maintenance_windows WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
