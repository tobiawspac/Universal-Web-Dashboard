async function send(alert, config) {
  if (!config.url) return { success: false, error: 'No webhook URL configured' };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(config.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: alert.eventType,
        device: alert.deviceName,
        ip: alert.ip,
        message: alert.message,
        timestamp: alert.timestamp,
        downtimeSec: alert.downtimeSec,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return { success: res.ok, error: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = { send };
