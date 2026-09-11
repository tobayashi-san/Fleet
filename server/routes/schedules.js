const express = require('express');
const log = require('../utils/logger').child('schedule-registration');
const router = express.Router();
const db = require('../db');
const { validateExecutableSchedule } = require('../utils/schedule-preview');
const scheduler = require('../services/scheduler');
const { getPermissions, can, canAccessPlaybook, canAccessTargets, canAccessEnvironment } = require('../utils/permissions');
const { isValidPlaybook, validateTargets } = require('../utils/validate');

function requireScheduleCapability(capability) {
  return (req, res, next) => {
    if (!can(getPermissions(req.user), capability)) return res.status(403).json({ error: 'Permission denied' });
    next();
  };
}

function normalizeScheduleTargets(targets) {
  return typeof targets === 'string' ? targets.trim() : '';
}

function validateScheduleScope(req, playbook, targets, environmentId = 'default') {
  const perms = getPermissions(req.user);
  if (!db.db.prepare('SELECT 1 FROM environments WHERE id = ?').get(environmentId)) return 'Environment not found';
  if (!canAccessEnvironment(perms, environmentId)) return 'Environment access denied';
  if (!canAccessPlaybook(perms, playbook)) {
    return 'Playbook not permitted for your role';
  }
  const servers = db.servers.getAll().filter(server => String(server.environment_id || 'default') === environmentId);
  if (!canAccessTargets(perms, normalizeScheduleTargets(targets), servers)) {
    return 'Target servers not permitted for your role';
  }
  return null;
}

function canAccessSchedule(req, schedule) {
  if (req.environmentId && String(schedule.environment_id || 'default') !== req.environmentId) return false;
  return !validateScheduleScope(req, schedule.playbook, schedule.targets, schedule.environment_id || 'default');
}

router.get('/preview', (req, res) => {
  const perms = getPermissions(req.user);
  if (!['canViewSchedules', 'canAddSchedules', 'canEditSchedules'].some(cap => can(perms, cap))) return res.status(403).json({ error: 'Permission denied' });
  try { res.json(require('../utils/schedule-preview').previewSchedule(req.query.expression, scheduler.getSchedulerTimezone())); }
  catch (error) { res.status(400).json({ error: error.message || 'Schedule preview unavailable.' }); }
});

function presentSchedule(schedule) {
  return {
    ...schedule,
    next_run: scheduler.getNextRun(schedule.id),
    registration_status: scheduler.getRegistrationStatus(schedule),
    timezone: scheduler.getSchedulerTimezone(),
  };
}

// The database change has committed. Surface runtime failure as saved-but-inactive,
// rather than a generic write failure that encourages duplicate submissions.
function registerSavedSchedule(id) {
  try { scheduler.reload(id); } catch (error) { log.error({err:error,scheduleId:id}, 'Saved schedule could not be registered'); }
  return scheduler.getRegistrationStatus(db.schedules.getById(id));
}

router.post('/:id/retry-registration', requireScheduleCapability('canToggleSchedules'), (req, res) => {
  const existing = db.schedules.getById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Schedule not found' });
  if (!canAccessSchedule(req, existing)) return res.status(403).json({ error: 'Schedule access denied' });
  if (!existing.enabled) return res.status(409).json({ error: 'Enable this schedule before retrying registration.' });
  if (scheduler.getRegistrationStatus(existing) === 'registered') return res.json({registration_status:'registered'});
  db.auditLog.write('schedule.retry-registration', `Registration retry for schedule "${existing.name}"`, req.ip, true, req.user?.username);
  const registration_status = registerSavedSchedule(existing.id);
  if (registration_status !== 'registered') return res.status(503).json({ error: 'Schedule remains saved but is not registered. Review the server scheduler configuration and retry.' });
  res.json({ registration_status });
});

function validExtraVars(value) {
  return value === undefined || (value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.values(value).every(item => (['string', 'boolean'].includes(typeof item) || (typeof item === 'number' && Number.isFinite(item))))
    && JSON.stringify(value).length <= 4096);
}

