const http = require('http');
const https = require('https');
const fs = require('fs');
const config = require('./config');
const app = require('./app');
const { monitorAllDevices } = require('./monitor');
const { runMigrations } = require('./migrations');
const { initRealtime } = require('./realtime');
const { initAuth } = require('./auth');

const httpServer = http.createServer(app);

if (config.httpsEnabled) {
  try {
    const cert = fs.readFileSync(config.sslCertPath);
    const key = fs.readFileSync(config.sslKeyPath);
    const httpsServer = https.createServer({ cert, key }, app);
    initRealtime(httpsServer);
    httpsServer.listen(config.httpsPort, () => {
      console.log(`Dashboard HTTPS listening on ${config.httpsPort}`);
    });
  } catch (err) {
    console.error(`[WARN] HTTPS disabled: ${err.message}`);
    console.error('[INFO] Generate certs with: openssl req -x509 -newkey rsa:2048 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes');
  }
}

initRealtime(httpServer);

async function start() {
  await runMigrations();
  await initAuth();
  httpServer.listen(config.port, () => {
    console.log(`Dashboard HTTP listening on ${config.port}`);
  });
  monitorAllDevices().catch((error) => console.error('Initial monitor failed:', error));
  setInterval(() => {
    monitorAllDevices().catch((error) => console.error('Monitor task failed:', error));
  }, config.pingIntervalMs);
}

start().catch((error) => {
  console.error('Startup failed:', error);
  process.exit(1);
});

module.exports = { app, httpServer };
