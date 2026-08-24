const express = require('express');
const { dbAll, dbRun } = require('../db');
const { getLocalSubnets, runScan, getScanStatus } = require('../discovery/scan');

const router = express.Router();

router.get('/api/discovery/subnets', (req, res) => {
  res.json(getLocalSubnets());
});

router.post('/api/discovery/scan', async (req, res) => {
  const { cidr } = req.body || {};
  if (!cidr || !/^\d+\.\d+\.\d+\.\d+\/\d+$/.test(cidr)) {
    return res.status(400).json({ error: 'Valid CIDR required (e.g. 192.168.1.0/24)' });
  }
  const bits = parseInt(cidr.split('/')[1], 10);
  if (bits < 24 || bits > 30) {
    return res.status(400).json({ error: 'CIDR must be between /24 and /30' });
  }
  try {
    const scanId = await runScan(cidr, { concurrency: 20, timeout: 1000 });
    res.json({ scanId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/discovery/results', async (req, res) => {
  const status = req.query.status || 'new';
  const rows = await dbAll(
    'SELECT * FROM discovered_devices WHERE status = ? ORDER BY last_seen DESC LIMIT 200',
    [status]
  );
  res.json(rows);
});

router.post('/api/discovery/adopt', async (req, res) => {
  const { discoveredId, name, type, checkType, port } = req.body || {};
  if (!discoveredId || !name) return res.status(400).json({ error: 'discoveredId and name required' });

  const rows = await dbAll('SELECT * FROM discovered_devices WHERE id = ?', [discoveredId]);
  if (!rows.length) return res.status(404).json({ error: 'Discovered device not found' });
  const disc = rows[0];

  // Insert into devices table
  const result = await dbRun(
    'INSERT INTO devices (name, ip, type, check_type, port) VALUES (?, ?, ?, ?, ?)',
    [name, disc.ip, type || 'router', checkType || 'ping', port || null]
  );

  // Also add to JSON store for backward compat
  const { loadDevices, saveDevices } = require('../utils/devices');
  const devices = loadDevices();
  devices.push({ name, ip: disc.ip, type: type || 'router', checkType: checkType || 'ping', port: port || undefined });
  saveDevices(devices);

  // Mark as adopted
  await dbRun('UPDATE discovered_devices SET status = ?, adopted_device_id = ? WHERE id = ?', ['adopted', result.lastID, discoveredId]);

  res.status(201).json({ id: result.lastID, name, ip: disc.ip });
});

router.post('/api/discovery/ignore', async (req, res) => {
  const { discoveredId } = req.body || {};
  if (!discoveredId) return res.status(400).json({ error: 'discoveredId required' });
  await dbRun('UPDATE discovered_devices SET status = ? WHERE id = ?', ['ignored', discoveredId]);
  res.json({ ok: true });
});

module.exports = router;
