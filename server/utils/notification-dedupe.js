'use strict';

function createNotificationDeduper({ now = Date.now, maxEntries = 1000 } = {}) {
  const entries = new Map();
  return async function dedupe(key, windowMs, send) {
    if (!key || !(windowMs > 0)) return send();
    const existing = entries.get(key);
    if (existing?.pending) {
      await existing.pending.catch(() => {});
      return dedupe(key, windowMs, send);
    }
    if (existing?.expires > now()) return { ok: true, suppressed: true };
    for (const [id, entry] of entries) if (!entry.pending && entry.expires <= now()) entries.delete(id);
    if (entries.size >= maxEntries) {
      const removable = [...entries].find(([, entry]) => !entry.pending);
      if (removable) entries.delete(removable[0]);
      else return send();
    }
    const entry = {};
    // Defer invocation until the pending entry is installed, coalescing simultaneous arrivals.
    entry.pending = Promise.resolve().then(send);
    entries.set(key, entry);
    try {
      const result = await entry.pending;
      if (result?.ok === true && !result.partial) {
        entry.expires = now() + windowMs;
        delete entry.pending;
      } else entries.delete(key);
      return result;
    } catch (error) { entries.delete(key); throw error; }
  };
}
module.exports = { createNotificationDeduper };
