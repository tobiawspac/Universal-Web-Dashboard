const fs = require('fs');
const config = require('../config');

function ensureDeviceStore() {
  if (!fs.existsSync(config.devicesFile)) {
    fs.writeFileSync(config.devicesFile, '[]', 'utf8');
  }
}

function loadDevices() {
  ensureDeviceStore();
  try {
    const raw = fs.readFileSync(config.devicesFile, 'utf8');
    return JSON.parse(raw || '[]');
  } catch {
    return [];
  }
}

function saveDevices(devices) {
  fs.writeFileSync(config.devicesFile, JSON.stringify(devices, null, 2), 'utf8');
}

module.exports = { loadDevices, saveDevices };
