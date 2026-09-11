'use strict';
const db = require('../db');
function snapshot(row) {
  if (!row) return {};
  const ids = Array.isArray(row.resource_ids) ? row.resource_ids : JSON.parse(row.resource_ids || '[]');
  const hosts = new Map(db.servers.getAll(row.environment_id).map(host => [String(host.id),host.name]));
  return {
    Name:row.name, Environment:row.environment_id,
    'Start (UTC)':row.starts_at, 'End (UTC)':row.ends_at, Timezone:row.timezone,
    Owner:row.owner || '', 'Change reference':row.change_reference || '',
    Resources:ids.length ? ids.map(id => `${hosts.get(String(id)) || 'Name unavailable'} (ID: ${id})`).join(', ') : 'Entire environment',
    Description:row.description || '', Impact:row.affected_resources || '',
    'Series ID':row.series_id || 'None', 'Series occurrence':row.series_index == null ? 'None' : `${row.series_index} of ${row.series_count}`,
    'Recurrence frequency':row.recurrence_frequency || 'None',
    'Cancelled at (UTC)':row.cancelled_at || 'Not cancelled', 'Cancelled by':row.cancelled_by || '', 'Cancellation reason':row.cancellation_reason || '',
  };
}
function maintenanceAuditDetail(before,after) {
  const old=snapshot(before), next=snapshot(after), row=after || before;
  const changes=[...new Set([...Object.keys(old),...Object.keys(next)])].filter(key=>old[key]!==next[key]).map(label=>({label,before:old[label] ?? 'Not present',after:next[label] ?? 'Not present'}));
  const selections=[before,after].filter(Boolean).map(item=>Array.isArray(item.resource_ids)?item.resource_ids:JSON.parse(item.resource_ids || '[]'));
  const scope={environmentId:row.environment_id,allHosts:selections.some(ids=>ids.length===0),hostIds:[...new Set(selections.flat().map(String))]};
  return JSON.stringify({kind:'maintenance-change',version:1,resource:{id:row.id,name:row.name},scope,changes});
}
module.exports={maintenanceAuditDetail};
