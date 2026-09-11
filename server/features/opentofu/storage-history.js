'use strict';
const BUCKET_MS = 5 * 60 * 1000;
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
function setupStorageHistory(database) {
  database.exec(`CREATE TABLE IF NOT EXISTS proxmox_storage_history (
    environment_id TEXT NOT NULL, endpoint TEXT NOT NULL, node_name TEXT NOT NULL, storage_id TEXT NOT NULL,
    bucket INTEGER NOT NULL, sampled_at INTEGER NOT NULL, used REAL NOT NULL, total REAL NOT NULL,
    PRIMARY KEY(environment_id,endpoint,node_name,storage_id,bucket)
  ); CREATE INDEX IF NOT EXISTS idx_proxmox_storage_history_time ON proxmox_storage_history(sampled_at);`);
}
function observeStorage(database, environmentId, endpoint, stores, now = Date.now()) {
  const record = database.prepare(`INSERT INTO proxmox_storage_history VALUES (?,?,?,?,?,?,?,?)
    ON CONFLICT(environment_id,endpoint,node_name,storage_id,bucket) DO UPDATE SET sampled_at=excluded.sampled_at,used=excluded.used,total=excluded.total
    WHERE excluded.sampled_at > proxmox_storage_history.sampled_at`);
  database.transaction(() => {
    database.prepare('DELETE FROM proxmox_storage_history WHERE sampled_at < ?').run(now - RETENTION_MS);
    for (const store of stores) {
      if (store.active !== true || store.enabled === false || store.capacity_reported !== true || !Number.isFinite(store.used) || !Number.isFinite(store.total) || store.total <= 0 || store.used < 0 || store.used > store.total) continue;
      record.run(environmentId, endpoint, store.node_name, store.id, Math.floor(now / BUCKET_MS), now, store.used, store.total);
    }
  })();
  const read = database.prepare(`SELECT sampled_at,used,total FROM proxmox_storage_history
    WHERE environment_id=? AND endpoint=? AND node_name=? AND storage_id=? ORDER BY sampled_at DESC LIMIT 48`);
  const hourly = database.prepare(`SELECT MAX(sampled_at) AS sampled_at, AVG(100.0 * used / total) AS used, 100 AS total, COUNT(*) AS observations
    FROM proxmox_storage_history WHERE environment_id=? AND endpoint=? AND node_name=? AND storage_id=?
    GROUP BY CAST(sampled_at / 3600000 AS INTEGER) ORDER BY sampled_at`);
  return stores.map(store => ({...store,
    capacity_history:read.all(environmentId,endpoint,store.node_name,store.id).reverse(),
    capacity_history_hourly:hourly.all(environmentId,endpoint,store.node_name,store.id),
  }));
}
function collectStorageResults(database, environmentId, endpoint, nodes, storageResults) {
  const datastores = [];
  storageResults.forEach((result, index) => {
    const node = nodes[index];
    node.datastores_checked_at = new Date().toISOString();
    node.datastores_status = result.status === 'fulfilled' && Array.isArray(result.value) ? 'available' : 'unavailable';
    if (node.datastores_status !== 'available') return;
    const pools = observeStorage(database, environmentId, endpoint, result.value
      .filter(item => item && item.storage)
      .map(item => ({
        id: String(item.storage),
        node_name: node.name,
        type: String(item.type || ''),
        content: typeof item.content === 'string' ? [...new Set(item.content.split(',').map(value => value.trim()).filter(Boolean))] : null,
        shared: [1, '1', true].includes(item.shared) ? true : [0, '0', false].includes(item.shared) ? false : null,
        active: [1, '1', true].includes(item.active) ? true : [0, '0', false].includes(item.active) ? false : null,
        enabled: [1, '1', true].includes(item.enabled) ? true : [0, '0', false].includes(item.enabled) ? false : null,
        capacity_reported: item.used !== null && item.used !== undefined && item.used !== '' && Number.isFinite(Number(item.used)) && Number(item.used) >= 0 && Number(item.total) > 0 && Number.isFinite(Number(item.total)) && Number(item.used) <= Number(item.total),
        used: Number(item.used) || 0,
        total: Number(item.total) || 0,
        available: Number(item.avail) || 0,
      })));
    node.datastores = pools;
    datastores.push(...pools);
  });
  return datastores;
}
module.exports = {setupStorageHistory, observeStorage, collectStorageResults, BUCKET_MS, RETENTION_MS};
