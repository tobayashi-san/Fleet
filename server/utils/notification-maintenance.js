'use strict';

/** Suppress only when the complete recorded target set is known and currently covered. */
function coveredByMaintenance(db, environmentId, serverIds, now = Date.now()) {
  if (!environmentId || !Array.isArray(serverIds) || !serverIds.length || serverIds.some(id => typeof id !== 'string' || !id)) return false;
  try {
    const ids = [...new Set(serverIds)];
    const hosts = db.prepare('SELECT id FROM servers WHERE environment_id=?').all(environmentId);
    const current = new Set(hosts.map(host => host.id));
    if (ids.some(id => !current.has(id))) return false;
    const windows = db.prepare('SELECT * FROM maintenance_windows WHERE environment_id=?').all(environmentId);
    const covered = new Set();
    for (const window of windows) {
      if (window.cancelled_at) continue;
      if (!(Date.parse(window.starts_at) <= now && now < Date.parse(window.ends_at))) continue;
      let scope;
      try { scope = JSON.parse(window.resource_ids || '[]'); } catch { continue; }
      if (!Array.isArray(scope) || scope.some(id => typeof id !== 'string')) continue;
      if (!scope.length) return true;
      scope.forEach(id => covered.add(id));
    }
    return ids.every(id => covered.has(id));
  } catch { return false; } // Uncertain coverage must not hide an operational failure.
}
module.exports = { coveredByMaintenance };
