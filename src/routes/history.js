const express = require('express');
const { dbAll } = require('../db');
const router = express.Router();

async function getSummaryForHost(host, hours = 24) {
  const since = Date.now() - hours * 60 * 60 * 1000;
  try {
    const rows = await dbAll(
      `SELECT timestamp, alive, latency_ms FROM ping_history WHERE host = ? AND timestamp >= ? ORDER BY timestamp ASC`,
      [host, since]
    );
    if (!rows.length) {
      return { uptimePercent: 0, avgLatencyMs: null, lastStatus: 'unknown', totalChecks: 0 };
    }
    const onlineCount = rows.filter((r) => r.alive === 1).length;
    const uptimePercent = Number(((onlineCount / rows.length) * 100).toFixed(1));
    const latencies = rows.filter((r) => r.latency_ms !== null).map((r) => r.latency_ms);
    const avgLatencyMs = latencies.length ? Math.round(latencies.reduce((s, v) => s + v, 0) / latencies.length) : null;
    const lastRow = rows[rows.length - 1];
    return {
      uptimePercent,
      avgLatencyMs,
      lastStatus: lastRow.alive === 1 ? 'online' : 'offline',
      totalChecks: rows.length,
    };
  } catch {
    return { uptimePercent: 0, avgLatencyMs: null, lastStatus: 'unknown', totalChecks: 0 };
  }
}

router.get('/history/:host', async (req, res) => {
  const { host } = req.params;
  const rangeMinutes = parseInt(req.query.range || '60', 10) || 60;
  const since = Date.now() - rangeMinutes * 60 * 1000;

  try {
    const rows = await dbAll(
      `SELECT host, device_name, timestamp, alive, latency_ms, packet_loss
       FROM ping_history WHERE host = ? AND timestamp >= ? ORDER BY timestamp ASC LIMIT 200`,
      [host, since]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/summary/:host', async (req, res) => {
  const hours = parseInt(req.query.hours || '24', 10) || 24;
  const summary = await getSummaryForHost(req.params.host, hours);
  res.json(summary);
});

router.get('/api/dashboard-summary', async (req, res) => {
  const { dbAll } = require('../db');
  const { loadDevices } = require('../utils/devices');
  const { checkDevice } = require('../utils/checks');
  let devices = [];
  try {
    const rows = await dbAll('SELECT * FROM devices ORDER BY id');
    if (rows.length) {
      devices = rows.map((r) => ({
        id: r.id,
        name: r.name,
        ip: r.ip,
        type: r.type,
        checkType: r.check_type || 'ping',
        port: r.port,
        httpPath: r.http_path,
        https: !!r.https,
        notes: r.notes,
      }));
    } else {
      devices = loadDevices();
    }
  } catch {
    devices = loadDevices();
  }
  const results = await Promise.all(
    devices.map(async (device) => {
      const host = device.ip || device.host;
      const [live, summary] = await Promise.all([
        checkDevice(device, 4000),
        getSummaryForHost(host, 24),
      ]);
      return { ...device, live, summary };
    })
  );
  res.json(results);
});

module.exports = router;
module.exports.getSummaryForHost = getSummaryForHost;
