const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { dbAll, dbRun } = require('../db');

const PLUGINS_DIR = path.join(__dirname, '..', '..', 'plugins');
const MAX_UPLOAD_MB = parseInt(process.env.PLUGIN_MAX_UPLOAD_MB, 10) || 5;

function ensurePluginsDir() {
  if (!fs.existsSync(PLUGINS_DIR)) fs.mkdirSync(PLUGINS_DIR, { recursive: true });
}

function validateManifest(manifest) {
  const errors = [];
  if (!manifest.id || typeof manifest.id !== 'string') errors.push('id is required');
  if (manifest.id && !/^[a-z0-9-]+$/.test(manifest.id)) errors.push('id must be [a-z0-9-]+');
  if (!manifest.name || typeof manifest.name !== 'string') errors.push('name is required');
  if (!manifest.version || typeof manifest.version !== 'string') errors.push('version is required');
  if (!manifest.type || !Array.isArray(manifest.type)) errors.push('type array is required');
  if (manifest.type && !manifest.type.every((t) => ['check', 'widget'].includes(t))) {
    errors.push('type must contain only "check" or "widget"');
  }
  return errors;
}

function loadManifest(pluginDir) {
  const manifestPath = path.join(pluginDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch {
    return null;
  }
}

async function loadAll() {
  ensurePluginsDir();
  const entries = fs.readdirSync(PLUGINS_DIR, { withFileTypes: true });
  const warnings = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const pluginDir = path.join(PLUGINS_DIR, entry.name);
    const manifest = loadManifest(pluginDir);
    if (!manifest) {
      warnings.push(`Skipping ${entry.name}: invalid or missing manifest.json`);
      continue;
    }
    const errors = validateManifest(manifest);
    if (errors.length) {
      warnings.push(`Skipping ${entry.name}: ${errors.join('; ')}`);
      continue;
    }
    // Upsert into DB
    try {
      const existing = await dbAll('SELECT id FROM plugins WHERE id = ?', [manifest.id]);
      if (!existing.length) {
        await dbRun(
          'INSERT INTO plugins (id, name, version, type_json, manifest_json, enabled, installed_at) VALUES (?, ?, ?, ?, ?, 1, ?)',
          [manifest.id, manifest.name, manifest.version, JSON.stringify(manifest.type), JSON.stringify(manifest), Date.now()]
        );
      }
    } catch (err) {
      console.error(`Plugin DB upsert failed for ${manifest.id}:`, err.message);
    }
  }
  return warnings;
}

async function install(zipBuffer) {
  ensurePluginsDir();
  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries();

  // Check total size
  const totalSize = entries.reduce((sum, e) => sum + e.header.size, 0);
  if (totalSize > MAX_UPLOAD_MB * 1024 * 1024) {
    throw new Error(`Plugin exceeds ${MAX_UPLOAD_MB}MB limit`);
  }

  // Validate paths (zip slip prevention)
  for (const entry of entries) {
    const entryName = entry.entryName;
    if (entryName.includes('..') || path.isAbsolute(entryName)) {
      throw new Error(`Invalid path in zip: ${entryName}`);
    }
  }

  // Extract manifest first
  const manifestEntry = entries.find((e) => e.entryName.endsWith('manifest.json'));
  if (!manifestEntry) throw new Error('No manifest.json found in zip');

  const manifest = JSON.parse(manifestEntry.getData().toString('utf8'));
  const errors = validateManifest(manifest);
  if (errors.length) throw new Error(`Invalid manifest: ${errors.join('; ')}`);

  // Check if already installed
  const existing = await dbAll('SELECT id FROM plugins WHERE id = ?', [manifest.id]);
  if (existing.length) throw new Error(`Plugin ${manifest.id} already installed. Uninstall first.`);

  // Extract to plugins/<id>/
  const pluginDir = path.join(PLUGINS_DIR, manifest.id);
  if (fs.existsSync(pluginDir)) fs.rmSync(pluginDir, { recursive: true });
  zip.extractAllTo(pluginDir, true);

  // Register in DB
  await dbRun(
    'INSERT INTO plugins (id, name, version, type_json, manifest_json, enabled, installed_at) VALUES (?, ?, ?, ?, ?, 1, ?)',
    [manifest.id, manifest.name, manifest.version, JSON.stringify(manifest.type), JSON.stringify(manifest), Date.now()]
  );

  const warnings = [];
  // Check required files exist
  if (manifest.type.includes('check') && !fs.existsSync(path.join(pluginDir, manifest.checkEntry || 'check.js'))) {
    warnings.push('check.js not found but type includes "check"');
  }
  if (manifest.type.includes('widget') && !fs.existsSync(path.join(pluginDir, manifest.widgetEntry || 'widget.js'))) {
    warnings.push('widget.js not found but type includes "widget"');
  }

  return { id: manifest.id, warnings };
}

async function enable(id) {
  await dbRun('UPDATE plugins SET enabled = 1 WHERE id = ?', [id]);
}

async function disable(id) {
  await dbRun('UPDATE plugins SET enabled = 0 WHERE id = ?', [id]);
}

async function uninstall(id) {
  // Check if any device references this plugin
  const refs = await dbAll('SELECT device_id FROM plugin_device_config WHERE plugin_id = ?', [id]);
  if (refs.length) {
    const deviceIds = refs.map((r) => r.device_id).join(', ');
    throw new Error(`Plugin in use by device(s) ${deviceIds}. Remove from devices first.`);
  }
  // Remove from DB
  await dbRun('DELETE FROM plugins WHERE id = ?', [id]);
  await dbRun('DELETE FROM plugin_device_config WHERE plugin_id = ?', [id]);
  // Remove files
  const pluginDir = path.join(PLUGINS_DIR, id);
  if (fs.existsSync(pluginDir)) fs.rmSync(pluginDir, { recursive: true });
}

function get(id) {
  const pluginDir = path.join(PLUGINS_DIR, id);
  return loadManifest(pluginDir);
}

function list() {
  ensurePluginsDir();
  const entries = fs.readdirSync(PLUGINS_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => loadManifest(path.join(PLUGINS_DIR, e.name)))
    .filter(Boolean);
}

function getPluginDir(id) {
  return path.join(PLUGINS_DIR, id);
}

module.exports = { loadAll, install, enable, disable, uninstall, get, list, getPluginDir, validateManifest };
