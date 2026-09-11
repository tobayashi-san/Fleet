'use strict';
const crypto = require('node:crypto');
function authenticateRecoveryCiphertext(encoded, secret) {
  const key = crypto.createHash('sha256').update(secret).digest();
  try {
    const bytes = Buffer.from(encoded,'base64');
    if (bytes.length < 33) throw Error('Invalid ciphertext');
    const decipher = crypto.createDecipheriv('aes-256-gcm',key,bytes.subarray(0,16));
    decipher.setAuthTag(bytes.subarray(16,32));
    const plaintext = decipher.update(bytes.subarray(32));
    try { decipher.final().fill(0); } finally { plaintext.fill(0); }
  } finally { key.fill(0); }
}
module.exports = {authenticateRecoveryCiphertext};
