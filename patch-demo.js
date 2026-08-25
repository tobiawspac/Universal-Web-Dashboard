const fs = require('fs');
const path = require('path');

const PUB = path.join(__dirname, 'public');
const DEMO = path.join(__dirname, 'demo');

// smazat stary demo obsah
fs.rmSync(DEMO, { recursive: true, force: true });

// nakopirovat public -> demo
fs.cpSync(PUB, DEMO, { recursive: true });
console.log('copied public -> demo');

// mock fetch + io, musi byt PRVNI script v <head> nez se spusti strankove js
const demoShim = `
<script>
// DEMO MODE - static hosting, zadny backend
window.__DEMO__ = true;
(function(){
  var MOCK_DEVICES = [
    { name: 'Main Router', ip: '192.168.1.1', type: 'router', live: { alive: true, latencyMs: 3 }, summary: { uptimePercent: 99.8, totalChecks: 1440 } },
    { name: 'Office Switch', ip: '192.168.1.2', type: 'switch', live: { alive: true, latencyMs: 1 }, summary: { uptimePercent: 100, totalChecks: 1440 } },
    { name: 'File Server', ip: '192.168.1.10', type: 'server', live: { alive: true, latencyMs: 12 }, summary: { uptimePercent: 99.5, totalChecks: 1440 } },
    { name: 'NAS Storage', ip: '192.168.1.20', type: 'server', live: { alive: true, latencyMs: 8 }, summary: { uptimePercent: 98.9, totalChecks: 1440 } },
    { name: 'IP Camera', ip: '192.168.1.50', type: 'camera', live: { alive: true, latencyMs: 22 }, summary: { uptimePercent: 97.2, totalChecks: 1440 } },
    { name: 'Dev PC', ip: '192.168.1.100', type: 'pc', live: { alive: false, latencyMs: null }, summary: { uptimePercent: 85.3, totalChecks: 1440 } },
    { name: 'Printer', ip: '192.168.1.200', type: 'printer', live: { alive: true, latencyMs: 45 }, summary: { uptimePercent: 99.1, totalChecks: 1440 } },
    { name: 'Guest WiFi AP', ip: '192.168.1.5', type: 'router', live: { alive: true, latencyMs: 2 }, summary: { uptimePercent: 100, totalChecks: 1440 } }
  ];
  var realFetch = window.fetch ? window.fetch.bind(window) : null;
  function J(txt){ return new Response(JSON.stringify(txt), { status: 200, headers: { 'Content-Type': 'application/json' } }); }
  window.fetch = function(url, opts){
    var u = String(url);
    if (u.indexOf('/api/dashboard-summary') >= 0) return Promise.resolve(J(MOCK_DEVICES));
    if (u.indexOf('/devices') >= 0) {
      return Promise.resolve(J(MOCK_DEVICES.map(function(d,i){ return { id: i+1, name: d.name, ip: d.ip, type: d.type, snmp_enabled: 0 }; })));
    }
    if (u.indexOf('/summary/') >= 0) return Promise.resolve(J({ uptimePercent: 99.2, avgLatencyMs: 8, lastStatus: 'online', totalChecks: 1440 }));
    if (u.indexOf('/history/') >= 0) {
      var rows = [];
      for (var i=0;i<60;i++) rows.push({ timestamp: Date.now()-i*60000, alive: Math.random()>0.08?1:0, latency_ms: Math.floor(2+Math.random()*20) });
      return Promise.resolve(J(rows));
    }
    if (u.indexOf('/ping') >= 0 || u.indexOf('/check') >= 0) return Promise.resolve(J({ host: '127.0.0.1', alive: true, latencyMs: 12 }));
    if (u.indexOf('/health') >= 0) return Promise.resolve(J({ ok: true }));
    // vsechno ostatni api -> ok/prázdný seznam
    var empty = [ '/api/alerts', '/api/discovery', '/api/plugins', '/api/snmp', '/api/settings' ];
    for (var k=0;k<empty.length;k++) {
      if (u.indexOf(empty[k]) >= 0) return Promise.resolve(J([]));
    }
    if (realFetch) return realFetch(u, opts);
    return Promise.resolve(J([]));
  };
  // socket.io na static hostingu neni -> no-op
  window.io = function(){ return { on: function(){}, emit: function(){} }; };
})();
</script>
`;

// login.html -> staticky demo vstup bez api
function demoLogin() {
  return `<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="dark">
    <title>Login - BEACON</title>${demoShim}
    <link rel="stylesheet" href="css/style.css">
</head>
<body>

<div class="scene">
  <div class="login-shell">
    <div class="login-title">BEACON</div>
    <div class="login-card">
      <p class="mono muted" style="font-size:11px;text-align:center;margin-bottom:14px">Statické demo bez backendu.<br>Všechna data jsou mock.</p>
      <a href="index.html" class="btn" style="display:block;text-align:center;text-decoration:none">Enter Demo →</a>
      <div class="login-meta">Field Network Monitor · demo · v1.1</div>
    </div>
    <div class="login-help">
      <a href="https://github.com/tobiawspac/Universal-Web-Dashboard" target="_blank" rel="noopener">GitHub repo</a>
    </div>
  </div>
</div>

</body>
</html>`;
}

const files = fs.readdirSync(DEMO).filter(f => f.endsWith('.html'));
for (const file of files) {
  const fp = path.join(DEMO, file);
  let html = fs.readFileSync(fp, 'utf8');

  if (file === 'login.html') {
    fs.writeFileSync(fp, demoLogin(), 'utf8');
    console.log('patched (demo login) ' + file);
    continue;
  }

  // shim jako prvni vec do <head>
  html = html.replace('<head>', '<head>' + demoShim);

  // socket.io script tag na staticu nic nedela, rovnou vyhodit
  html = html.replace(/\s*<script src="\/socket\.io\/socket\.io\.js"><\/script>/g, '');

  // logout -> exit demo odkaz
  html = html.replace(/<button class="button2 danger" id="logoutBtn">Logout<\/button>/,
    '<a href="login.html" class="button2 danger" style="text-decoration:none">Exit Demo</a>');

  // titulek + Demo priznak
  html = html.replace(/<title>(.*?)<\/title>/, (m, t) => t.includes('Demo') ? m : `<title>${t} · Demo</title>`);

  fs.writeFileSync(fp, html, 'utf8');
  console.log('patched ' + file);
}

// pages helpery
fs.writeFileSync(path.join(DEMO, '.nojekyll'), '');
fs.writeFileSync(path.join(DEMO, '404.html'), fs.readFileSync(path.join(DEMO, 'index.html'), 'utf8'));
console.log('demo build done');
