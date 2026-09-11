const express = require('express');
const { createHash } = require('crypto');
const { maintenanceOccurrences } = require('../utils/maintenance-recurrence');
const db = require('../db');
const {maintenanceAuditDetail}=require('../utils/maintenance-audit');
const { getPermissions, can, canAccessEnvironment, filterServers } = require('../utils/permissions');

const router = express.Router();
const guard = capability => (req, res, next) => can(getPermissions(req.user), capability) ? next() : res.status(403).json({ error: 'Permission denied' });

function hasWholeHostScope(permissions) { return permissions.full || permissions.servers === 'all'; }
function controlsWindow(row, permissions) {
  if (!can(permissions,'canEditMaintenance')) return false;
  if (hasWholeHostScope(permissions)) return true;
  const ids=JSON.parse(row.resource_ids || '[]');
  const visible=new Set(filterServers(db.servers.getAll(row.environment_id),permissions).map(server=>server.id));
  return ids.length>0 && ids.every(id=>visible.has(id));
}

function windowText(body, field, limit, fallback='') {
  if(body[field]===undefined)return fallback;
  if(typeof body[field]!=='string' || body[field].trim().length>limit)throw new Error(`${field} must be text with at most ${limit} characters.`);
  return body[field].trim();
}

function normalizeWindow(body = {}, req, environmentId) {
  if (body.resource_ids != null && (!Array.isArray(body.resource_ids) || body.resource_ids.some(id => typeof id !== "string"))) throw new Error("Resource IDs must be a list of host IDs.");
  const resourceIds = [...new Set(body.resource_ids || [])];
  if (body.resource_scope !== undefined) {
    if (!['selected', 'environment'].includes(body.resource_scope)) throw new Error('Resource scope must be selected or environment.');
    if (body.resource_scope === 'selected' && !resourceIds.length) throw new Error('Select at least one host or explicitly choose the entire environment.');
    if (body.resource_scope === 'environment' && resourceIds.length) throw new Error('Entire-environment scope cannot contain selected hosts.');
  }
  if (!resourceIds.length && !hasWholeHostScope(getPermissions(req.user))) throw new Error('Entire-environment maintenance requires access to all hosts. Select hosts within your access scope.');
  const visibleIds = new Set(filterServers(db.servers.getAll(environmentId), getPermissions(req.user)).map(server => server.id));
  if (resourceIds.length > 1000 || resourceIds.some(id => !visibleIds.has(id))) throw new Error("A selected host is unavailable in this environment or outside your access scope.");
  const name = windowText(body,'name',120);
  const startsAt = new Date(String(body.starts_at || ''));
  const endsAt = new Date(String(body.ends_at || ''));
  if (!name) throw new Error('A maintenance window name is required.');
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) throw new Error('Start and end must be valid dates.');
  if (endsAt <= startsAt) throw new Error('The end must be after the start.');
  if (endsAt.getTime() - startsAt.getTime() > 366 * 24 * 60 * 60 * 1000) throw new Error('A maintenance window cannot exceed one year.');
  const timezone = windowText(body,'timezone',80,'Europe/Zurich');
  try { new Intl.DateTimeFormat('en-GB', { timeZone: timezone }); }
  catch { throw new Error('Timezone must be a valid IANA timezone such as Europe/Zurich.'); }
  return {
    name,
    resource_ids: resourceIds,
    change_reference: windowText(body,'change_reference',200),
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    description: windowText(body,'description',1000),
    affected_resources: windowText(body,'affected_resources',1000),
    timezone,
    owner: windowText(body,'owner',120),
  };
}

function revisionFor(row) {
  return createHash('sha256').update(JSON.stringify(['id','environment_id','name','starts_at','ends_at','description','affected_resources','timezone','owner','resource_ids','change_reference','series_id','series_index','series_count','recurrence_frequency','cancelled_at','cancelled_by','cancellation_reason'].map(key => row[key] ?? null))).digest('hex');
}
function publicWindow(row) { return {...row, revision:revisionFor(row), resource_ids:JSON.parse(row.resource_ids || '[]'), state:stateFor(row)}; }

function stateFor(row, now = Date.now()) {
  if(row.cancelled_at)return 'cancelled';
  const start = new Date(row.starts_at).getTime();
  const end = new Date(row.ends_at).getTime();
  return now < start ? 'scheduled' : now < end ? 'active' : 'completed';
}

router.get('/', guard('canViewMaintenance'), (req, res) => {
  const environmentId = req.environmentId || String(req.query.environment_id || 'default').trim() || 'default';
  if (!canAccessEnvironment(getPermissions(req.user), environmentId)) return res.status(403).json({ error: 'Environment access denied.' });
  const rows = db.db.prepare('SELECT * FROM maintenance_windows WHERE environment_id = ? ORDER BY starts_at DESC').all(environmentId);
  res.json(rows.map(row=>({...publicWindow(row),can_edit:!row.cancelled_at && controlsWindow(row,getPermissions(req.user))})));
});

