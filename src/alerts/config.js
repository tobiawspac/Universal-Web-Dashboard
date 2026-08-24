const crypto = require('crypto');
const config = require('../config');

const ENCRYPTION_KEY = process.env.ALERT_ENCRYPTION_KEY || '';
const ALGO = 'aes-256-gcm';

function getKey() {
  if (!ENCRYPTION_KEY) return null;
  const key = Buffer.alloc(32);
  Buffer.from(ENCRYPTION_KEY).copy(key);
  return key;
}

function encrypt(text) {
  const key = getKey();
  if (!key) return text; // No encryption if key not set
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  let enc = cipher.update(text, 'utf8', 'hex');
  enc += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return iv.toString('hex') + ':' + tag + ':' + enc;
}

function decrypt(text) {
  const key = getKey();
  if (!key) return text; // No decryption if key not set
  const parts = text.split(':');
  if (parts.length !== 3) return text;
  const iv = Buffer.from(parts[0], 'hex');
  const tag = Buffer.from(parts[1], 'hex');
  const enc = parts[2];
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  let dec = decipher.update(enc, 'hex', 'utf8');
  dec += decipher.final('utf8');
  return dec;
}

const SENSITIVE_KEYS = ['botToken', 'password', 'pass', 'secret'];

function encryptConfig(configObj) {
  const result = { ...configObj };
  for (const key of SENSITIVE_KEYS) {
    if (result[key] && typeof result[key] === 'string' && !result[key].includes(':')) {
      result[key] = encrypt(result[key]);
    }
  }
  return result;
}

function decryptConfig(configObj) {
  const result = { ...configObj };
  for (const key of SENSITIVE_KEYS) {
    if (result[key] && typeof result[key] === 'string' && result[key].includes(':')) {
      try { result[key] = decrypt(result[key]); } catch {}
    }
  }
  return result;
}

function safeConfigForResponse(configObj) {
  const result = { ...configObj };
  for (const key of SENSITIVE_KEYS) {
    if (result[key]) result[key] = '••••••••';
  }
  return result;
}

module.exports = { encrypt, decrypt, encryptConfig, decryptConfig, safeConfigForResponse };