// GET /api/schedules — list all
router.get('/', requireScheduleCapability('canViewSchedules'), (req, res) => {
  const environmentId = req.environmentId || String(req.query.environment_id || 'default').trim() || 'default';
  if (!db.db.prepare('SELECT 1 FROM environments WHERE id = ?').get(environmentId)) return res.status(400).json({ error: 'Environment not found' });
  if (!canAccessEnvironment(getPermissions(req.user), environmentId)) return res.status(403).json({ error: 'Environment access denied' });
  const schedules = db.schedules.getAll(environmentId).filter(schedule => canAccessSchedule(req, schedule));
  res.json(schedules.map(presentSchedule));
});

// GET /api/schedules/:id — single
router.get('/:id', requireScheduleCapability('canViewSchedules'), (req, res) => {
  const schedule = db.schedules.getById(req.params.id);
  if (!schedule) return res.status(404).json({ error: 'Schedule not found' });
  if (!canAccessSchedule(req, schedule)) return res.status(403).json({ error: 'Schedule access denied' });
  res.json(presentSchedule(schedule));
});

// POST /api/schedules — create
router.post('/', requireScheduleCapability('canAddSchedules'), (req, res) => {
  const { name, playbook, targets, cronExpression, extraVars, checkMode, forks } = req.body;
  const environmentId = req.environmentId || String(req.body.environment_id || 'default').trim() || 'default';
  if (!name || !playbook || !cronExpression || !normalizeScheduleTargets(targets)) {
    return res.status(400).json({ error: 'name, playbook, targets, and cronExpression are required' });
  }
  if (typeof name !== 'string' || !name.trim() || name.length > 100) return res.status(400).json({ error: 'Invalid name' });
  if (!isValidPlaybook(playbook)) return res.status(400).json({ error: 'Invalid playbook filename (must be letters/digits/_ - ending in .yml or .yaml)' });
  if (typeof cronExpression !== 'string' || cronExpression.length > 100) return res.status(400).json({ error: 'Invalid cronExpression' });
  const targetsErr = validateTargets(targets);
  if (targetsErr) return res.status(400).json({ error: targetsErr });
  const normalizedTargets = normalizeScheduleTargets(targets);
  if (!validExtraVars(extraVars)) return res.status(400).json({ error: 'extraVars must be a flat object (max 4KB)' });
  if (forks !== undefined && (!Number.isInteger(forks) || forks < 1 || forks > 50)) return res.status(400).json({ error: 'Parallel hosts must be an integer from 1 to 50.' });
  if (checkMode !== undefined && typeof checkMode !== 'boolean') return res.status(400).json({ error: 'checkMode must be boolean' });
  const scopeErr = validateScheduleScope(req, playbook, normalizedTargets, environmentId);
  if (scopeErr) return res.status(403).json({ error: scopeErr });
  if (db.schedules.getAll().length >= 100) {
    return res.status(400).json({ error: 'Maximum number of schedules (100) reached' });
  }
  try { validateExecutableSchedule(cronExpression, scheduler.getSchedulerTimezone()); }
  catch (error) { return res.status(400).json({ error: error.message }); }
  const id = db.db.transaction(() => {
    const createdId = db.schedules.create(name.trim(), playbook, normalizedTargets, cronExpression, {
      environmentId, extraVars: extraVars || {}, checkMode, forks,
    });
    db.auditLog.write('schedule.create', `Schedule "${name.trim()}" created (${playbook})`, req.ip, true, req.user?.username);
    return createdId;
  })();
  const registration_status = registerSavedSchedule(id);
  res.json({ id, status: 'created', registration_status });
});

