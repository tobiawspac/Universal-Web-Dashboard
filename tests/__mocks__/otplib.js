const authenticator = {
  generateSecret: () => 'MOCKSECRET123456',
  keyuri: (label, issuer, secret) => `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`,
  verify: ({ token }) => token === '123456',
  check: ({ token }) => token === '123456',
};

module.exports = { authenticator };
module.exports.authenticator = authenticator;
