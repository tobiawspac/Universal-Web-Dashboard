const express = require('express');
const { dbAll } = require('../db');
const { requireAuth } = require('../auth');
const { snmpProbe, snmpInterfaces } = require('../discovery/snmp');

const router = express.Router();

router.post('/api/snmp/probe', requireAuth, async (req, res) => {
  const { ip, community } = req.body || {};
  if (!ip) return res.status(400).json({ error: 'ip required' });
  const result = await snmpProbe(ip, community || 'public');
  res.json(result);
});

router.get('/api/snmp/:deviceId/interfaces', requireAuth, async (req, res) => {
  const deviceId = req.params.deviceId;

  // Get latest interfaces
  const latest = await dbAll(
    `SELECT a.* FROM snmp_interface_history a
     INNER JOIN (SELECT device_id, if_index, MAX(timestamp) as max_ts FROM snmp_interface_history WHERE device_id = ? GROUP BY if_index) b
     ON a.device_id = b.device_id AND a.if_index = b.if_index AND a.timestamp = b.max_ts`,
    [deviceId]
  );

  // Get history for charts (last 60 entries per interface)
  const history = await dbAll(
    'SELECT * FROM snmp_interface_history WHERE device_id = ? ORDER BY timestamp DESC LIMIT 200',
    [deviceId]
  );

  res.json({ interfaces: latest, history });
});

module.exports = router;