// PUT /api/schedules/:id — update
router.put('/:id', requireScheduleCapability('canEditSchedules'), (req, res) => {
  const existing = db.schedules.getById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Schedule not found' });
  if (!canAccessSchedule(req, existing)) return res.status(403).json({ error: 'Schedule access denied' });

  const { name, playbook, targets, cronExpression, enabled, extraVars, checkMode, forks } = req.body;
  const fields = {};
  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim() || name.length > 100) return res.status(400).json({ error: 'Invalid name' });
    fields.name = name.trim();
  }
  if (playbook !== undefined) {
    if (!isValidPlaybook(playbook)) return res.status(400).json({ error: 'Invalid playbook filename (must be letters/digits/_ - ending in .yml or .yaml)' });
    fields.playbook = playbook;
  }
  if (targets !== undefined) {
    const targetsErr = validateTargets(targets);
    if (targetsErr) return res.status(400).json({ error: targetsErr });
    fields.targets = normalizeScheduleTargets(targets);
    if (!fields.targets) return res.status(400).json({ error: 'At least one target is required; select all explicitly to target every server' });
  }
  if (cronExpression !== undefined) {
    fields.cronExpression = cronExpression;
  }
  if (enabled !== undefined) {
    if (typeof enabled !== 'boolean') return res.status(400).json({ error: 'enabled must be a boolean' });
    fields.enabled = enabled ? 1 : 0;
  }
  if (extraVars !== undefined) {
    if (!validExtraVars(extraVars)) return res.status(400).json({ error: 'extraVars must be a flat object (max 4KB)' });
    fields.extraVars = extraVars;
  }
  if (checkMode !== undefined) {
    if (typeof checkMode !== 'boolean') return res.status(400).json({ error: 'checkMode must be boolean' });
    fields.checkMode = checkMode;
  }
  if (forks !== undefined) {
    if (!Number.isInteger(forks) || forks < 1 || forks > 50) return res.status(400).json({ error: 'Parallel hosts must be an integer from 1 to 50.' });
    fields.forks = forks;
  }

  if (Object.keys(fields).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const nextPlaybook = fields.playbook || existing.playbook;
  const nextTargets = fields.targets || existing.targets;
  const scopeErr = validateScheduleScope(req, nextPlaybook, nextTargets, existing.environment_id || 'default');
  if (scopeErr) return res.status(403).json({ error: scopeErr });

  if (cronExpression !== undefined || fields.enabled === 1) {
    try { validateExecutableSchedule(cronExpression ?? existing.cron_expression, scheduler.getSchedulerTimezone()); }
    catch (error) { return res.status(400).json({ error: error.message }); }
  }
  db.db.transaction(() => {
    db.schedules.update(req.params.id, fields);
    db.auditLog.write('schedule.update', `Schedule "${existing.name}" updated`, req.ip, true, req.user?.username);
  })();
  const registration_status = registerSavedSchedule(req.params.id);
  res.json({ status: 'updated', registration_status });
});

// POST /api/schedules/:id/toggle — toggle enabled
router.post('/:id/toggle', requireScheduleCapability('canToggleSchedules'), (req, res) => {
  const existing = db.schedules.getById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Schedule not found' });
  if (!canAccessSchedule(req, existing)) return res.status(403).json({ error: 'Schedule access denied' });

  const newEnabled = existing.enabled ? 0 : 1;
  if (newEnabled) {
    try { validateExecutableSchedule(existing.cron_expression, scheduler.getSchedulerTimezone()); }
    catch (error) { return res.status(400).json({ error: error.message }); }
  }
  db.db.transaction(() => {
    db.schedules.update(req.params.id, { enabled: newEnabled });
    db.auditLog.write('schedule.toggle', `Schedule "${existing.name}" ${newEnabled ? 'enabled' : 'disabled'}`, req.ip, true, req.user?.username);
  })();
  const registration_status = registerSavedSchedule(req.params.id);
  res.json({ enabled: !!newEnabled, registration_status });
});

// DELETE /api/schedules/:id
router.delete('/:id', requireScheduleCapability('canDeleteSchedules'), (req, res) => {
  const existing = db.schedules.getById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Schedule not found' });
  if (!canAccessSchedule(req, existing)) return res.status(403).json({ error: 'Schedule access denied' });

  db.db.transaction(() => {
    db.schedules.delete(req.params.id);
    db.auditLog.write('schedule.delete', `Schedule "${existing.name}" deleted`, req.ip, true, req.user?.username);
  })();
  scheduler.unregister(req.params.id);
  res.json({ status: 'deleted' });
});

module.exports = router;
