const os = require('os');
const { execFile } = require('child_process');
const { pingDevice } = require('../utils/checks');
const { dbAll, dbRun } = require('../db');
const { broadcast } = require('../realtime');

// --- OUI Vendor Lookup ---
let ouiTable = null;
function loadOuiTable() {
  if (ouiTable) return ouiTable;
  try {
    ouiTable = require('../../data/oui-table.json');
  } catch {
    ouiTable = {};
  }
  return ouiTable;
}

function guessVendor(mac) {
  if (!mac) return null;
  const table = loadOuiTable();
  const prefix = mac.replace(/[:-]/g, '').substring(0, 6).toUpperCase();
  return table[prefix] || null;
}

// --- Get Local Subnets ---
function getLocalSubnets() {
  const interfaces = os.networkInterfaces();
  const subnets = [];
  for (const [name, addrs] of Object.entries(interfaces)) {
    for (const addr of addrs) {
      if (addr.family !== 'IPv4' || addr.internal) continue;
      const mask = addr.netmask;
      const ip = addr.address;
      const cidr = ipToCidr(ip, mask);
      if (cidr && cidr.split('/')[1] !== '32') {
        subnets.push({ cidr, iface: name, address: ip, netmask: mask });
      }
    }
  }
  return subnets;
}

function ipToCidr(ip, mask) {
  const ipNum = ipToNum(ip);
  const maskNum = ipToNum(mask);
  const network = ipNum & maskNum;
  const bits = maskToBits(mask);
  return numToIp(network) + '/' + bits;
}

function ipToNum(ip) {
  return ip.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct, 10), 0) >>> 0;
}

function numToIp(num) {
  return [(num >>> 24) & 0xff, (num >>> 16) & 0xff, (num >>> 8) & 0xff, num & 0xff].join('.');
}

function maskToBits(mask) {
  return mask.split('.').reduce((bits, oct) => bits + (parseInt(oct, 10).toString(2).match(/1/g) || []).length, 0);
}

function cidrToRange(cidr) {
  const [network, bits] = cidr.split('/');
  const b = parseInt(bits, 10);
  const networkNum = ipToNum(network);
  const hostBits = 32 - b;
  const start = (networkNum + 1) >>> 0; // skip network addr
  const end = (networkNum + (1 << hostBits) - 2) >>> 0; // skip broadcast
  return { start, end, count: end - start + 1 };
}

// --- Ping Sweep with Concurrency Limit ---
async function pingSweep(cidr, opts = {}, onProgress) {
  const { concurrency = 20, timeout = 1000 } = opts;
  const { start, end, count } = cidrToRange(cidr);
  if (count > 4096) throw new Error('Subnet too large (max /20)');

  const results = [];
  let checked = 0;
  const queue = [];

  for (let addr = start; addr <= end; addr++) {
    queue.push(numToIp(addr));
  }

  async function runOne(ip) {
    try {
      const result = await pingDevice(ip, timeout);
      if (result.alive) {
        results.push({ ip, alive: true, latencyMs: result.latencyMs });
      }
    } catch {}
    checked++;
    if (onProgress) onProgress({ checked, total: count });
  }

  // Process with concurrency limit
  const executing = new Set();
  for (const ip of queue) {
    const p = runOne(ip).then(() => { executing.delete(p); });
    executing.add(p);
    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }
  await Promise.all(executing);

  return results;
}

// --- Read ARP Table ---
async function readArpTable() {
  const platform = process.platform;
  try {
    if (platform === 'win32') {
      return await parseWindowsArp();
    } else {
      return await parseLinuxArp();
    }
  } catch {
    return [];
  }
}

function parseWindowsArp() {
  return new Promise((resolve, reject) => {
    execFile('arp', ['-a'], { timeout: 5000 }, (err, stdout) => {
      if (err) return reject(err);
      const entries = [];
      const lines = stdout.split('\n');
      for (const line of lines) {
        const match = line.match(/^\s*(\d+\.\d+\.\d+\.\d+)\s+([\w-]{17})\s+(dynamic|static)/i);
        if (match) {
          entries.push({ ip: match[1], mac: match[2].replace(/-/g, ':').toUpperCase() });
        }
      }
      resolve(entries);
    });
  });
}

