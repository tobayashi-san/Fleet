'use strict';
const db = require('../db');
// Explicit allowlist: credentials, MFA secrets and session tokens never enter snapshots.
function snapshot(user) {
  if (!user) return {};
  const role = db.roles.getById(user.role);
  return {
    Username: user.username,
    'Display name': user.display_name || '',
    Email: user.email || '',
    Role: `${role?.name || user.role} (ID: ${user.role})`,
    'Account status': user.disabled ? 'Disabled' : 'Enabled',
    MFA: user.totp_enabled ? 'Enabled' : 'Disabled',
  };
}
function userAuditDetail(before, after, extra = []) {
  const previous = snapshot(before), next = snapshot(after);
  const user = after || before;
  const changes = [...new Set([...Object.keys(previous), ...Object.keys(next)])]
    .filter(key => previous[key] !== next[key])
    .map(label => ({label, before:previous[label] ?? 'Not present', after:next[label] ?? 'Not present'}));
  return JSON.stringify({kind:'user-change',version:1,resource:{id:String(user.id),name:user.username},changes:[...changes,...extra]});
}
module.exports = {userAuditDetail};
