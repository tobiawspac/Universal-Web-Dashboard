# BEACON — Field Network Monitor

Black/Porcelain field kit for monitoring network devices (ping / HTTP / TCP + SNMP). Palette: `000004` Black · `FBFEF9` Porcelain · `0C6291` Baltic Blue · `A63446` Cherry Rose · `7E1946` Dark Raspberry. Mono labels, SVG-only icons, no emoji, no low-poly mountains.

> Původně *Universal Web Dashboard* — přejmenováno a přestavěno: vlastní paleta, vlastní login scene, sjednocené utility třídy místo inline stylů, jedno-skript instalace, méně bugů.

## One-script install (from GitHub)

**Nejrychleji — stačí jeden příkaz po klonu:**

```bash
git clone https://github.com/tobiawspac/Universal-Web-Dashboard.git
cd Universal-Web-Dashboard
node setup.js && npm start
#  → http://localhost:3000  (password: admin123)
#  → http://localhost:3000/health
```

Detto přes npm / bash / Windows:

```bash
npm run setup && npm start   # cross-platform (volá node setup.js)
./setup.sh && npm start      # Linux / macOS / WSL / Git Bash
setup.bat && npm start       # Windows (cmd)
.\start.ps1                  # Windows PowerShell — udělá setup + start v jednom
start.bat                    # Windows cmd — udělá setup + start v jednom
```

**Docker (jeden příkaz):**

```bash
docker compose up --build
# http://localhost:3000
```

Co dělá `setup.js` (idempotentní): zkontroluje Node 18+, vytvoří `certs/` `data/` `plugins/`, zkopíruje `.env.example → .env` pokud chybí, vytvoří `devices.json` pokud chybí, spustí `npm install` pokud chybí `node_modules`, ověří `public/index.html` / `src/server.js`. Lze volat opakovaně, nic nepřepíše.

## Features

- **Device Monitoring**: ping / HTTP / TCP + plugin checks, SNMP polling (`net-snmp`), volitelný 2FA (otplib)
- **Real-time**: WebSocket `device:update` + `monitor:tick` (socket.io), live badge, latency + 24h uptime
- **Dashboard**: search (name/IP/type), export JSON, SVG-only ikony, `000004/0C6291/A63446` paleta
- **Authentication**: bcrypt 10 rounds, rate-limit 20/5min, 32B session, httpOnly cookie, `requireAuth`
- **Web Terminal**: `ping`, `devices`, `clear`, `help` (execFile, ne shell — safe proti injection)
- **Discovery**: scan CIDR /24–/30, adopt/ignore, SNMP `sysDescr`, `vendor_guess`
- **Alerts**: webhook / discord / telegram / email (SMTP), debounce + cooldown, maintenance windows
- **Plugins**: ZIP upload (`adm-zip` + `multer`), `manifest.json` + `check.js`/`widget.js`, per-device config
- **History**: SQLite `ping_history` + `snmp_interface_history`, `GET /history/:host?range=60`, `GET /summary/:host?hours=24`, canvas grafy (Baltic Blue/ Cherry Rose)
- **HTTPS**: volitelné `HTTPS_ENABLED=true`, self-signed `npm run generate-cert`
- **Install DX**: `setup.js`/`setup.sh`/`setup.bat`, `Dockerfile` + `docker-compose.yml`, `HEALTHCHECK`, `npm run health`, `npm test` s mocky

## Quick Start (bez setup.js)

```bash
npm install
npm start          # nebo: node app.js
# nebo: start.bat (Windows) / ./setup.sh (Unix)
```

- Node.js ≥18, npm ≥8
- Default login: `admin123` (změň v `settings.html` nebo `PASSWORD` v `.env`)

## Configuration

`setup.js` vytvoří `.env` z `.env.example` pokud chybí. Ručně: `copy .env.example .env` (Win) / `cp .env.example .env` (Unix).

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | HTTP |
| `PASSWORD` | admin123 | Login (plaintext nebo bcrypt hash) |
| `PING_INTERVAL_MS` | 60000 | Interval monitoru |
| `HTTPS_ENABLED` | false | HTTPS |
| `HTTPS_PORT` | 3443 | HTTPS port |
| `SSL_CERT_PATH` | ./certs/cert.pem | cert |
| `SSL_KEY_PATH` | ./certs/key.pem | key |
| `ALERT_ENCRYPTION_KEY` |  | 32B hex pro encrypt config |
| `DISCOVERY_MAX_CONCURRENCY` | 20 | scan concurrency |
| `PLUGIN_MAX_UPLOAD_MB` | 5 | max ZIP |

