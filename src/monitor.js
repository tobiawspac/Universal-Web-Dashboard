const { dbRun, dbAll } = require('./db');
const { loadDevices } = require('./utils/devices');
const { checkDevice } = require('./utils/checks');
const { broadcast } = require('./realtime');
const alertManager = require('./alerts/manager');

let snmpModule = null;
try { snmpModule = require('./discovery/snmp'); } catch {}
let pluginLoader = null;
try { pluginLoader = require('./plugins/loader'); } catch {}

async function loadDevicesUnified() {
  try {
    const rows = await dbAll('SELECT * FROM devices ORDER BY id');
    if (rows.length) {
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        ip: r.ip,
        type: r.type,
        checkType: r.check_type || 'ping',
        plugin_id: r.plugin_id,
        snmp_enabled: !!r.snmp_enabled,
        snmp_community: r.snmp_community,
        port: r.port,
        httpPath: r.http_path,
        https: !!r.https,
        notes: r.notes,
      }));
    }
  } catch {}
  return loadDevices();
}

async function monitorAllDevices() {
  const devices = await loadDevicesUnified();
  for (const device of devices) {
    const host = device.ip || device.host;
    if (!host) continue;

    try {
      let result;
      const checkType = device.checkType || 'ping';

      if (checkType === 'plugin' && device.plugin_id && pluginLoader) {
        // Plugin check
        let pluginConfig = {};
        try {
          const rows = await dbAll('SELECT config_json FROM plugin_device_config WHERE plugin_id = ? AND device_id = (SELECT id FROM devices WHERE ip = ? LIMIT 1)', [device.plugin_id, host]);
          if (rows.length) pluginConfig = JSON.parse(rows[0].config_json);
        } catch {}
        result = await pluginLoader.runPluginCheck(device.plugin_id, device, pluginConfig, 5000);
      } else {
        // Built-in check (ping/http/tcp)
        result = await checkDevice(device, 5000);
      }

      await dbRun(
        `INSERT INTO ping_history (host, device_name, timestamp, alive, latency_ms, packet_loss) VALUES (?, ?, ?, ?, ?, ?)`,
        [host, device.name || 'Unknown', Date.now(), result.alive ? 1 : 0, result.latencyMs, result.alive ? 0 : 100]
      );

      broadcast('device:update', {
        ip: host,
        name: device.name,
        alive: result.alive,
        latencyMs: result.latencyMs,
        error: result.error,
        timestamp: Date.now(),
      });

      alertManager.evaluate(host, result).catch((err) => {
        console.error(`Alert evaluation failed for ${host}:`, err.message);
      });

      // SNMP polling (async, non-blocking)
      if (snmpModule && device.snmp_enabled) {
        const deviceId = await getDeviceId(host);
        if (deviceId) {
          snmpModule.pollSnmpInterfaces(deviceId, host, device.snmp_community || 'public').catch(() => {});
        }
      }
    } catch (error) {
      console.error('Monitor insert failed:', error.message);
      broadcast('device:update', {
        ip: host,
        name: device.name,
        alive: false,
        latencyMs: null,
        error: error.message,
        timestamp: Date.now(),
      });
      alertManager.evaluate(host, { alive: false, latencyMs: null, error: error.message }).catch(() => {});
    }
  }

  broadcast('monitor:tick', {
    timestamp: Date.now(),
    checkedCount: devices.length,
  });
}

async function getDeviceId(ip) {
  const rows = await dbAll('SELECT id FROM devices WHERE ip = ?', [ip]);
  return rows.length ? rows[0].id : null;
}

module.exports = { monitorAllDevices };
