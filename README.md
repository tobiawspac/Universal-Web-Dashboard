# BEACON - network monitor

Simple web dashboard for monitoring devices on a local network (ping / HTTP / TCP port checks).

## Why I made this

I wanted a way to see at a glance if the devices on my home network (router, NAS, printer, IP camera...) are actually up, without typing ping commands all the time. Existing tools were either too heavy or ugly, so I wrote my own. It started as a simple ping dashboard and slowly grew more features (alerts, discovery scan, plugins).

There is also a static demo version with mock data running on Cloudflare Pages:
https://beacon-demo-9t0.pages.dev

## Features

- device dashboard with online/offline status, latency and 24h uptime
- check types: ICMP ping, HTTP(S) request, TCP port
- live updates over WebSocket (socket.io), no page refresh needed
- search / filter devices by name, IP or type
- export device list to JSON
- web terminal with `ping`, `devices`, `help` commands
- network discovery - scans a subnet (/24 etc.) and finds new devices, then you can adopt them into monitoring
- SNMP support - reads network interfaces from devices that have SNMP enabled
- alerts when a device goes down or comes back - webhook, Discord, Telegram or email (SMTP)
- maintenance windows so alerts don't fire during planned work
- plugin system - upload a ZIP with your own check/widget
- optional 2FA login (TOTP) for the settings

## How to run

```
npm install
node setup.js
npm start
```

Then open http://localhost:3000. Default demo password is `admin123` (you can change it in Settings or during onboarding).

Needs Node.js 18+.

## Tech

Node.js + Express, SQLite for storage, socket.io for live updates, net-snmp for SNMP. The frontend is plain HTML/CSS/JS without any framework - I wanted to keep it simple and learn how it works under the hood instead of using React.

## Known limitations

- discovery scan only works on the local network where the server runs
- ping from browser is not possible, everything goes through the Node server
- no user accounts, it's meant for one person / self-hosting
