'use strict';
const { updateCatalogAge } = require('./update-catalog-age');

function hostCheckQuality(db, server, access) {
  const attempts = db.db.prepare('SELECT * FROM host_check_attempts WHERE server_id=?').all(server.id);
  const checks = [];
  function add(kind, label, cache, interval, source, applicable = true, failure = null) {
    const attempt = attempts.find(item => item.kind === kind);
    const checkedAt = cache?.updated_at || null;
    const state = !applicable ? 'not_applicable' : attempt?.status === 'failed' || failure ? 'failed' : !checkedAt ? 'not_checked' : updateCatalogAge(checkedAt, interval).stale ? 'stale' : 'current';
    checks.push({kind, label, state, checked_at: checkedAt, attempted_at: attempt?.attempted_at || null, source,
      reason: !applicable ? kind === 'images' ? 'Container monitoring is disabled for this host.' : 'No checks configured for this host.' : attempt?.status === 'failed' ? attempt.reason : failure || (state === 'not_checked' ? 'No successful result has been recorded.' : state === 'stale' ? 'The last successful result is older than the refresh interval.' : 'The latest result is current.')});
  }
  if (access.updates) add('os', 'OS packages', db.updatesCache.getWithMeta(server.id), db.settings.get('poll_updates_interval_min'), 'Host package manager over SSH');
  if (access.updates && access.docker) {
    const cache = db.dockerImageUpdatesCache.getWithMeta(server.id);
    const errors = (cache?.results || []).filter(item => ['error', 'check_failed', 'unknown'].includes(item.status));
    // docker_enabled is a configured capability, not evidence that an empty inventory was collected.
    add('images', 'Container images', cache, db.settings.get('poll_image_updates_interval_min') || 360, 'Registry digest comparison over SSH', !!server.docker_enabled, errors.length ? `${errors.length} image comparisons failed. Open workloads for individual results.` : null);
  }
  if (access.custom) {
    const tasks = db.customUpdateTasks.getByServer(server.id);
    const failed = tasks.filter(task => task.last_check_error);
    const oldest = tasks.every(task => task.last_checked_at) ? tasks.map(task => task.last_checked_at).sort()[0] : null;
    add('custom', 'Custom checks', oldest ? {updated_at: oldest} : null, db.settings.get('poll_custom_updates_interval_min') || 360, 'Configured custom checks', tasks.length > 0, failed.length ? `${failed.length} custom checks failed. Open updates for details.` : null);
  }
  return checks;
}
module.exports = {hostCheckQuality};
