const { dbAll, dbRun } = require('../db');

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

async function snmpInterfaces(ip, community = 'public', timeout = 2000) {
  try {
    const snmp = require('net-snmp');
    return new Promise((resolve) => {
      const session = snmp.createSession(ip, community, { timeout: Math.floor(timeout / 1000), retries: 0 });
      const ifTableOid = '1.3.6.1.2.1.2.2.1';
      const results = {};

      session.walk(ifTableOid, 20, (varbinds) => {
        for (const vb of varbinds) {
          if (vb.value instanceof Buffer || typeof vb.value === 'number') {
            const parts = vb.oid.split('.');
            const colIdx = parts[parts.length - 2]; // column number
            const ifIndex = parts[parts.length - 1];

            if (!results[ifIndex]) results[ifIndex] = { ifIndex: parseInt(ifIndex) };

            switch (colIdx) {
              case '2': results[ifIndex].ifDescr = vb.value.toString ? vb.value.toString('utf8') : String(vb.value); break;
              case '8': results[ifIndex].ifOperStatus = vb.value; break;
              case '10': results[ifIndex].inOctets = vb.value; break;
              case '16': results[ifIndex].outOctets = vb.value; break;
            }
          }
        }
      }, (error) => {
        session.close();
        if (error) return resolve([]);
        resolve(Object.values(results).filter((r) => r.ifDescr));
      });
    });
  } catch {
    return [];
  }
}

async function pollSnmpInterfaces(deviceId, ip, community = 'public') {
  const interfaces = await snmpInterfaces(ip, community);
  if (!interfaces.length) return;

  const now = Date.now();
  for (const iface of interfaces) {
    // Get previous values for bandwidth calculation
    const prev = await dbAll(
      'SELECT in_octets, out_octets, timestamp FROM snmp_interface_history WHERE device_id = ? AND if_index = ? ORDER BY timestamp DESC LIMIT 1',
      [deviceId, iface.ifIndex]
    );

    let inBps = null, outBps = null;
    if (prev.length && iface.inOctets != null && iface.outOctets != null) {
      const p = prev[0];
      const deltaSec = (now - p.timestamp) / 1000;
      if (deltaSec > 0 && p.in_octets != null && iface.inOctets >= p.in_octets) {
        inBps = Math.round(((iface.inOctets - p.in_octets) * 8) / deltaSec);
      }
      if (deltaSec > 0 && p.out_octets != null && iface.outOctets >= p.out_octets) {
        outBps = Math.round(((iface.outOctets - p.out_octets) * 8) / deltaSec);
      }
    }

    await dbRun(
      'INSERT INTO snmp_interface_history (device_id, if_index, if_descr, if_oper_status, in_octets, out_octets, in_bps, out_bps, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [deviceId, iface.ifIndex, iface.ifDescr || null, iface.ifOperStatus || null, iface.inOctets || null, iface.outOctets || null, inBps, outBps, now]
    );
  }
}

module.exports = { snmpProbe, snmpInterfaces, pollSnmpInterfaces };
