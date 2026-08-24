# BEACON — Field Network Monitor

Palette: `000004` Black · `FBFEF9` Porcelain · `0C6291` Baltic Blue · `A63446` Cherry Rose · `7E1946` Dark Raspberry.

> Originally *Universal Web Dashboard* — renamed and rebuilt: custom palette, custom login scene, unified utility classes, one-script install, fewer bugs.

## Install

```bash
git clone https://github.com/tobiawspac/Universal-Web-Dashboard.git
cd Universal-Web-Dashboard
node setup.js && npm start
#  → http://localhost:3000
```

Also works with:
```bash
npm run setup && npm start   # cross-platform
./setup.sh && npm start      # Linux / macOS
setup.bat && npm start       # Windows cmd
.\start.ps1                  # Windows PowerShell
```

**Docker:**
```bash
docker compose up --build
# http://localhost:3000
```

## Passwordless

All routes are open — no login required. Dashboard loads directly at `/index.html`. Settings page works without auth.

## GitHub Pages Demo

Static passwordless demo lives in `demo/` folder with mock data (8 devices). Deploy:

```bash
npm run deploy
```

This runs `patch-demo.js` (builds mock `demo/` from `public/`) and pushes to `gh-pages` branch via `gh-pages` package.

Site: `https://tobiawspac.github.io/Universal-Web-Dashboard/`

## Features

- **Device Monitoring**: ping / HTTP / TCP + plugin checks, SNMP polling (`net-snmp`)
- **Real-time**: socket.io `device:update` + `monitor:tick`, live badge, latency + 24h uptime
- **Dashboard**: search (name/IP/type), export JSON, SVG-only icons, Baltic Blue palette
- **Web Terminal**: `ping`, `devices`, `clear`, `help` (execFile, safe)
- **Discovery**: scan CIDR /24–/30, adopt/ignore, SNMP `sysDescr`, `vendor_guess`
- **Alerts**: webhook / discord / telegram / email (SMTP), debounce + cooldown, maintenance windows
- **Plugins**: ZIP upload (`adm-zip` + `multer`), `manifest.json` + `check.js`/`widget.js`, per-device config
- **History**: SQLite `ping_history` + `snmp_interface_history`, canvas charts
- **HTTPS**: optional `HTTPS_ENABLED=true`, self-signed `npm run generate-cert`
- **Install DX**: `setup.js`/`setup.sh`/`setup.bat`, `Dockerfile` + `docker-compose.yml`, `HEALTHCHECK`

## Configuration

`setup.js` creates `.env` from `.env.example` if missing.

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | HTTP port |
| `PING_INTERVAL_MS` | 60000 | Monitor interval |
| `HTTPS_ENABLED` | false | HTTPS |
| `HTTPS_PORT` | 3443 | HTTPS port |
| `SSL_CERT_PATH` | ./certs/cert.pem | cert |
| `SSL_KEY_PATH` | ./certs/key.pem | key |
| `ALERT_ENCRYPTION_KEY` | | 32B hex for config encryption |
| `DISCOVERY_MAX_CONCURRENCY` | 20 | scan concurrency |
| `PLUGIN_MAX_UPLOAD_MB` | 5 | max ZIP |

## Project Structure

```
beacon-field-monitor/
├── setup.js / setup.sh / setup.bat   # one-script install
├── start.bat / start.ps1             # one-click start
├── patch-demo.js                     # builds demo/ from public/ + mock fetch
├── patch-public.js                   # unifies nav across public/
├── Dockerfile / docker-compose.yml
├── app.js                            # entry point
├── src/
│   ├── config.js
│   ├── db.js
│   ├── auth.js
│   ├── migrations.js
│   ├── monitor.js
│   ├── realtime.js
│   ├── app.js
│   ├── server.js
│   ├── routes/        # auth, devices, history, checks, alerts, discovery, snmp, plugins
│   ├── alerts/        # manager + channels
│   ├── discovery/     # scan + snmp
│   ├── plugins/       # loader + registry
│   └── utils/         # validators, checks, devices
├── public/
│   ├── index.html     # dashboard (search + export + live socket.io)
│   ├── login.html     # BEACON grid scene
│   ├── style.css      # palette + utilities
│   ├── assets/*.svg   # Baltic Blue icons
│   └── ...            # add_device, device_page, terminal, discovery, alerts, widgets, plugins, settings, onboarding
├── demo/              # static GitHub Pages build (passwordless, mock data)
├── tests/
│   ├── app.test.js
│   └── __mocks__/     # Jest ESM mocks
└── package.json
```

## API

All endpoints are open (no auth required):

- `GET /health`
- `GET /devices` / `POST /devices` `{name,ip,type,checkType,port,httpPath,https,notes,snmp_enabled,_delete}`
- `POST /ping`, `POST /ping/bulk`, `POST /check`
- `GET /history/:host?range=60`, `GET /summary/:host?hours=24`, `GET /api/dashboard-summary`
- `GET/POST /api/alerts/channels`, `PUT/DELETE /api/alerts/channels/:id`, `POST /api/alerts/channels/:id/test`
- `GET /api/alerts/log`, `GET/POST /api/maintenance`
- `GET /api/discovery/subnets`, `POST /api/discovery/scan`, `GET /api/discovery/results`, `POST /api/discovery/adopt|ignore`
- `GET /api/snmp/:id/interfaces`
- `GET/POST /api/plugins`, `POST /api/plugins/:id/enable|disable`, `DELETE /api/plugins/:id`
- `POST /api/settings/password`, `POST /api/settings/2fa/setup|verify|disable`, `GET /api/settings/sessions`

## Testing

```bash
npm test            # Jest 29 + supertest
npm run test:verify # setup:check + test
npm run health      # fetch http://localhost:3000/health
```

## Technologies

Node.js 18+, Express 5, SQLite3, socket.io, otplib, qrcode, net-snmp, nodemailer, adm-zip, multer, bcryptjs

## License

ISC
