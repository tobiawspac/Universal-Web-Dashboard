const fs = require('fs');
const path = require('path');
const PUB = path.join(__dirname, 'public');

// Unified production nav — all features, consistent, with LOGOUT
const navHTML = `
        <nav class="topnav">
            <a href="index.html">Dashboard</a>
            <a href="terminal.html">Terminal</a>
            <a href="discovery.html">Discovery</a>
            <a href="alerts.html">Alerts</a>
            <a href="plugins.html">Plugins</a>
            <a href="widgets.html">Widgets</a>
            <a href="settings.html">Settings</a>
            <button class="button2 danger" id="logoutBtn">Logout</button>
        </nav>`;

const files = fs.readdirSync(PUB).filter(f => f.endsWith('.html') && f !== 'login.html' && f !== 'onboarding.html');
for (const file of files) {
  const fp = path.join(PUB, file);
  let html = fs.readFileSync(fp, 'utf8');
  if (html.includes('<nav class="topnav">')) {
    html = html.replace(/<nav class="topnav">[\s\S]*?<\/nav>/, navHTML.trim());
    fs.writeFileSync(fp, html, 'utf8');
    console.log(`fixed nav ${file}`);
  }
}
// also ensure login/onboarding have no nav (they are standalone)
console.log('public nav unified to 7 links + logout');
