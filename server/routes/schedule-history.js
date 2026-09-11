const { canAccessWorkflowHistory } = require('../utils/workflow-history-scope');
const express = require('express');
const router = express.Router();
const db = require('../db');
const { getPermissions, can, canAccessEnvironment } = require('../utils/permissions');

// GET /api/schedule-history?limit=100&scheduleId=xxx
router.get('/', (req, res) => {
  if (!can(getPermissions(req.user), 'canViewSchedules')) {
    return res.status(403).json({ error: 'Permission denied' });
  }
  const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 100));
  const scheduleId = req.query.scheduleId || null;
  const environmentId = req.environmentId || String(req.query.environment_id || 'default').trim() || 'default';

  const perms = getPermissions(req.user);
  if (!perms) return res.status(403).json({ error: 'Permission denied' });
  if (!canAccessEnvironment(perms, environmentId)) return res.status(403).json({ error: 'Environment access denied' });

  const paged = req.query.page !== undefined;
  const page = Number(req.query.page || 1);
  if (paged && (!Number.isSafeInteger(page) || page < 1 || page > 100000)) return res.status(400).json({ error: 'Invalid history page' });
  const status = req.query.status || '';
  if (status && !['success','failed','running','queued','cancelled','skipped','unknown'].includes(status)) return res.status(400).json({ error: 'Invalid history status' });
  const allServers = db.servers.getAll(environmentId);
  const accessible = db.scheduleHistory.getAll(-1, null, environmentId)
    .filter(row => perms.full || canAccessWorkflowHistory(perms, row, allServers));
  const visible = accessible.filter(row => (!scheduleId || row.schedule_id === scheduleId) && (!status || row.status === status));
  if (!paged) return res.json(visible.slice(0, limit));
  const pageSize = 25;
  const existingIds = new Set(db.schedules.getAll(environmentId).map(schedule => schedule.id));
  const historicalSchedules = new Map();
  for (const row of accessible) {
    if (row.schedule_id && !historicalSchedules.has(row.schedule_id)) historicalSchedules.set(row.schedule_id, {
      id: row.schedule_id, name: row.schedule_name || row.playbook, deleted: !existingIds.has(row.schedule_id),
    });
  }
  res.json({ schedules: [...historicalSchedules.values()], items: visible.slice((page - 1) * pageSize, page * pageSize), total: visible.length, page, pageSize });
});

// GET /api/schedule-history/:id  (includes full output)
router.get('/:id', (req, res) => {
  if (!can(getPermissions(req.user), 'canViewSchedules')) {
    return res.status(403).json({ error: 'Permission denied' });
  }
  const row = db.scheduleHistory.getById(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (req.environmentId && String(row.environment_id || 'default') !== req.environmentId) {
    return res.status(404).json({ error: 'Not found' });
  }

  // Restricted users can only view history for servers they have access to
  const perms = getPermissions(req.user);
  if (!canAccessEnvironment(perms, row.environment_id || 'default')) return res.status(403).json({ error: 'Environment access denied' });
  const environmentId = row.environment_id || 'default';
  const environmentServers = db.servers.getAll().filter(server =>
    String(server.environment_id || 'default') === environmentId);
  if (!canAccessWorkflowHistory(perms, row, environmentServers)) {
    return res.status(403).json({ error: 'Permission denied' });
  }

  res.json(row);
});

module.exports = router;