router.post('/preview', guard('canEditMaintenance'), (req, res) => {
  try {
    const environmentId = req.environmentId || String(req.body?.environment_id || 'default').trim() || 'default';
    const perms = getPermissions(req.user);
    if (!db.db.prepare('SELECT 1 FROM environments WHERE id = ?').get(environmentId)) return res.status(400).json({ error: 'Environment not found.' });
    if (!canAccessEnvironment(perms, environmentId)) return res.status(403).json({ error: 'Environment access denied.' });
    const value = normalizeWindow(req.body, req, environmentId);
    const occurrences = maintenanceOccurrences(value, req.body.recurrence);
    const conflictsChecked = can(perms, 'canViewMaintenance');
    const existing = conflictsChecked ? db.db.prepare('SELECT id,name,starts_at,ends_at,resource_ids FROM maintenance_windows WHERE environment_id=? AND cancelled_at IS NULL').all(environmentId) : [];
    res.json({ occurrences: occurrences.map((occurrence, index) => ({ ...occurrence, planned_conflicts: occurrences.flatMap((other, otherIndex) => otherIndex !== index && Date.parse(occurrence.starts_at) < Date.parse(other.ends_at) && Date.parse(occurrence.ends_at) > Date.parse(other.starts_at) ? [otherIndex + 1] : []), conflicts: existing.filter(row =>
      Date.parse(occurrence.starts_at) < Date.parse(row.ends_at) && Date.parse(occurrence.ends_at) > Date.parse(row.starts_at)
      && (!value.resource_ids.length || !JSON.parse(row.resource_ids || '[]').length || value.resource_ids.some(id => JSON.parse(row.resource_ids || '[]').includes(id)))
    ).map(row => ({id:row.id,name:row.name})) })), conflicts_checked: conflictsChecked });
  } catch (error) { res.status(400).json({ error: error.message || 'Could not preview maintenance.' }); }
});

router.post('/', guard('canEditMaintenance'), (req, res) => {
  try {
    const environmentId = req.environmentId || String(req.body?.environment_id || 'default').trim() || 'default';
    if (!db.db.prepare('SELECT 1 FROM environments WHERE id = ?').get(environmentId)) return res.status(400).json({ error: 'Environment not found.' });
    if (!canAccessEnvironment(getPermissions(req.user), environmentId)) return res.status(403).json({ error: 'Environment access denied.' });
    const value = normalizeWindow(req.body, req, environmentId);
    const occurrences = maintenanceOccurrences(value, req.body.recurrence);
    const seriesId = occurrences.length > 1 ? db.uuidv4() : null;
    const insert = db.db.prepare('INSERT INTO maintenance_windows (id, environment_id, name, starts_at, ends_at, description, affected_resources, timezone, owner, created_by, resource_ids, change_reference, series_id, series_index, series_count, recurrence_frequency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const rows = db.db.transaction(() => {
      const inserted = occurrences.map((occurrence,index) => {
      const id = db.uuidv4();
      const row = { ...value, ...occurrence };
      insert.run(id, environmentId, row.name, row.starts_at, row.ends_at, row.description, row.affected_resources, row.timezone, row.owner, req.user?.username || '', JSON.stringify(row.resource_ids), row.change_reference, seriesId, seriesId ? index+1 : null, seriesId ? occurrences.length : null, seriesId ? req.body.recurrence.frequency : null);
      return publicWindow(db.db.prepare('SELECT * FROM maintenance_windows WHERE id=?').get(id));
    });
      for (const occurrence of inserted) db.auditLog.write('maintenance_window.create', maintenanceAuditDetail(null,occurrence), req.ip, true, req.user?.username, environmentId);
      return inserted;
    }).immediate();
    res.status(201).json(rows.length === 1 ? rows[0] : { occurrences: rows });
  } catch (error) { res.status(400).json({ error: error.message || 'Could not create maintenance window.' }); }
});