function parseLinuxArp() {
  return new Promise((resolve, reject) => {
    // Try 'ip neigh' first, fallback to 'arp -a'
    execFile('ip', ['neigh'], { timeout: 5000 }, (err, stdout) => {
      if (!err && stdout) {
        const entries = [];
        const lines = stdout.split('\n');
        for (const line of lines) {
          const match = line.match(/^(\d+\.\d+\.\d+\.\d+)\s+dev\s+\S+\s+(?:lladdr\s+)?([\w:]{17})/i);
          if (match) {
            entries.push({ ip: match[1], mac: match[2].toUpperCase() });
          }
        }
        return resolve(entries);
      }
      // Fallback to arp -a
      execFile('arp', ['-a'], { timeout: 5000 }, (err2, stdout2) => {
        if (err2) return reject(err2);
        const entries = [];
        const lines = stdout2.split('\n');
        for (const line of lines) {
          const match = line.match(/\((\d+\.\d+\.\d+\.\d+)\)\s+at\s+([\w:]{17})/i);
          if (match) {
            entries.push({ ip: match[1], mac: match[2].toUpperCase() });
          }
        }
        resolve(entries);
      });
    });
  });
}

// --- SNMP Probe (best-effort) ---
async function snmpProbe(ip, community = 'public', timeout = 2000) {
  try {
    const snmp = require('net-snmp');
    return new Promise((resolve) => {
      const session = snmp.createSession(ip, community, { timeout: Math.floor(timeout / 1000), retries: 0 });
      const oids = ['1.3.6.1.2.1.1.1.0', '1.3.6.1.2.1.1.5.0', '1.3.6.1.2.1.1.3.0'];
      session.get(oids, (error, varbinds) => {
        session.close();
        if (error) return resolve({ reachable: false });
        const result = { reachable: true };
        for (const vb of varbinds) {
          if (vb.value instanceof Buffer) {
            const val = vb.value.toString('utf8');
            if (vb.oid === '1.3.6.1.2.1.1.1.0') result.sysDescr = val;
            if (vb.oid === '1.3.6.1.2.1.1.5.0') result.sysName = val;
            if (vb.oid === '1.3.6.1.2.1.1.3.0') result.sysUpTime = vb.value;
          }
        }
        resolve(result);
      });
    });
  } catch {
    return { reachable: false };
  }
}

// --- Full Scan Orchestration ---
const activeScans = new Map();

async function runScan(cidr, opts = {}) {
  const scanId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  activeScans.set(scanId, { status: 'running', found: 0 });

  (async () => {
    try {
      const [pingResults, arpEntries] = await Promise.all([
        pingSweep(cidr, opts, ({ checked, total }) => {
          broadcast('discovery:progress', { scanId, checked, total });
        }),
        readArpTable(),
      ]);

      // Merge ARP data with ping results
      const arpMap = new Map(arpEntries.map((e) => [e.ip, e.mac]));
      const now = Date.now();

      for (const entry of pingResults) {
        const mac = arpMap.get(entry.ip) || null;
        const vendor = guessVendor(mac);

        // Try SNMP probe (best-effort, short timeout)
        let snmpInfo = {};
        try { snmpInfo = await snmpProbe(entry.ip); } catch {}

        // Upsert into discovered_devices
        const existing = await dbAll('SELECT id FROM discovered_devices WHERE ip = ?', [entry.ip]);
        if (existing.length) {
          await dbRun(
            'UPDATE discovered_devices SET mac=?, vendor_guess=?, snmp_sysdescr=?, last_seen=? WHERE id=?',
            [mac, vendor, snmpInfo.sysDescr || null, now, existing[0].id]
          );
        } else {
          const result = await dbRun(
            'INSERT INTO discovered_devices (ip, mac, vendor_guess, snmp_sysdescr, first_seen, last_seen) VALUES (?,?,?,?,?,?)',
            [entry.ip, mac, vendor, snmpInfo.sysDescr || null, now, now]
          );
          entry.id = result.lastID;
        }

        broadcast('discovery:found', {
          scanId,
          device: { ip: entry.ip, mac, vendorGuess: vendor, sysDescr: snmpInfo.sysDescr, sysName: snmpInfo.sysName },
        });
        activeScans.get(scanId).found++;
      }

      activeScans.get(scanId).status = 'done';
      broadcast('discovery:done', { scanId, foundCount: pingResults.length });
    } catch (err) {
      console.error('Scan failed:', err.message);
      activeScans.get(scanId).status = 'error';
      broadcast('discovery:done', { scanId, foundCount: 0, error: err.message });
    }
  })();

  return scanId;
}

function getScanStatus(scanId) {
  return activeScans.get(scanId) || null;
}

module.exports = {
  getLocalSubnets,
  pingSweep,
  readArpTable,
  guessVendor,
  snmpProbe,
  runScan,
  getScanStatus,
};
