const { dbRun, db } = require('./db');

async function columnExists(tableName, columnName) {
  const rows = await new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
  return rows.some((r) => r.name === columnName);
}

async function tableExists(tableName) {
  const rows = await new Promise((resolve, reject) => {
    db.all(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [tableName], (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
  return rows.length > 0;
}

async function runMigrations() {
  // Ensure devices table exists (may not if fresh install after code upgrade)
  await dbRun(`CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    ip TEXT NOT NULL,
    type TEXT DEFAULT 'router',
    check_type TEXT DEFAULT 'ping',
    plugin_id TEXT,
    snmp_enabled INTEGER DEFAULT 0,
    snmp_community TEXT,
    port INTEGER,
    http_path TEXT,
    https INTEGER DEFAULT 0,
    notes TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
  )`);

  // Migrate devices from JSON file to SQLite if devices table is empty
  const { loadDevices } = require('./utils/devices');
  const jsonDevices = loadDevices();
  if (jsonDevices.length > 0) {
    const rows = await new Promise((resolve, reject) => {
      db.all('SELECT COUNT(*) as cnt FROM devices', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    if (rows[0].cnt === 0) {
      for (const d of jsonDevices) {
        await dbRun(
          `INSERT INTO devices (name, ip, type, check_type, port, http_path, https, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            d.name,
            d.ip,
            d.type || 'router',
            d.checkType || 'ping',
            d.port || null,
            d.httpPath || null,
            d.https ? 1 : 0,
            d.notes || null,
          ]
        );
      }
      console.log(`[MIGRATION] Migrated ${jsonDevices.length} devices from JSON to SQLite.`);
    }
  }

  // Add new columns if they don't exist (SQLite doesn't support ADD COLUMN IF NOT EXISTS)
  const deviceColumns = [
    ['check_type', 'TEXT DEFAULT "ping"'],
    ['plugin_id', 'TEXT'],
    ['snmp_enabled', 'INTEGER DEFAULT 0'],
    ['snmp_community', 'TEXT'],
  ];
  for (const [col, def] of deviceColumns) {
    if (!(await columnExists('devices', col))) {
      await dbRun(`ALTER TABLE devices ADD COLUMN ${col} ${def}`);
    }
  }

  // Alerting tables
  await dbRun(`CREATE TABLE IF NOT EXISTS alert_channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    config_json TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
  )`);

  await dbRun(`CREATE TABLE IF NOT EXISTS alert_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER,
    debounce_count INTEGER NOT NULL DEFAULT 3,
    cooldown_sec INTEGER NOT NULL DEFAULT 0,
    enabled INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY(device_id) REFERENCES devices(id)
  )`);

  await dbRun(`CREATE TABLE IF NOT EXISTS alert_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    message TEXT NOT NULL,
    channel_id INTEGER,
    suppressed INTEGER NOT NULL DEFAULT 0,
    success INTEGER,
    sent_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    FOREIGN KEY(device_id) REFERENCES devices(id)
  )`);

  await dbRun(`CREATE TABLE IF NOT EXISTS maintenance_windows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    starts_at INTEGER NOT NULL,
    ends_at INTEGER NOT NULL,
    note TEXT,
    FOREIGN KEY(device_id) REFERENCES devices(id)
  )`);

  // Discovery tables
  await dbRun(`CREATE TABLE IF NOT EXISTS discovered_devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT NOT NULL,
    mac TEXT,
    hostname TEXT,
    vendor_guess TEXT,
    snmp_sysdescr TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    adopted_device_id INTEGER,
    first_seen INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    last_seen INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    FOREIGN KEY(adopted_device_id) REFERENCES devices(id)
  )`);

  // SNMP tables
  await dbRun(`CREATE TABLE IF NOT EXISTS snmp_interface_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    if_index INTEGER NOT NULL,
    if_descr TEXT,
    if_oper_status INTEGER,
    in_octets INTEGER,
    out_octets INTEGER,
    timestamp INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    FOREIGN KEY(device_id) REFERENCES devices(id)
  )`);

  // Plugin tables
  await dbRun(`CREATE TABLE IF NOT EXISTS plugins (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    type_json TEXT NOT NULL,
    manifest_json TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    installed_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
  )`);

  await dbRun(`CREATE TABLE IF NOT EXISTS plugin_device_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    plugin_id TEXT NOT NULL,
    config_json TEXT NOT NULL,
    FOREIGN KEY(device_id) REFERENCES devices(id),
    FOREIGN KEY(plugin_id) REFERENCES plugins(id)
  )`);

  await dbRun(`CREATE TABLE IF NOT EXISTS widget_layout (
    id INTEGER PRIMARY KEY DEFAULT 1,
    layout_json TEXT NOT NULL DEFAULT '[]'
  )`);

  // Settings table (key-value for app config)
  await dbRun(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`);

  console.log('[MIGRATION] All migrations completed.');
}

module.exports = { runMigrations };
