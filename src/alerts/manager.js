const { dbAll, dbRun } = require('../db');
const { broadcast } = require('../realtime');
const channels = require('./channels');

const STATES = {
  UNKNOWN: 'UNKNOWN',
  ONLINE: 'ONLINE',
  SUSPECT_DOWN: 'SUSPECT_DOWN',
  OFFLINE_CONFIRMED: 'OFFLINE_CONFIRMED',
};

// In-memory state per device: { state, consecutiveFails, lastAlertAt, downSince }
const deviceState = new Map();

function getState(ip) {
  if (!deviceState.has(ip)) {
    deviceState.set(ip, {
      state: STATES.UNKNOWN,
      consecutiveFails: 0,
      lastAlertAt: 0,
      downSince: null,
    });
  }
  return deviceState.get(ip);
}

async function evaluate(ip, checkResult) {
  const st = getState(ip);
  const alive = checkResult.alive;
  const now = Date.now();

  // Check maintenance window
  const suppressed = await isSuppressed(ip, now);

  // Get rule config (debounce, cooldown)
  const rule = await getRuleForIp(ip);
  const debounceCount = rule ? rule.debounce_count : 3;
  const cooldownMs = rule ? rule.cooldown_sec * 1000 : 0;

  if (alive) {
    if (st.state === STATES.OFFLINE_CONFIRMED) {
      // Recovery!
      const downtimeSec = st.downSince ? Math.round((now - st.downSince) / 1000) : 0;
      await fireAlert(ip, 'device_up', `Device is back online (was down ${downtimeSec}s)`, suppressed, downtimeSec);
    }
    st.state = STATES.ONLINE;
    st.consecutiveFails = 0;
    st.downSince = null;
  } else {
    st.consecutiveFails++;

    if (st.state === STATES.ONLINE || st.state === STATES.UNKNOWN) {
      st.state = STATES.SUSPECT_DOWN;
      st.downSince = now;
    }

    if (st.consecutiveFails >= debounceCount && st.state !== STATES.OFFLINE_CONFIRMED) {
      st.state = STATES.OFFLINE_CONFIRMED;
      // Check cooldown
      const sinceLastAlert = now - st.lastAlertAt;
      if (cooldownMs > 0 && sinceLastAlert < cooldownMs) {
        return; // Cooldown active, skip alert
      }
      await fireAlert(ip, 'device_down', `Device is offline (${st.consecutiveFails} consecutive failures)`, suppressed, 0);
      st.lastAlertAt = now;
    }
  }
}

async function fireAlert(ip, eventType, message, suppressed, downtimeSec) {
  // Get device name
  const { loadDevices } = require('../utils/devices');
  const devices = loadDevices();
  const device = devices.find((d) => (d.ip || d.host) === ip);
  const deviceName = device ? device.name : ip;

  // Log to alert_log
  const deviceId = await getDeviceId(ip);
  if (deviceId) {
    await dbRun(
      `INSERT INTO alert_log (device_id, event_type, message, suppressed, sent_at) VALUES (?, ?, ?, ?, ?)`,
      [deviceId, eventType, message, suppressed ? 1 : 0, Date.now()]
    );
  }

  if (suppressed) return;

  // Send to all enabled channels
  const alertData = {
    deviceName,
    ip,
    eventType,
    message,
    timestamp: new Date().toISOString(),
    downtimeSec,
  };

  const enabledChannels = await dbAll('SELECT * FROM alert_channels WHERE enabled = 1');
  for (const ch of enabledChannels) {
    try {
      const config = JSON.parse(ch.config_json);
      const sendFn = channels[ch.type];
      if (sendFn) {
        const result = await sendFn(alertData, config);
        if (deviceId) {
          await dbRun(
            `INSERT INTO alert_log (device_id, event_type, message, channel_id, suppressed, success, sent_at) VALUES (?, ?, ?, ?, 0, ?, ?)`,
            [deviceId, eventType, `${ch.name}: ${message}`, ch.id, result.success ? 1 : 0, Date.now()]
          );
        }
      }
    } catch (err) {
      console.error(`Alert channel ${ch.type} failed:`, err.message);
    }
  }

  broadcast('alert:fired', { ip, deviceName, eventType, message, timestamp: Date.now() });
}

async function getDeviceId(ip) {
  const rows = await dbAll('SELECT id FROM devices WHERE ip = ?', [ip]);
  return rows.length ? rows[0].id : null;
}

async function getRuleForIp(ip) {
  const deviceId = await getDeviceId(ip);
  if (!deviceId) return null;
  const rows = await dbAll('SELECT * FROM alert_rules WHERE device_id = ? AND enabled = 1', [deviceId]);
  return rows.length ? rows[0] : null;
}

async function isSuppressed(ip, now) {
  const deviceId = await getDeviceId(ip);
  if (!deviceId) return false;
  const rows = await dbAll(
    'SELECT id FROM maintenance_windows WHERE device_id = ? AND starts_at <= ? AND ends_at >= ?',
    [deviceId, now, now]
  );
  return rows.length > 0;
}

async function getRules(deviceId) {
  if (deviceId) {
    return dbAll('SELECT * FROM alert_rules WHERE device_id = ?', [deviceId]);
  }
  return dbAll('SELECT * FROM alert_rules');
}

async function setRule(deviceId, rule) {
  const existing = await dbAll('SELECT id FROM alert_rules WHERE device_id = ?', [deviceId]);
  if (existing.length) {
    await dbRun(
      'UPDATE alert_rules SET debounce_count = ?, cooldown_sec = ?, enabled = ? WHERE id = ?',
      [rule.debounceCount || 3, rule.cooldownSec || 0, rule.enabled !== false ? 1 : 0, existing[0].id]
    );
  } else {
    await dbRun(
      'INSERT INTO alert_rules (device_id, debounce_count, cooldown_sec, enabled) VALUES (?, ?, ?, ?)',
      [deviceId, rule.debounceCount || 3, rule.cooldownSec || 0, rule.enabled !== false ? 1 : 0]
    );
  }
}

module.exports = { evaluate, getRules, setRule };
