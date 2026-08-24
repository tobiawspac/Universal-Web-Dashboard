const nodemailer = require('nodemailer');

async function send(alert, config) {
  if (!config.smtp || !config.to) return { success: false, error: 'Missing SMTP config or recipient' };
  try {
    const transporter = nodemailer.createTransport(config.smtp);
    const emoji = alert.eventType === 'device_down' ? 'DOWN' : 'UP';
    const info = await transporter.sendMail({
      from: config.from || config.smtp.auth?.user || 'dashboard@localhost',
      to: config.to,
      subject: `[Dashboard] ${emoji}: ${alert.deviceName} (${alert.ip})`,
      text: alert.message,
      html: `<p><strong>${alert.deviceName}</strong> (${alert.ip})</p><p>${alert.message}</p>`,
    });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = { send };
