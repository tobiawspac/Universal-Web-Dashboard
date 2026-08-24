async function send(alert, config) {
  if (!config.botToken || !config.chatId) return { success: false, error: 'Missing botToken or chatId' };
  const emoji = alert.eventType === 'device_down' ? '🔴' : '🟢';
  const text = `${emoji} *${alert.deviceName}* (${alert.ip})\n${alert.message}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId,
        text,
        parse_mode: 'Markdown',
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await res.json();
    return { success: data.ok, error: data.ok ? undefined : data.description };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = { send };
