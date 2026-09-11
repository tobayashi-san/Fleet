'use strict';

const db = require('../db');
const { matchesHistoryRange } = require('./history-date-range');
const { canAccessTargets, filterServers } = require('./permissions');

function auditRowVisibleToServers(row, permissions, environmentId = 'default') {
  if (!permissions) return false;
  if (permissions.full || permissions.servers === 'all') return true;

  // Deleted host records have no surviving host scope. A replacement with
  // the same name must not grant access to another host's historical event.
  if (['server.delete', 'server.deleted'].includes(row?.action)) return false;

  const servers = db.servers.getAll(environmentId);
  const visibleServers = filterServers(servers, permissions);
  if (!visibleServers.length) return false;
  const visibleIds = new Set(visibleServers.map(server => String(server.id)));
  const byId = new Map(servers.map(server => [String(server.id), server]));
  const byName = new Map(servers.map(server => [String(server.name), server]));
  const detail = String(row?.detail || '');
  if (['server.create', 'server.created'].includes(row?.action) && detail.includes('server_id=')) {
    const id = detail.match(/(?:^|\s)server_id="([^"\r\n]+)"(?:\s|$)/)?.[1];
    return Boolean(id && visibleIds.has(id));
  }

  if (row?.action === 'server.update' && detail.startsWith('{')) {
    try { const record = JSON.parse(detail); return record.kind === 'host-change' && record.version === 1 && visibleIds.has(record.resource?.id); } catch { return false; }
  }

  // Account, role and Git configuration records are not host-scoped. Never infer access from their text.
  if (/^(users|roles|git)\./.test(String(row?.action || ''))) return false;
  if (String(row?.action || '').startsWith('maintenance_window.')) {
    try {
      const record = JSON.parse(detail);
      const scope = record?.scope;
      return record?.kind === 'maintenance-change' && record.version === 1
        && scope?.environmentId === environmentId && scope.allHosts === false
        && Array.isArray(scope.hostIds) && scope.hostIds.length > 0
        && scope.hostIds.every(id => typeof id === 'string' && visibleIds.has(id));
    } catch { return false; }
  }

  // Terminal lifecycle events carry a stable ID plus a historical display name.
  // Authorize the ID so a rename does not hide an otherwise accessible event.
  if (['server.notes_update', 'terminal.connect', 'terminal.connect_failed', 'terminal.disconnect', 'custom_update.create', 'custom_update.update', 'custom_update.delete', 'custom_update.check', 'custom_update.preview'].includes(row?.action)) {
    const terminalHostId = detail.match(/(?:^|\s)server_id="([^"\r\n]+)"(?:\s|$)/)?.[1];
    return Boolean(terminalHostId && visibleIds.has(terminalHostId));
  }


  const targetExpression = detail.match(/(?:^|\s)targets=(.+?)(?=\s+(?:status|error|playbook|action)=|$)/)?.[1];
  if (targetExpression) return canAccessTargets(permissions, targetExpression, servers);

  const referencedIds = [];
  for (const match of detail.matchAll(/(?:^|\s)type=server\s+target=([^\s]+)/g)) referencedIds.push(match[1]);
  for (const match of detail.matchAll(/(?:^|\s)server=([^\s]+)/g)) {
    const server = byName.get(match[1]) || byId.get(match[1]);
    if (!server) return false;
    referencedIds.push(server.id);
  }
  for (const match of detail.matchAll(/\bServer "([^"]+)"/g)) {
    const server = byName.get(match[1]);
    if (!server) return false;
    referencedIds.push(server.id);
  }
  if (String(row?.action || '').startsWith('agent.')) {
    const named = detail.match(/\bon (.+?)(?: \(|$)/)?.[1];
    const server = named ? byName.get(named) : null;
    if (!server) return false;
    referencedIds.push(server.id);
  }

  return referencedIds.length > 0 && referencedIds.every(id => visibleIds.has(String(id)));
}

function filterAuditRows(rows, permissions, environmentId = 'default') {
  return (Array.isArray(rows) ? rows : []).filter(row => auditRowVisibleToServers(row, permissions, environmentId));
}

function queryVisibleAuditRows(filters, permissions) {
  const environmentId = filters.environmentId || 'default';
  const rows = [];
  let offset = 0;
  while (true) {
    const batch = db.auditLog.query({ ...filters, from: undefined, to: undefined, limit: 500, offset });
    rows.push(...filterAuditRows(batch, permissions, environmentId).filter(row => matchesHistoryRange(row.created_at, filters.from, filters.to)));
    if (batch.length < 500) break;
    offset += batch.length;
  }
  return rows;
}

const PRIMARY_CHANGE_PREFIXES = [
  'git.config_update', 'git.settings_update', 'git.disconnect', 'auth.', 'login.', 'users.', 'roles.', 'system.', 'environment.', 'reset.',
  'ssh.assignment.', 'ssh.import', 'ssh.export', 'maintenance_window.', 'schedule.', 'plugin.',
  'server.notes_update', 'server.create', 'server.created', 'server.update', 'server.delete',
  'server.deleted', 'server.hidden', 'server.visible', 'servers.group_',
  'opentofu.install', 'custom_update.create', 'custom_update.update', 'custom_update.delete',
];

function filterAuditFocus(rows, focus) {
  if (focus !== 'changes') return Array.isArray(rows) ? rows : [];
  return (Array.isArray(rows) ? rows : []).filter(row => {
    const action = String(row?.action || '').toLowerCase();
    return PRIMARY_CHANGE_PREFIXES.some(prefix => action.startsWith(prefix));
  });
}

module.exports = { auditRowVisibleToServers, filterAuditRows, filterAuditFocus, queryVisibleAuditRows };