## HTTPS

```bash
npm run generate-cert   # openssl self-signed
# nebo: openssl req -x509 -newkey rsa:2048 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes
# pak v .env: HTTPS_ENABLED=true
```

## Project Structure

```
beacon-field-monitor/
├── setup.js / setup.sh / setup.bat   # ← one-script install (idempotent)
├── start.bat / start.ps1             # ← one-click start (volá setup.js)
├── Dockerfile / docker-compose.yml
├── app.js
├── src/
│   ├── config.js
│   ├── db.js          # SQLite + ping_history index
│   ├── auth.js        # sessions Map + 10min GC
│   ├── migrations.js  # devices, alert_channels, discovery, snmp, plugins, settings
│   ├── monitor.js     # unified DB-first device load → checkDevice → ping_history + broadcast + alerts + SNMP
│   ├── realtime.js    # socket.io auth via cookie
│   ├── app.js         # express + static public/
│   ├── server.js      # http + optional https + migrations + monitor interval
│   ├── routes/        # auth, devices, history, checks, alerts, discovery, snmp, plugins
│   ├── alerts/        # manager + channels (discord/telegram/email/webhook)
│   ├── discovery/     # scan.js + snmp.js
│   ├── plugins/       # loader + registry
│   └── utils/         # validators, checks (pingDevice/tcpCheck/httpCheck), devices (JSON fallback)
├── public/
│   ├── index.html     # dashboard (live fetch /api/dashboard-summary + search + export, fallback DEMO)
│   ├── login.html     # grid/BEACON scene (no mountains)
│   ├── style.css      # 000004/0C6291/7E1946/A63446/FBFEF9 + JetBrains Mono
│   ├── assets/*.svg   # recolored to #0C6291 (Baltic Blue)
│   └── ...            # add_device, device_page, terminal, discovery, alerts, widgets, plugins, settings, onboarding
├── tests/
│   ├── app.test.js
│   └── __mocks__/otplib.js, qrcode.js  # fix Jest ESM
└── package.json (engines + jest moduleNameMapper + setup scripts)
```

## API

- `POST /api/login` `{password, totpCode?}` → `set-cookie: dashboard_session`
- `POST /api/logout`, `GET /api/check-auth`, `GET /health`
- `GET /devices` / `POST /devices` `{name,ip,type,checkType,port,httpPath,https,notes,snmp_enabled,_delete}`
- `POST /ping`, `POST /ping/bulk`, `POST /check`
- `GET /history/:host?range=60`, `GET /summary/:host?hours=24`, `GET /api/dashboard-summary`
- `GET/POST /api/alerts/channels`, `PUT/DELETE /api/alerts/channels/:id`, `POST /api/alerts/channels/:id/test`, `GET /api/alerts/log`, `GET/POST /api/maintenance`
- `GET /api/discovery/subnets`, `POST /api/discovery/scan`, `GET /api/discovery/results`, `POST /api/discovery/adopt|ignore`
- `GET /api/snmp/:id/interfaces`, `GET/POST /api/plugins`, `/api/plugins/:id/enable|disable`

## Testing & Health

```bash
npm test            # Jest 29 + supertest (mocked otplib/qrcode, žádné ESM chyby)
npm run test:verify # setup:check + test
npm run health      # fetch http://localhost:3000/health
curl http://localhost:3000/health
```

## Security

- bcrypt 10, rate-limit 20/5min/IP, 32B hex session 24h httpOnly `SameSite=lax`
- `isValidHost` regex `/^[a-zA-Z0-9.:\-]+$/` + `execFile('ping', args)` bez shellu
- `net.Socket` timeout, `http.request` `rejectUnauthorized:false` pro self-signed
- HTTPS `secure` flag na cookie když `req.secure`

## Technologies

Node.js 20, Express 5, SQLite3, socket.io, otplib 13, qrcode, net-snmp, nodemailer, adm-zip, multer, bcryptjs

## License

ISC
