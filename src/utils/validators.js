function isValidHost(host) {
  if (typeof host !== 'string' || host.length === 0 || host.length > 253) return false;
  return /^[a-zA-Z0-9.:\-]+$/.test(host);
}

function isValidPort(port) {
  const n = Number(port);
  return Number.isInteger(n) && n > 0 && n <= 65535;
}

module.exports = { isValidHost, isValidPort };
