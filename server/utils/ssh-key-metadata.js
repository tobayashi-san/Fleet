const { createHash } = require('crypto');
function sshKeyMetadata(publicKey) {
  const [algorithm, encoded] = String(publicKey || '').trim().split(/\s+/);
  if (!algorithm || !encoded || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) return { algorithm: null, fingerprint: null };
  const blob = Buffer.from(encoded, 'base64');
  if (blob.length < 4 || blob.readUInt32BE(0) > blob.length - 4 || blob.subarray(4, 4 + blob.readUInt32BE(0)).toString() !== algorithm) return { algorithm: null, fingerprint: null };
  return { algorithm, fingerprint: `SHA256:${createHash('sha256').update(blob).digest('base64').replace(/=+$/, '')}` };
}
module.exports = { sshKeyMetadata };
