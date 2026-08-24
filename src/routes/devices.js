const express = require('express');
const { isValidHost, isValidPort } = require('../utils/validators');
const { loadDevices, saveDevices } = require('../utils/devices');
const { requireAuth } = require('../auth');
const { dbAll, dbRun } = require('../db');

const router = express.Router();

router.get('/devices', requireAuth, async (req, res) => {
  // Try SQLite first (has IDs), fallback to JSON
  try {
    const rows = await dbAll('SELECT * FROM devices ORDER BY id');
    if (rows.length > 0) return res.json(rows);
  } catch {}
  res.json(loadDevices());
});

router.post('/devices', requireAuth, async (req, res) => {
  const { name, ip, type, checkType, port, httpPath, https: useHttps, notes, _delete, snmp_enabled, snmp_community } = req.body || {};

  if (_delete) {
    // Delete from SQLite
    try { await dbRun('DELETE FROM devices WHERE ip = ?', [ip]); } catch {}
    // Delete from JSON
    const devices = loadDevices();
    const updatedDevices = devices.filter((d) => !(d.name === name && d.ip === ip));
    saveDevices(updatedDevices);
    return res.json({ ok: true, message: 'Device deleted' });
  }

  if (!name || !ip) {
    return res.status(400).json({ error: 'name and ip are required' });
  }
  if (!isValidHost(ip)) {
    return res.status(400).json({ error: 'ip/host contains invalid characters' });
  }
  if (port !== undefined && port !== '' && !isValidPort(port)) {
    return res.status(400).json({ error: 'invalid port' });
  }

  const nextDevice = {
    name,
    ip,
    type: type || 'router',
    checkType: ['ping', 'http', 'tcp'].includes(checkType) ? checkType : 'ping',
    port: port ? Number(port) : undefined,
    httpPath: httpPath || undefined,
    https: !!useHttps,
    notes: notes || undefined,
  };

  // Upsert into SQLite
  let deviceId = null;
  try {
    const existing = await dbAll('SELECT id FROM devices WHERE ip = ?', [ip]);
    if (existing.length) {
      await dbRun(
        `UPDATE devices SET name=?, type=?, check_type=?, port=?, http_path=?, https=?, notes=?, snmp_enabled=?, snmp_community=? WHERE ip=?`,
        [nextDevice.name, nextDevice.type, nextDevice.checkType, nextDevice.port || null, nextDevice.httpPath || null, nextDevice.https ? 1 : 0, nextDevice.notes || null, snmp_enabled ? 1 : 0, snmp_community || null, ip]
      );
      deviceId = existing[0].id;
    } else {
      const result = await dbRun(
        `INSERT INTO devices (name, ip, type, check_type, port, http_path, https, notes, snmp_enabled, snmp_community) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [nextDevice.name, ip, nextDevice.type, nextDevice.checkType, nextDevice.port || null, nextDevice.httpPath || null, nextDevice.https ? 1 : 0, nextDevice.notes || null, snmp_enabled ? 1 : 0, snmp_community || null]
      );
      deviceId = result.lastID;
    }
  } catch (err) {
    console.error('SQLite device upsert failed:', err.message);
  }

  // Also maintain JSON file for backward compat
  const devices = loadDevices();
  const existingIndex = devices.findIndex((d) => d.ip === ip);
  if (existingIndex >= 0) {
    devices[existingIndex] = nextDevice;
  } else {
    devices.push(nextDevice);
  }
  saveDevices(devices);

  res.status(201).json({ id: deviceId, ...nextDevice });
});

module.exports = router;
