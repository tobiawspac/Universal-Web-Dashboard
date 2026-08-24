async function send(alert, config) {
  if (!config.webhookUrl) return { success: false, error: 'No Discord webhook URL configured' };
  const color = alert.eventType === 'device_down' ? 0xe74c3c : 0x2ecc71;
  const title = alert.eventType === 'device_down' ? '🔴 Device Down' : '🟢 Device Up';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title,
          description: alert.message,
          color,
          fields: [
            { name: 'Device', value: alert.deviceName, inline: true },
            { name: 'IP', value: alert.ip, inline: true },
          ],
          timestamp: alert.timestamp,
        }],
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
