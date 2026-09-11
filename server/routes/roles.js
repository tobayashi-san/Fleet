const express    = require('express');
const router     = express.Router();
const {roleRevision: revision} = require('../utils/role-revision');
const db         = require('../db');
const {roleSnapshot,roleAuditDetail}=require('../utils/role-audit');
const { adminOnly } = require('../middleware/auth');
const { ALLOWED_PERMISSION_KEYS, getPermissions } = require('../utils/permissions');
const { serverError } = require('../utils/http-error');

function parse(role) {
  try { return { ...role, revision: revision(role), permissions: JSON.parse(role.permissions || '{}'), effectivePermissions: getPermissions({ role: role.id }) }; }
  catch { return { ...role, revision: revision(role), permissions: {}, effectivePermissions: getPermissions({ role: role.id }) }; }
}

// Strip unknown keys and enforce correct types to prevent privilege escalation
function sanitizePermissions(perms) {
  if (!perms || typeof perms !== 'object' || Array.isArray(perms)) return {};
  const clean = {};
  for (const [k, v] of Object.entries(perms)) {
    if (k === 'servers') {
      // Accept 'all' or { groups: [...], servers: [...] }
      if (v === 'all') { clean[k] = v; }
      else if (v && typeof v === 'object' && !Array.isArray(v)) {
        clean[k] = { groups: Array.isArray(v.groups) ? v.groups.filter(g => typeof g === 'string') : [],
                     servers: Array.isArray(v.servers) ? v.servers.filter(s => typeof s === 'string') : [] };
      }
    } else if (k === 'playbooks' || k === 'plugins') {
      // Accept 'all' or string array
      if (v === 'all') { clean[k] = v; }
      else if (Array.isArray(v)) { clean[k] = v.filter(s => typeof s === 'string'); }
    } else if (ALLOWED_PERMISSION_KEYS.has(k)) {
      clean[k] = !!v; // boolean only
    }
    // Unknown keys like 'full' are silently dropped
  }
  return clean;
}

// GET /api/roles
router.get('/', adminOnly, (req, res) => {
  try { res.json(db.roles.getAll().map(parse)); }
  catch (e) { serverError(res, e, 'list roles'); }
});

// POST /api/roles
router.post('/', adminOnly, (req, res) => {
  const { name, permissions } = req.body;
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'name required' });
  try {
    const role = db.db.transaction(() => {
      const created = db.roles.create(name.trim(), sanitizePermissions(permissions));
      db.auditLog.write('roles.create', roleAuditDetail(created,null,roleSnapshot(created)), req.ip, true, req.user?.username);
      return created;
    }).immediate();
    res.status(201).json(parse(role));
  } catch (e) {
    if (e.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Role name already exists' });
    serverError(res, e, 'create role');
  }
});

function currentEditableRole(req) {
  const role = db.roles.getById(req.params.id);
  if (!role) throw Object.assign(Error('Role not found'), {status:404});
  if (role.is_system) throw Object.assign(Error('Cannot change built-in roles'), {status:400});
  if (typeof req.body?.revision !== 'string' || !req.body.revision) throw Object.assign(Error('Reload roles before changing or deleting this role.'), {status:428,field:'revision'});
  if (req.body.revision !== revision(role)) throw Object.assign(Error('This role changed since you opened it. Close this dialog and reopen the latest role before reviewing your changes again.'), {status:409,field:'revision'});
  return role;
}
function roleError(res,error,context) {
  if (error.status) return res.status(error.status).json({error:error.message,...(error.field?{field:error.field}:{})});
  if (error.message?.includes('UNIQUE')) return res.status(409).json({error:'Role name already exists'});
  return serverError(res,error,context);
}

// Check the reviewed revision and mutate under the same write transaction.
router.put('/:id', adminOnly, (req, res) => {
  const {name,permissions} = req.body || {};
  if (typeof name !== 'string' || !name.trim()) return res.status(400).json({error:'name required'});
  try {
    const updated = db.db.transaction(() => {
      const previous = currentEditableRole(req);
      const before = roleSnapshot(previous);
      const role = db.roles.update(req.params.id,name.trim(),sanitizePermissions(permissions));
      db.auditLog.write('roles.update',roleAuditDetail(role,before,roleSnapshot(role)),req.ip,true,req.user?.username);
      return parse(role);
    }).immediate();
    res.json(updated);
  } catch(error) { roleError(res,error,'update role'); }
});

router.delete('/:id', adminOnly, (req, res) => {
  try {
    db.db.transaction(() => {
      const previous = currentEditableRole(req);
      const before = roleSnapshot(previous);
      const inUse = db.users.getAll().filter(user=>user.role===req.params.id).length;
      if(inUse)throw Object.assign(Error(`Role assigned to ${inUse} user(s). Reassign them first.`),{status:400});
      db.roles.delete(req.params.id);
      db.auditLog.write('roles.delete',roleAuditDetail(previous,before,null),req.ip,true,req.user?.username);
    }).immediate();
    res.json({success:true});
  } catch(error) { roleError(res,error,'delete role'); }
});

module.exports = router;
