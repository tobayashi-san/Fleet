const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { sshKeyMetadata } = require('../utils/ssh-key-metadata');
test('public key metadata matches OpenSSH SHA256 fingerprints for imported key algorithms', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'shipyard-key-metadata-'));
  try {
    for (const type of ['ed25519', 'rsa']) {
      const file = path.join(directory, type);
      execFileSync('ssh-keygen', ['-q', '-t', type, ...(type === 'rsa' ? ['-b', '2048'] : []), '-N', '', '-f', file]);
      const key = fs.readFileSync(file + '.pub', 'utf8');
      const expected = execFileSync('ssh-keygen', ['-lf', file + '.pub', '-E', 'sha256'], { encoding: 'utf8' }).trim().split(/\s+/)[1];
      assert.equal(sshKeyMetadata(key).fingerprint, expected);
      assert.equal(sshKeyMetadata(key).algorithm, `ssh-${type}`);
      assert.equal(sshKeyMetadata(key.split(' ').slice(0, 2).join(' ') + ' another comment').fingerprint, expected);
    }
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
test('malformed or mismatched key data is unavailable rather than mislabelled', () => {
  for (const value of ['', 'ssh-rsa invalid!', 'ssh-ed25519 AAAA']) assert.deepEqual(sshKeyMetadata(value), { algorithm: null, fingerprint: null });
});
