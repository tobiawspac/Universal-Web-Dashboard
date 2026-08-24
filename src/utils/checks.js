const { execFile } = require('child_process');
const net = require('net');
const http = require('http');
const https = require('https');
const os = require('os');
const { isValidHost, isValidPort } = require('./validators');

function parseLatency(stdout) {
  if (!stdout) return null;
  const text = String(stdout);
  const regexes = [
    /time[=<]\s*(\d+(?:\.\d+)?)\s*ms/i,
    /Average\s*=\s*(\d+(?:\.\d+)?)ms/i,
  ];
  for (const regex of regexes) {
    const match = text.match(regex);
    if (match) return Math.round(Number(match[1]));
  }
  return null;
}

function pingDevice(host, timeoutMs = 5000) {
  return new Promise((resolve) => {
    if (!isValidHost(host)) {
      return resolve({ host, alive: false, latencyMs: null, error: 'invalid host' });
    }

    const isWindows = os.platform() === 'win32';
    const args = isWindows
      ? ['-n', '1', '-w', String(Math.max(1000, timeoutMs)), host]
      : ['-c', '1', '-W', String(Math.max(1, Math.ceil(timeoutMs / 1000))), host];

    const started = Date.now();
    let settled = false;

    const child = execFile('ping', args, { timeout: timeoutMs + 2000 }, (err, stdout) => {
      if (settled) return;
      settled = true;
      const out = (stdout || '').toLowerCase();
      const latencyMs = parseLatency(stdout || '');
      const elapsed = Date.now() - started;
      const alive = !err && (out.includes('ttl') || out.includes('bytes from') || out.includes('reply from') || latencyMs !== null);

      if (err && !alive) {
        return resolve({ host, alive: false, latencyMs: null, error: err.message });
      }
      resolve({ host, alive, latencyMs: alive ? (latencyMs ?? elapsed) : null });
    });

    setTimeout(() => {
      if (settled) return;
      settled = true;
      try { child.kill(); } catch (e) {}
      resolve({ host, alive: false, latencyMs: null, error: 'timeout' });
    }, timeoutMs + 1000);
  });
}

function tcpCheck(host, port, timeoutMs = 5000) {
  return new Promise((resolve) => {
    if (!isValidHost(host) || !isValidPort(port)) {
      return resolve({ host, alive: false, latencyMs: null, error: 'invalid host/port' });
    }
    const started = Date.now();
    const socket = new net.Socket();
    let settled = false;

    const finish = (alive, error) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({ host, alive, latencyMs: alive ? Date.now() - started : null, error });
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false, 'timeout'));
    socket.once('error', (err) => finish(false, err.message));
    socket.connect(port, host);
  });
}

function httpCheck(host, { port, path: urlPath = '/', useHttps = false } = {}, timeoutMs = 5000) {
  return new Promise((resolve) => {
    if (!isValidHost(host)) {
      return resolve({ host, alive: false, latencyMs: null, error: 'invalid host' });
    }
    const lib = useHttps ? https : http;
    const started = Date.now();
    let settled = false;

    const req = lib.request(
      {
        host,
        port: port || (useHttps ? 443 : 80),
        path: urlPath || '/',
        method: 'GET',
        timeout: timeoutMs,
        rejectUnauthorized: false,
      },
      (res) => {
        if (settled) return;
        settled = true;
        res.resume();
        resolve({ host, alive: res.statusCode < 500, statusCode: res.statusCode, latencyMs: Date.now() - started });
      }
    );

    req.on('timeout', () => {
      if (settled) return;
      settled = true;
      req.destroy();
      resolve({ host, alive: false, latencyMs: null, error: 'timeout' });
    });

    req.on('error', (err) => {
      if (settled) return;
      settled = true;
      resolve({ host, alive: false, latencyMs: null, error: err.message });
    });

    req.end();
  });
}

async function checkDevice(device, timeoutMs = 5000) {
  const host = device.ip || device.host;
  const type = device.checkType || 'ping';

  if (type === 'http') {
    return httpCheck(host, { port: device.port, path: device.httpPath, useHttps: !!device.https }, timeoutMs);
  }
  if (type === 'tcp') {
    return tcpCheck(host, device.port, timeoutMs);
  }
  return pingDevice(host, timeoutMs);
}

module.exports = { pingDevice, tcpCheck, httpCheck, checkDevice };
