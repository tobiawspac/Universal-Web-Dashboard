const express = require('express');
const path = require('path');
const { requireAuth } = require('../auth');
const { dbAll, dbRun } = require('../db');
const registry = require('../plugins/registry');
const { runPluginCheck } = require('../plugins/loader');

const router = express.Router();

router.get('/api/plugins', requireAuth, async (req, res) => {
  const rows = await dbAll('SELECT * FROM plugins ORDER BY installed_at DESC');
  res.json(rows.map((r) => ({
    ...r,
    manifest: JSON.parse(r.manifest_json),
    type: JSON.parse(r.type_json),
  })));
});

router.post('/api/plugins/upload', requireAuth, async (req, res) => {
  // Accept raw buffer from multer or manual body
  const zipBuffer = req.body;
  if (!zipBuffer || !Buffer.isBuffer(zipBuffer)) {
    return res.status(400).json({ error: 'ZIP file required (multipart/form-data or raw body)' });
  }
  try {
    const result = await registry.install(zipBuffer);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/api/plugins/:id/enable', requireAuth, async (req, res) => {
  try { await registry.enable(req.params.id); res.json({ ok: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/api/plugins/:id/disable', requireAuth, async (req, res) => {
  try { await registry.disable(req.params.id); res.json({ ok: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/api/plugins/:id', requireAuth, async (req, res) => {
  try { await registry.uninstall(req.params.id); res.json({ ok: true }); }
  catch (err) { res.status(409).json({ error: err.message }); }
});

router.get('/api/plugins/:id/widget.js', requireAuth, (req, res) => {
  const manifest = registry.get(req.params.id);
  if (!manifest) return res.status(404).send('Plugin not found');
  const widgetFile = path.join(registry.getPluginDir(req.params.id), manifest.widgetEntry || 'widget.js');
  res.sendFile(widgetFile);
});

router.put('/api/plugins/:id/device-config/:deviceId', requireAuth, async (req, res) => {
  const { config } = req.body || {};
  const existing = await dbAll(
    'SELECT id FROM plugin_device_config WHERE plugin_id = ? AND device_id = ?',
    [req.params.id, req.params.deviceId]
  );
  if (existing.length) {
    await dbRun('UPDATE plugin_device_config SET config_json = ? WHERE id = ?', [JSON.stringify(config), existing[0].id]);
  } else {
    await dbRun(
      'INSERT INTO plugin_device_config (device_id, plugin_id, config_json) VALUES (?, ?, ?)',
      [req.params.deviceId, req.params.id, JSON.stringify(config)]
    );
  }
  res.json({ ok: true });
});

module.exports = router;
