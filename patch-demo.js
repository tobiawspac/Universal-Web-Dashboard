const fs = require('fs');
const path = require('path');

const DEMO = path.join(__dirname, 'demo');

// canonical nav for demo (password-less, all features)
const navHTML = `
        <nav class="topnav">
            <a href="index.html">Dashboard</a>
            <a href="terminal.html">Terminal</a>
            <a href="discovery.html">Discovery</a>
            <a href="alerts.html">Alerts</a>
            <a href="plugins.html">Plugins</a>
            <a href="widgets.html">Widgets</a>
            <a href="settings.html">Settings</a>
            <span class="badge-demo" style="border-color:var(--accent);color:var(--accent)">Demo · no login</span>
        </nav>`;

const files = fs.readdirSync(DEMO).filter(f => f.endsWith('.html'));
for (const file of files) {
  const fp = path.join(DEMO, file);
  let html = fs.readFileSync(fp, 'utf8');

  // replace any <nav class="topnav">...</nav> with canonical
  // also handle header brand + nav
  if (html.includes('<nav class="topnav">')) {
    html = html.replace(/<nav class="topnav">[\s\S]*?<\/nav>/, navHTML.trim());
  } else if (file !== 'login.html' && file !== 'onboarding.html') {
    // if no nav, inject after header brand (should not happen)
  }

  // For login.html: make it demo entry without password
  if (file === 'login.html') {
    html = `<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="dark">
    <title>BEACON — Demo</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
<div class="scene">
  <div class="login-shell">
    <div class="login-brand">
      <div class="login-mark">◉</div>
      <div class="login-title">BEA<span>CON</span> DEMO</div>
      <div class="login-subtitle">Field Network Monitor · GitHub Pages · no password</div>
    </div>
    <div class="login-card">
      <p class="mono muted" style="font-size:11px;text-align:center;margin-bottom:14px">Toto je statické demo bez backendu. Všechna data jsou mock (DEMO_DEVICES).<br>Žádné heslo, žádný server.</p>
      <a href="index.html" class="btn" style="display:block;text-align:center;text-decoration:none;line-height:1.2">Enter Demo →</a>
      <p class="mono" style="font-size:10px;text-align:center;margin-top:12px;opacity:.6">Plná verze: <code>git clone … && node setup.js && npm start</code></p>
      <div class="login-meta">000004 · FBFEF9 · 0C6291 · A63446 · 7E1946 · v1.1 demo</div>
    </div>
    <div class="login-help">
      <a href="https://github.com/tobiawspac/Universal-Web-Dashboard" target="_blank" rel="noopener" class="mono" style="font-size:11px">GitHub → Universal-Web-Dashboard</a>
    </div>
  </div>
</div>
</body>
</html>`;
  }

  // For other pages: inject demo mock script before </body>
  // Remove auth redirects and make fetch work offline
  const demoScript = `
<script>
// DEMO MODE — GitHub Pages, no backend, no password
window.__DEMO__ = true;
// mock fetch for /api/* /devices /ping /health etc — returns demo data
(function(){
  const DEMO_DEVICES_MOCK = [
    { name: 'Main Router', ip: '192.168.1.1', type: 'router', live: { alive: true, latencyMs: 3 }, summary: { uptimePercent: 99.8, totalChecks: 1440 } },
    { name: 'Office Switch', ip: '192.168.1.2', type: 'switch', live: { alive: true, latencyMs: 1 }, summary: { uptimePercent: 100, totalChecks: 1440 } },
    { name: 'File Server', ip: '192.168.1.10', type: 'server', live: { alive: true, latencyMs: 12 }, summary: { uptimePercent: 99.5, totalChecks: 1440 } },
    { name: 'NAS Storage', ip: '192.168.1.20', type: 'server', live: { alive: true, latencyMs: 8 }, summary: { uptimePercent: 98.9, totalChecks: 1440 } },
    { name: 'IP Camera', ip: '192.168.1.50', type: 'camera', live: { alive: true, latencyMs: 22 }, summary: { uptimePercent: 97.2, totalChecks: 1440 } },
    { name: 'Dev PC', ip: '192.168.1.100', type: 'pc', live: { alive: false, latencyMs: null }, summary: { uptimePercent: 85.3, totalChecks: 1440 } },
    { name: 'Printer', ip: '192.168.1.200', type: 'printer', live: { alive: true, latencyMs: 45 }, summary: { uptimePercent: 99.1, totalChecks: 1440 } },
    { name: 'Guest WiFi AP', ip: '192.168.1.5', type: 'router', live: { alive: true, latencyMs: 2 }, summary: { uptimePercent: 100, totalChecks: 1440 } },
  ];
  const origFetch = window.fetch.bind(window);
  window.fetch = async (url, opts) => {
    const u = String(url);
    // health
    if (u.includes('/health')) return new Response(JSON.stringify({ ok: true, service: 'beacon-demo' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    // dashboard summary
    if (u.includes('/api/dashboard-summary')) return new Response(JSON.stringify(DEMO_DEVICES_MOCK), { status: 200, headers: { 'Content-Type': 'application/json' } });
    // devices
    if (u.includes('/devices')) return new Response(JSON.stringify(DEMO_DEVICES_MOCK.map(d=>({id: Math.random(), name:d.name, ip:d.ip, type:d.type}))), { status: 200, headers: { 'Content-Type': 'application/json' } });
    // history / summary
    if (u.includes('/history/') || u.includes('/summary/')) {
      if (u.includes('/summary/')) return new Response(JSON.stringify({ uptimePercent: 99.2, avgLatencyMs: 8, lastStatus: 'online', totalChecks: 1440 }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      const rows = Array.from({length: 60}, (_,i)=>({ host: '192.168.1.1', timestamp: Date.now()-i*60000, alive: Math.random()>0.1?1:0, latency_ms: Math.floor(2+Math.random()*20) }));
      return new Response(JSON.stringify(rows), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    // ping / check
    if (u.includes('/ping') || u.includes('/check')) return new Response(JSON.stringify({ host: '127.0.0.1', alive: true, latencyMs: 12 }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    // auth
    if (u.includes('/api/check-auth')) return new Response(JSON.stringify({ authenticated: true, totpEnabled: false }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    if (u.includes('/api/login') || u.includes('/api/logout') || u.includes('/api/settings') || u.includes('/api/alerts') || u.includes('/api/discovery') || u.includes('/api/snmp') || u.includes('/api/plugins')) {
      return new Response(JSON.stringify({ ok: true, authenticated: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    // fallback: try real fetch, but if fails return mock empty
    try { return await origFetch(url, opts); } catch { return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } }); }
  };
  // also mock socket.io if not loaded
  if (typeof io === 'undefined') window.io = function(){ return { on: ()=>{}, emit: ()=>{} }; };
})();
</script>
`;

  if (file !== 'login.html' && !html.includes('window.__DEMO__')) {
    html = html.replace('</body>', demoScript + '\n</body>');
  }

  // Fix logout button if present: make it go to demo login (no API)
  html = html.replace(/<button class="button2 danger" id="logoutBtn">Logout<\/button>/g, '<a href="login.html" class="button2 danger" style="text-decoration:none;display:inline-flex;align-items:center">Exit Demo</a>');
  html = html.replace(/document\.getElementById\('logoutBtn'\)[\s\S]*?location\.href = 'login\.html';\s*\}\);/g, '');

  // Update title to indicate demo
  html = html.replace(/<title>(.*?)<\/title>/, `<title>$1 · Demo</title>`).replace('· Demo · Demo', '· Demo');

  fs.writeFileSync(fp, html, 'utf8');
  console.log(`patched ${file}`);
}

// add .nojekyll and 404
fs.writeFileSync(path.join(DEMO, '.nojekyll'), '');
fs.writeFileSync(path.join(DEMO, '404.html'), fs.readFileSync(path.join(DEMO, 'index.html'), 'utf8'));
console.log('demo patch done');
