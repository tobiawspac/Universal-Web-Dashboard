const { Worker } = require('worker_threads');
const path = require('path');
const { getPluginDir } = require('./registry');

const WORKER_TIMEOUT_MS = 10000;

async function runPluginCheck(pluginId, device, config = {}, timeoutMs = WORKER_TIMEOUT_MS) {
  const pluginDir = getPluginDir(pluginId);
  const checkFile = path.join(pluginDir, 'check.js');

  return new Promise((resolve) => {
    const worker = new Worker(checkFile, {
      workerData: { device, config },
      // Don't pass parent env — worker gets clean env
      eval: false,
    });

    const timer = setTimeout(() => {
      worker.terminate();
      resolve({ alive: false, latencyMs: null, error: 'plugin_timeout' });
    }, timeoutMs);

    worker.on('message', (msg) => {
      clearTimeout(timer);
      worker.terminate();
      if (msg && typeof msg.alive === 'boolean') {
        resolve({ alive: msg.alive, latencyMs: msg.latencyMs || null, extra: msg.extra, error: msg.error });
      } else {
        resolve({ alive: false, latencyMs: null, error: 'invalid_plugin_return' });
      }
    });

    worker.on('error', (err) => {
      clearTimeout(timer);
      resolve({ alive: false, latencyMs: null, error: `plugin_error: ${err.message}` });
    });
  });
}

module.exports = { runPluginCheck };
