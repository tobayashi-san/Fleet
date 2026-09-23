const express = require('express');
const router = express.Router();
const db = require('../db');
const { getPermissions, can, canAccessEnvironment } = require('../utils/permissions');
const { serverError } = require('../utils/http-error');
const { parseVariableValue, VALUE_TYPES } = require('../utils/variable-value');
const cryptoUtil = require('../utils/crypto');

const MAX_KEY_LEN = 100;
const MAX_VAL_LEN = 10000;
const MAX_VARS    = 500;

function requestedEnvironment(req) {
  return req.environmentId || String(req.body?.environment_id || req.query?.environment_id || 'default').trim() || 'default';
}

function ensureEnvironmentAccess(req, res, environmentId) {
  if (req.environmentId && environmentId !== req.environmentId) {
    res.status(404).json({ error: 'Variable not found' });
    return false;
  }
  if (!db.db.prepare('SELECT 1 FROM environments WHERE id = ?').get(environmentId)) {
    res.status(400).json({ error: 'Environment not found' });
    return false;
  }
  if (!canAccessEnvironment(getPermissions(req.user), environmentId)) {
    res.status(403).json({ error: 'Environment access denied' });
    return false;
  }
  return true;
}

function validateKey(key) {
  if (!key || typeof key !== 'string') return 'Key required';
  if (key.length > MAX_KEY_LEN) return 'Key too long (max 100 chars)';
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) return 'Key must start with a letter or underscore and contain only letters, numbers, and underscores';
  return null;
}

function recordChange(req, variable, action, fields) {
  db.db.prepare('INSERT INTO variable_change_events (environment_id, variable_id, variable_key, action, fields, actor) VALUES (?, ?, ?, ?, ?, ?)').run(variable.environment_id || 'default', variable.id, variable.key, action, JSON.stringify(fields), req.user?.username || null);
  db.db.prepare('DELETE FROM variable_change_events WHERE environment_id = ? AND id NOT IN (SELECT id FROM variable_change_events WHERE environment_id = ? ORDER BY id DESC LIMIT 1000)').run(variable.environment_id || 'default', variable.environment_id || 'default');
}

router.get('/history', (req, res) => {
  if (!can(getPermissions(req.user), 'canViewVars')) return res.status(403).json({ error: 'Permission denied' });
  const environmentId = requestedEnvironment(req);
  if (!ensureEnvironmentAccess(req, res, environmentId)) return;
  const page = Math.min(1000, Math.max(1, parseInt(req.query.page, 10) || 1));
  const total = db.db.prepare('SELECT COUNT(*) AS n FROM variable_change_events WHERE environment_id = ?').get(environmentId).n;
  const items = db.db.prepare('SELECT * FROM variable_change_events WHERE environment_id = ? ORDER BY id DESC LIMIT 25 OFFSET ?').all(environmentId, (page - 1) * 25).map(row => ({ ...row, fields: JSON.parse(row.fields) }));
  res.json({ items, total, page });
});

// GET /api/ansible-vars
router.get('/', (req, res, next) => { if (!can(getPermissions(req.user), 'canViewVars')) return res.status(403).json({ error: 'Permission denied' }); next(); }, (req, res) => {
  const environmentId = requestedEnvironment(req);
  if (!ensureEnvironmentAccess(req, res, environmentId)) return;
  res.json(db.ansibleVars.getAll(environmentId));
});

