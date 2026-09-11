'use strict';
const fields = { name: 'Name', hostname: 'Hostname', ip_address: 'IP address', ssh_port: 'SSH port', ssh_user: 'SSH user', owner: 'Owner / team', tags: 'Tags', services: 'Services', links: 'Links', storage_mounts: 'Storage mounts', docker_enabled: 'Docker enabled', environment_id: 'Environment', group_id: 'Group ID' };
function hostAuditDetail(before, after) {
  const value = (key, row) => {
    if (key === 'docker_enabled') return row[key] ? 'Enabled' : 'Disabled';
    return row[key] == null ? '' : String(row[key]);
  };
  const changes = Object.entries(fields).flatMap(([key, label]) => value(key, before) === value(key, after) ? [] : [{ label, before: value(key, before), after: value(key, after) }]);
  return JSON.stringify({ kind: 'host-change', version: 1, resource: { id: after.id, name: after.name }, changes });
}
module.exports = { hostAuditDetail };