router.put('/:id', guard('canEditMaintenance'), (req, res) => {
  const existing = db.db.prepare('SELECT * FROM maintenance_windows WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Maintenance window not found.' });
  if (req.environmentId && existing.environment_id !== req.environmentId) return res.status(404).json({ error: 'Maintenance window not found.' });
  if (!canAccessEnvironment(getPermissions(req.user), existing.environment_id)) return res.status(403).json({ error: 'Environment access denied.' });
  if (!controlsWindow(existing,getPermissions(req.user))) return res.status(403).json({error:'This maintenance window covers hosts outside your access scope.'});
  try {
    const value = normalizeWindow(req.body, req, existing.environment_id);
    const result = db.db.transaction(() => {
      const current = db.db.prepare('SELECT * FROM maintenance_windows WHERE id=?').get(existing.id);
      if (current?.cancelled_at) {const error=new Error('A cancelled maintenance window cannot be edited. Create a new window instead.');error.status=409;throw error;}
      if (!current || typeof req.body.revision !== 'string' || req.body.revision !== revisionFor(current)) {
        const error = new Error('This maintenance window changed or its version is missing. Your draft was not saved. Review the current version before applying your changes.'); error.status=409; throw error;
      }
      db.db.prepare('UPDATE maintenance_windows SET name = ?, starts_at = ?, ends_at = ?, description = ?, affected_resources = ?, timezone = ?, owner = ?, resource_ids = ?, change_reference = ? WHERE id = ?')
        .run(value.name, value.starts_at, value.ends_at, value.description, value.affected_resources, value.timezone, value.owner, JSON.stringify(value.resource_ids), value.change_reference, existing.id);
      db.auditLog.write('maintenance_window.update', maintenanceAuditDetail(current,db.db.prepare('SELECT * FROM maintenance_windows WHERE id=?').get(existing.id)), req.ip, true, req.user?.username, existing.environment_id);
      return publicWindow(db.db.prepare('SELECT * FROM maintenance_windows WHERE id=?').get(existing.id));
    }).immediate();
    res.json(result);
  } catch (error) { res.status(error.status || 400).json({ error: error.message || 'Could not update maintenance window.' }); }
});

router.post('/:id/cancel', guard('canEditMaintenance'), (req,res)=>{
  const existing=db.db.prepare('SELECT * FROM maintenance_windows WHERE id=?').get(req.params.id);
  if(!existing || (req.environmentId && existing.environment_id!==req.environmentId))return res.status(404).json({error:'Maintenance window not found.'});
  if(!canAccessEnvironment(getPermissions(req.user),existing.environment_id)||!controlsWindow(existing,getPermissions(req.user)))return res.status(403).json({error:'Maintenance scope access denied.'});
  try{
    const reason=windowText(req.body,'reason',500);
    if(!reason)throw new Error('A cancellation reason is required.');
    const result=db.db.transaction(()=>{
      const current=db.db.prepare('SELECT * FROM maintenance_windows WHERE id=?').get(existing.id);
      if(!current||typeof req.body.revision!=='string'||req.body.revision!==revisionFor(current)){const error=new Error('The window changed. Refresh and review it before cancelling.');error.status=409;throw error;}
      if(stateFor(current)==='completed'||current.cancelled_at){const error=new Error('Only scheduled or active maintenance can be cancelled.');error.status=409;throw error;}
      db.db.prepare('UPDATE maintenance_windows SET cancelled_at=?,cancelled_by=?,cancellation_reason=? WHERE id=?').run(new Date().toISOString(),req.user?.username||'',reason,current.id);
      db.auditLog.write('maintenance_window.cancel',maintenanceAuditDetail(current,db.db.prepare('SELECT * FROM maintenance_windows WHERE id=?').get(current.id)),req.ip,true,req.user?.username,current.environment_id);
      return publicWindow(db.db.prepare('SELECT * FROM maintenance_windows WHERE id=?').get(current.id));
    }).immediate();res.json(result);
  }catch(error){res.status(error.status||400).json({error:error.message||'Could not cancel maintenance.'});}
});

router.delete('/:id', guard('canEditMaintenance'), (req, res) => {
  const existing = db.db.prepare('SELECT * FROM maintenance_windows WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Maintenance window not found.' });
  if (req.environmentId && existing.environment_id !== req.environmentId) return res.status(404).json({ error: 'Maintenance window not found.' });
  if (!canAccessEnvironment(getPermissions(req.user), existing.environment_id)) return res.status(403).json({ error: 'Environment access denied.' });
  if (!controlsWindow(existing,getPermissions(req.user))) return res.status(403).json({error:'This maintenance window covers hosts outside your access scope.'});
  try {
    db.db.transaction(()=>{
      const current=db.db.prepare('SELECT * FROM maintenance_windows WHERE id=?').get(existing.id);
      if(!current || typeof req.body?.revision!=='string' || req.body.revision!==revisionFor(current)) {const error=new Error('This maintenance window changed or its version is missing. Refresh and review it before deleting.');error.status=409;throw error;}
      db.db.prepare('DELETE FROM maintenance_windows WHERE id = ?').run(existing.id);
      db.auditLog.write('maintenance_window.delete', maintenanceAuditDetail(current,null), req.ip, true, req.user?.username, existing.environment_id);
    }).immediate();
    res.status(204).end();
  } catch(error){res.status(error.status||400).json({error:error.message||'Could not delete maintenance window.'});}
});

module.exports = router;