// POST /api/ansible-vars
router.post('/', (req, res, next) => { if (!can(getPermissions(req.user), 'canAddVars')) return res.status(403).json({ error: 'Permission denied' }); next(); }, (req, res) => {
  const { key, value, description, is_secret, rotation_due, value_type } = req.body;
  if (rotation_due !== undefined && rotation_due !== null && rotation_due !== '' && (typeof rotation_due !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(rotation_due) || !Number.isFinite(Date.parse(rotation_due)) || new Date(rotation_due).toISOString().slice(0, 10) !== rotation_due)) return res.status(400).json({ error: 'Rotation due must be a valid date (YYYY-MM-DD).' });
  if (is_secret !== undefined && typeof is_secret !== 'boolean') return res.status(400).json({ error: 'is_secret must be a boolean' });
  const environmentId = requestedEnvironment(req);
  if (!ensureEnvironmentAccess(req, res, environmentId)) return;
  if (is_secret === true && !cryptoUtil.isEncryptionAvailable()) return res.status(503).json({ error: 'FLEET_KEY_SECRET is required before storing secret variables' });
  const err = validateKey(key);
  if (err) return res.status(400).json({ error: err });
  if (!value || typeof value !== 'string') return res.status(400).json({ error: 'Value required' });
  if (value.length > MAX_VAL_LEN) return res.status(400).json({ error: 'Value too long' });
  const valueType = value_type === undefined ? 'string' : value_type;
  if (!VALUE_TYPES.has(valueType) || (is_secret === true && valueType !== 'string')) return res.status(400).json({ error: 'Choose a supported type. Secret values use text.' });
  try { parseVariableValue(value, valueType); } catch (error) { return res.status(400).json({ error: error.message }); }
  if (db.ansibleVars.getAll(environmentId).length >= MAX_VARS) return res.status(400).json({ error: 'Variable limit reached' });
  try {
    const created = db.db.transaction(() => {
      const variable = db.ansibleVars.create(key.trim(), value, description || '', { environmentId, isSecret: is_secret === true, rotationDue: rotation_due, valueType });
      recordChange(req, variable, 'Created', ['Key', 'Value supplied', 'Secret status', 'Description', ...(rotation_due ? ['Rotation due'] : [])]);
      return variable;
    })();
    res.status(201).json(created);
  } catch (e) {
    if (e.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Variable key already exists' });
    serverError(res, e, 'create ansible var');
  }
});

// PUT /api/ansible-vars/:id
router.put('/:id', (req, res, next) => { if (!can(getPermissions(req.user), 'canEditVars')) return res.status(403).json({ error: 'Permission denied' }); next(); }, (req, res) => {
  const { key, value, description, is_secret, rotation_due, value_type } = req.body;
  if (rotation_due !== undefined && rotation_due !== null && rotation_due !== '' && (typeof rotation_due !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(rotation_due) || !Number.isFinite(Date.parse(rotation_due)) || new Date(rotation_due).toISOString().slice(0, 10) !== rotation_due)) return res.status(400).json({ error: 'Rotation due must be a valid date (YYYY-MM-DD).' });
  if (is_secret !== undefined && typeof is_secret !== 'boolean') return res.status(400).json({ error: 'is_secret must be a boolean' });
  const existing = db.ansibleVars.getById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Variable not found' });
  if (!ensureEnvironmentAccess(req, res, existing.environment_id || 'default')) return;
  if (is_secret === true && !cryptoUtil.isEncryptionAvailable()) return res.status(503).json({ error: 'FLEET_KEY_SECRET is required before storing secret variables' });
  const err = validateKey(key);
  if (err) return res.status(400).json({ error: err });
  const keepValue = is_secret === true && (value === undefined || value === '');
  if (!keepValue && (!value || typeof value !== 'string')) return res.status(400).json({ error: 'Value required' });
  if (!keepValue && value.length > MAX_VAL_LEN) return res.status(400).json({ error: 'Value too long' });
  const valueType = value_type === undefined ? existing.value_type || 'string' : value_type;
  if (!VALUE_TYPES.has(valueType) || (is_secret === true && valueType !== 'string')) return res.status(400).json({ error: 'Choose a supported type. Secret values use text.' });
  if (!keepValue) { try { parseVariableValue(value, valueType); } catch (error) { return res.status(400).json({ error: error.message }); } }

  try {
    const updated = db.db.transaction(() => {
      const variable = db.ansibleVars.update(req.params.id, key.trim(), value || '', description || '', { keepValue, isSecret: is_secret === true, rotationDue: rotation_due, valueType });
      const fields = [(existing.value_type || 'string') !== valueType && 'Type', rotation_due !== undefined && (existing.rotation_due || '') !== (rotation_due || '') && 'Rotation due', existing.key !== key.trim() && 'Key', !keepValue && 'Value supplied', Boolean(existing.is_secret) !== (is_secret === true) && 'Secret status', (existing.description || '') !== (description || '') && 'Description'].filter(Boolean);
      if (fields.length) recordChange(req, variable, 'Updated', fields);
      return variable;
    })();
    res.json(updated);
  } catch (e) {
    if (e.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Variable key already exists' });
    serverError(res, e, 'update ansible var');
  }
});

// DELETE /api/ansible-vars/:id
router.delete('/:id', (req, res, next) => { if (!can(getPermissions(req.user), 'canDeleteVars')) return res.status(403).json({ error: 'Permission denied' }); next(); }, (req, res) => {
  const existing = db.ansibleVars.getById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Variable not found' });
  if (!ensureEnvironmentAccess(req, res, existing.environment_id || 'default')) return;
  db.db.transaction(() => { recordChange(req, existing, 'Deleted', []); db.ansibleVars.delete(req.params.id); })();
  res.json({ success: true });
});

module.exports = router;
