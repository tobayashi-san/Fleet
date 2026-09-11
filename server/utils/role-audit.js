'use strict';
const {getPermissions}=require('./permissions');
function roleSnapshot(role) {
  if (!role) return null;
  return {name:role.name, ...getPermissions({role:role.id})};
}
function roleAuditDetail(role, before, after) {
  const values = value => value === undefined ? 'Not present' : typeof value === 'boolean' ? (value ? 'Allowed' : 'Not allowed') : typeof value === 'string' ? value : JSON.stringify(value);
  const changes = [...new Set([...Object.keys(before || {}), ...Object.keys(after || {})])].filter(key => key !== 'canManageDeployments' && JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key])).map(key => ({
    label:key.replace(/^can/, '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase()),
    before:values(before?.[key]), after:values(after?.[key]),
  }));
  return JSON.stringify({kind:'role-change',version:1,resource:{id:role.id,name:role.name},changes});
}
module.exports={roleSnapshot,roleAuditDetail};
