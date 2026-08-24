# Universal Web Dashboard

A web-based dashboard for monitoring network devices with ping, HTTP/HTTPS, and TCP port checks.

## Features

- **Device Monitoring**: Monitor devices via ICMP ping, HTTP/HTTPS, or TCP port checks
- **Real-time Status**: Online/offline status with latency and 24h uptime
- **Authentication**: bcrypt-hashed password login with rate limiting
- **Web Terminal**: Interactive terminal for ping and device queries
- **Device Management**: Add, edit, and delete devices with SVG icons
- **History Tracking**: SQLite database for storing ping history with charts
- **HTTPS Support**: Optional HTTPS with self-signed or custom certificates
- **Modular Codebase**: Clean `src/` structure with separated concerns

## Quick Start

### Prerequisites
- Node.js (v18 or later)
- npm

### Installation

```bash
npm install
```

### Running

```bash
node app.js
```

Or on Windows:
```cmd
start.bat
```

The server starts on `http://localhost:3000`

### Default Login
- **Password**: `admin123`

## Configuration

Copy `.env.example` to `.env` and edit:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | HTTP server port |
| `PASSWORD` | admin123 | Login password (bcrypt hash or plaintext) |
| `PING_INTERVAL_MS` | 60000 | Auto-monitoring interval (ms) |
| `HTTPS_ENABLED` | false | Enable HTTPS server |
| `HTTPS_PORT` | 3443 | HTTPS server port |
| `SSL_CERT_PATH` | ./certs/cert.pem | Path to SSL certificate |
| `SSL_KEY_PATH` | ./certs/key.pem | Path to SSL private key |

### HTTPS Setup

Generate a self-signed certificate:
```bash
npm run generate-cert
```

Or manually:
```bash
openssl req -x509 -newkey rsa:2048 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes
```

Then set `HTTPS_ENABLED=true` in `.env`.

## Project Structure

```
universal-web-dashboard/
├── app.js                  # Entry point (requires src/server.js)
├── src/
│   ├── config.js           # Environment + configuration
│   ├── db.js               # SQLite connection + helpers
│   ├── auth.js             # Sessions, rate limiting, bcrypt
│   ├── app.js              # Express app + middleware
│   ├── server.js           # HTTP/HTTPS server startup
│   ├── monitor.js          # Background monitoring engine
│   ├── routes/
│   │   ├── auth.js         # Login/logout/check-auth
│   │   ├── devices.js      # Device CRUD
│   │   ├── history.js      # History + summary + dashboard
│   │   └── checks.js       # Ping, bulk ping, check
│   └── utils/
│       ├── validators.js   # Host/port validation
│       ├── checks.js       # pingDevice, tcpCheck, httpCheck
│       └── devices.js      # Device file store
├── tests/
│   └── app.test.js         # API tests (Jest + supertest)
├── style.css               # Global styles
├── login.html              # Login page
├── index.html              # Main dashboard
├── add_device.html         # Add device form
├── device_page.html        # Device detail + chart
├── terminal.html           # Web terminal
├── assets/                 # SVG device icons
├── .env.example            # Environment template
├── .env                    # Local environment config
├── .gitignore              # Git ignore rules
├── package.json            # Dependencies and scripts
└── README.md               # This file
```

## API Endpoints

### Authentication
- `POST /api/login` - Login with password
- `POST /api/logout` - Logout
- `GET /api/check-auth` - Check authentication status
- `GET /health` - Health check

### Devices
- `GET /devices` - List all devices (auth required)
- `POST /devices` - Add/update/delete device (auth required)

### Checks
- `POST /ping` - Ping a single host
- `POST /ping/bulk` - Ping multiple hosts
- `POST /check` - Run configured check type

### History
- `GET /history/:host` - Get ping history
- `GET /summary/:host` - Get uptime summary
- `GET /api/dashboard-summary` - Live status for all devices

## Testing

```bash
npm test
```

## Security

- Passwords are bcrypt-hashed (10 rounds)
- Rate limiting: 20 login attempts per 5 minutes per IP
- Session tokens: random 32-byte hex, 24h TTL, httpOnly cookies
- Host validation prevents command injection (execFile, not shell)
- HTTPS support with secure cookie flag

## Technologies

- **Backend**: Node.js, Express 5
- **Database**: SQLite3
- **Auth**: bcryptjs
- **Frontend**: HTML5, CSS3, JavaScript
- **Testing**: Jest, supertest

## License

ISC
