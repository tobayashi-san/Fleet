const db = require('../../db');
const { can, filterServers, getPermissions } = require('../../utils/permissions');
const { updateCatalogAge } = require('../../utils/update-catalog-age');

// Read only cached catalogs. Opening the dashboard must not start SSH work.
module.exports = function updateDashboard(req, res) {
  const permissions = getPermissions(req.user);
  if (!can(permissions, 'canViewServers') || !can(permissions, 'canViewUpdates')) {
    return res.status(403).json({ error: 'Permission denied' });
  }
  const environmentId = req.environmentId || 'default';
  const hosts = filterServers(db.servers.getAll(), permissions)
    .filter(host => String(host.environment_id || 'default') === environmentId);
  const attempt = db.db.prepare('SELECT status, reason, attempted_at FROM host_check_attempts WHERE server_id = ? AND kind = ?');
  res.json(hosts.map(host => {
    const system = db.updatesCache.getWithMeta(host.id);
    const docker = can(permissions, 'canViewDocker') && host.docker_enabled
      ? db.dockerImageUpdatesCache.getWithMeta(host.id) : null;
    return {
      id: host.id, name: host.name, status: host.status, ip_address: host.ip_address,
      reboot_required: Boolean(db.serverInfo.get(host.id)?.reboot_required),
      system: {
        updates: system?.updates || [], checked_at: system?.updated_at || null,
        ...updateCatalogAge(system?.updated_at, db.settings.get('poll_updates_interval_min')),
        failure: attempt.get(host.id, 'os') || null,
      },
      ...(can(permissions, 'canViewDocker') ? { docker: host.docker_enabled ? {
        updates: docker?.results || [], checked_at: docker?.updated_at || null,
        ...updateCatalogAge(docker?.updated_at, db.settings.get('poll_image_updates_interval_min') || 360),
        failure: attempt.get(host.id, 'images') || null,
      } : null } : {}),
    };
  }));
};
