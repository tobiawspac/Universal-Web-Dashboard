const express = require('express');
const { pingDevice, checkDevice } = require('../utils/checks');
const { requireAuth } = require('../auth');

const router = express.Router();

router.post('/ping', requireAuth, async (req, res) => {
  const host = req.body.host || req.query.host;
  if (!host) return res.status(400).json({ error: 'host required' });
  const timeout = parseInt(req.body.timeout || req.query.timeout) || 5000;
  const result = await pingDevice(host, timeout);
  res.json(result);
});

router.post('/ping/bulk', requireAuth, async (req, res) => {
  const hosts = req.body.hosts || [];
  if (!Array.isArray(hosts)) return res.status(400).json({ error: 'hosts must be an array' });
  const timeout = parseInt(req.body.timeout) || 5000;
  const results = await Promise.all(hosts.map((host) => pingDevice(host, timeout)));
  res.json(results);
});

router.post('/check', requireAuth, async (req, res) => {
  const { host, checkType, port, httpPath, https: useHttps, timeout } = req.body || {};
  if (!host) return res.status(400).json({ error: 'host required' });
  const result = await checkDevice(
    { ip: host, checkType, port, httpPath, https: useHttps },
    parseInt(timeout) || 5000
  );
  res.json(result);
});

module.exports = router;
