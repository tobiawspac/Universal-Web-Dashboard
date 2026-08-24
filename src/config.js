require('dotenv').config();
const path = require('path');

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  password: process.env.PASSWORD || 'admin123',
  pingIntervalMs: parseInt(process.env.PING_INTERVAL_MS, 10) || 60000,
  httpsEnabled: process.env.HTTPS_ENABLED === 'true',
  httpsPort: parseInt(process.env.HTTPS_PORT, 10) || 3443,
  sslCertPath: process.env.SSL_CERT_PATH || path.join(__dirname, '..', 'certs', 'cert.pem'),
  sslKeyPath: process.env.SSL_KEY_PATH || path.join(__dirname, '..', 'certs', 'key.pem'),
  sessionCookie: 'dashboard_session',
  sessionTtlMs: 24 * 60 * 60 * 1000,
  devicesFile: path.join(__dirname, '..', 'devices.json'),
  dbPath: path.join(__dirname, '..', 'devices.db'),
};

module.exports = config;
