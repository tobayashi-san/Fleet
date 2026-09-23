'use strict';
// Deployment-level policy. Unknown configured values fail closed.
function mfaPolicy() {
  const mode=String(process.env.FLEET_MFA_POLICY || 'optional').trim().toLowerCase();
  return ['optional','admins','all'].includes(mode) ? mode : 'all';
}
function requiresMfa(user) {
  const mode=mfaPolicy();
  return mode==='all' || (mode==='admins' && user.role==='admin');
}
function enrollmentOnly(user,payload) {
  return payload.mfa_enrollment===true || (requiresMfa(user) && !user.totp_enabled);
}
function enrollmentRoute(req) {
  if(!['/auth','/api/auth'].includes(req.baseUrl))return false;
  return (req.method==='GET' && req.path==='/totp/status')
    || (req.method==='POST' && ['/totp/setup','/totp/confirm','/logout'].includes(req.path));
}
function policyOverview(users) {
  const mode=mfaPolicy();
  const configured=String(process.env.FLEET_MFA_POLICY || 'optional').trim().toLowerCase();
  const active=users.filter(user=>!user.disabled);
  const required=active.filter(user=>requiresMfa(user));
  const missing=required.filter(user=>!user.totp_enabled);
  return {mode,configurationValid:['optional','admins','all'].includes(configured),managedBy:'server_environment',checkedAt:Date.now(),
    activeAccounts:active.length,disabledAccounts:users.length-active.length,requiredAccounts:required.length,
    enrolledRequiredAccounts:required.length-missing.length,optionalAccounts:active.length-required.length,
    needsEnrollment:missing.map(user=>({id:user.id,username:user.username,displayName:user.display_name || '',role:user.role}))};
}
module.exports={mfaPolicy,requiresMfa,enrollmentOnly,enrollmentRoute,policyOverview};
