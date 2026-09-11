'use strict';
const {randomBytes} = require('node:crypto');

function createResetBackupTickets({now = Date.now, ttlMs = 5 * 60 * 1000, capacity = 20} = {}) {
  const entries = new Map();
  const remove = id => {
    clearTimeout(entries.get(id)?.timeout);
    entries.delete(id);
  };
  const prune = () => {
    for (const [id, entry] of entries) if (entry.expiresAt <= now()) remove(id);
  };
  return {
    issue(owner, action, scope, value) {
      prune();
      if (entries.size >= capacity) throw Error('Too many pending backup checks. Wait five minutes and retry.');
      const id = randomBytes(32).toString('hex');
      const expiresAt = now() + ttlMs;
      const timeout = setTimeout(() => remove(id), ttlMs);
      timeout.unref();
      entries.set(id, {owner, action, scope, value, expiresAt, timeout});
      return {id, expiresAt: new Date(expiresAt).toISOString()};
    },
    take(id, owner, action, scope) {
      prune();
      const entry = typeof id === 'string' ? entries.get(id) : undefined;
      if (!entry || entry.owner !== owner || entry.action !== action || entry.scope !== scope) throw Error('Backup approval is missing, expired or belongs to another reset. Verify your backup again.');
      remove(id);
      return entry.value;
    },
  };
}

module.exports = {createResetBackupTickets};
