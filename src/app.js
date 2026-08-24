const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const historyRoutes = require('./routes/history');
const checkRoutes = require('./routes/checks');
const alertRoutes = require('./routes/alerts');
const discoveryRoutes = require('./routes/discovery');
const snmpRoutes = require('./routes/snmp');
const pluginRoutes = require('./routes/plugins');

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(authRoutes);
app.use(deviceRoutes);
app.use(historyRoutes);
app.use(checkRoutes);
app.use(alertRoutes);
app.use(discoveryRoutes);
app.use(snmpRoutes);
app.use(pluginRoutes);

app.get('/', (req, res) => res.json({ ok: true, service: 'dashboard' }));

module.exports = app;
