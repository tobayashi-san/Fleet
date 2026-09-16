const { hostCheckQuality } = require('../utils/host-check-quality');
const { updateCatalogAge } = require('../utils/update-catalog-age');
const {agentReportStatus}=require('../utils/agent-report-status');
const express = require('express');
const db = require('../db');
const { getPermissions, filterServers, can } = require('../utils/permissions');
const { serverError } = require('../utils/http-error');
const { authenticatedApiLimiter } = require('../utils/rate-limiters');
const { buildServerAttention } = require('../utils/server-attention');

const router = express.Router();

function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

router.get('/', authenticatedApiLimiter, (req, res) => {
  try {
    const perms = getPermissions(req.user);
    if (!can(perms, 'canViewServers')) return res.status(403).json({ error: 'Permission denied' });
    const environmentId = req.environmentId || 'default';
    const servers = filterServers(db.servers.getAll(environmentId), perms);
    const canViewUpdates = can(perms, 'canViewUpdates');
    const canViewDocker = can(perms, 'canViewDocker');
    const canViewCustomUpdates = can(perms, 'canViewCustomUpdates');
    const agentEnabled = db.settings.get('agent_enabled') === '1';
    const canViewHistory = canViewUpdates || can(perms, 'canViewServerHistory');
    const visibleServerIds = servers.map(server => server.id);
    const visibleAlerts = db.resourceAlerts.list({
      statuses: ['active'],
      serverIds: visibleServerIds,
      limit: 500,
    });
    const online = servers.filter(s => s.status === 'online').length;
    const offline = servers.filter(s => s.status === 'offline').length;

    let rebootRequired = 0;
    let totalUpdates = 0;

    const serverStats = servers.map(s => {
      const info = db.serverInfo.get(s.id);
      const updatesMeta = canViewUpdates ? db.updatesCache.getWithMeta(s.id) : null;
      const updates = updatesMeta?.updates || [];
      const containers = canViewDocker ? db.dockerContainers.getByServer(s.id) : [];
      const imageUpdatesMeta = canViewDocker && canViewUpdates ? db.dockerImageUpdatesCache.getWithMeta(s.id) : null;
      const imageUpdates = imageUpdatesMeta ? imageUpdatesMeta.results : null;
      const agentCfg = agentEnabled ? db.agentConfig.getByServerId(s.id) : null;
      const history = canViewHistory ? db.updateHistory.getByServer(s.id) : [];
      const alerts = visibleAlerts.filter(alert => String(alert.server_id) === String(s.id));

      if (canViewUpdates && info?.reboot_required) rebootRequired++;
      if (canViewUpdates) totalUpdates += updates.filter(u => !u.phased).length;

      const isOnline = s.status === 'online';
      const ramPct = (isOnline && info?.ram_total_mb) ? Math.round((info.ram_used_mb / info.ram_total_mb) * 100) : null;
      const diskPct = (isOnline && info?.disk_total_gb) ? Math.round((info.disk_used_gb / info.disk_total_gb) * 100) : null;

      let agentMode = 'legacy';
      let agentState = 'legacy';
      let agentLastSeen = null;
      if (agentCfg && agentCfg.mode && agentCfg.mode !== 'legacy') {
        agentMode = agentCfg.mode;
        const report = agentReportStatus(agentCfg);
        agentLastSeen = report.lastSeen;
        agentState = report.health;
      }

      // A dashboard must be able to show why a custom desired state differs,
      // but never expose executable commands through this aggregate endpoint.
      // The task editor remains the only place that returns those fields.
      const customUpdateTasks = canViewCustomUpdates
        ? db.customUpdateTasks.getByServer(s.id).map(task => ({
          id: task.id,
          name: task.name,
          type: task.type,
          current_version: task.current_version,
          last_version: task.last_version,
          trigger_output: task.trigger_output,
          has_update: !!task.has_update,
          last_checked_at: task.last_checked_at,
          last_attempted_at: task.last_attempted_at,
          last_check_error: task.last_check_error,
        }))
        : undefined;

      const customUpdatesCount = canViewCustomUpdates ? db.customUpdateTasks.countHasUpdate(s.id) : 0;
      const attention = buildServerAttention({
        server: s,
        info,
        updates,
        imageUpdates,
        customUpdatesCount,
        customCheckFailures: canViewCustomUpdates ? db.customUpdateTasks.countCheckFailures(s.id) : 0,
        history,
        alerts,
        includeUpdates: canViewUpdates,
        includeDockerUpdates: canViewDocker && canViewUpdates,
        includeCustomUpdates: canViewCustomUpdates,
        includeHistory: canViewHistory,
      });

      return {
        id: s.id,
        check_quality: hostCheckQuality(db, s, {updates: canViewUpdates, docker: canViewDocker, custom: canViewCustomUpdates}),
        name: s.name,
        ip_address: s.ip_address,
        tags: JSON.parse(s.tags || '[]'),
        links: parseJsonArray(s.links),
        status: s.status,
        last_seen: s.last_seen,
        os: info?.os || null,
        uptime_seconds: isOnline ? (info?.uptime_seconds || null) : null,
        ram_pct: ramPct,
        disk_pct: diskPct,
        cpu_pct: isOnline ? (info?.cpu_usage_pct ?? null) : null,
        load_avg: isOnline ? (info?.load_avg || null) : null,
        ...(canViewUpdates ? {
          reboot_required: !!info?.reboot_required,
          updates_count: updatesMeta ? updates.filter(u => !u.phased).length : null,
          updates_checked_at: updatesMeta?.updated_at || null,
        updates_stale: updateCatalogAge(updatesMeta?.updated_at, db.settings.get('poll_updates_interval_min')).stale,
        } : {}),
        ...(canViewDocker ? {
          containers_running: containers.filter(c => c.state === 'running').length,
          containers_total: containers.length,
        } : {}),
        ...(canViewDocker && canViewUpdates ? {
          image_updates_count: imageUpdates === null ? null : imageUpdates.filter(r => r.status === 'update_available').length,
          image_updates_checked_at: imageUpdatesMeta?.updated_at || null,
        image_updates_stale: updateCatalogAge(imageUpdatesMeta?.updated_at, db.settings.get('poll_image_updates_interval_min') || 360).stale,
        } : {}),
        ...(canViewCustomUpdates ? { custom_updates_count: customUpdatesCount, custom_updates_stale: db.customUpdateTasks.getByServer(s.id).some(task => updateCatalogAge(task.last_checked_at, db.settings.get('poll_custom_updates_interval_min') || 360).stale) } : {}),
        ...(customUpdateTasks ? { custom_update_tasks: customUpdateTasks } : {}),
        info_cached_at: info?.updated_at || null,
        agent_mode: agentMode,
        agent_state: agentState,
        agent_last_seen: agentLastSeen,
        attention,
      };
    });

    // A resource name is presentation, never an access-control identifier.
    // Apply host scope before LIMIT so other hosts cannot displace the user's
    // visible history. Dashboard summaries intentionally exclude log output.
    const completeHostScope = Boolean(perms?.full || perms?.servers === 'all');
    const allRecentHistory = canViewHistory ? db.db.prepare(`
      SELECT h.id, h.server_id, h.environment_id, h.action, h.status,
             h.started_at, h.completed_at, h.triggered_by,
             COALESCE(h.server_name_snapshot, s.name, h.server_id) as server_name,
             CASE WHEN s.id IS NULL THEN 1 ELSE 0 END as target_deleted
      FROM update_history h
      LEFT JOIN servers s ON h.server_id = s.id
      WHERE h.environment_id = ?
        AND (? = 1 OR h.server_id IN (SELECT value FROM json_each(?)))
      ORDER BY h.started_at DESC LIMIT 500
    `).all(environmentId, completeHostScope ? 1 : 0, JSON.stringify(servers.map(server => server.id))) : [];

    const recentHistory = allRecentHistory.slice(0, 8);
    const failedOperations = allRecentHistory.filter(history => history.status === 'failed').length;

    res.json({
      summary: { total: servers.length, online, offline, unknown: servers.length - online - offline, rebootRequired, totalUpdates, failedOperations },
      servers: serverStats,
      alerts: visibleAlerts,
      agentEnabled,
      recentHistory,
    });
  } catch (e) {
    serverError(res, e, 'dashboard stats');
  }
});

module.exports = router;
