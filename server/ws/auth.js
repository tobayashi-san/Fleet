const {requiresMfa,enrollmentOnly}=require('../utils/mfa-policy');
const {validSession,sessionKey,changes}=require('../utils/auth-sessions');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { getJwtSecret } = require('../utils/jwt-secret');

// Verifies a WebSocket connection token. Closes the socket and returns false
// on any failure. A token is only accepted when:
//   - it is a valid JWT signed with the server secret,
//   - it is NOT a 2FA-pending temp token (totp_pending must be falsy),
//   - it carries a userId that resolves to an existing user,
//   - the embedded token version (tv) matches the user's current token_version.
function verifyAndLoadUser(url) {
  const token = url.searchParams.get('token');
  if (!token) return null;
  const secret = getJwtSecret();
  let payload;
  try {
    payload = jwt.verify(token, secret);
  } catch {
    return null;
  }
  if (!payload || typeof payload !== 'object') return null;
  // Reject the short-lived 2FA-pending temp token issued by /auth/login.
  if (payload.totp_pending) return null;
  if (!payload.userId) return null;
  const user = db.users.getById(payload.userId);
  if (!user) return null;
  if (user.disabled) return null;
  if (payload.tv !== undefined && payload.tv !== (user.token_version || 0)) {
    return null;
  }
  if (!validSession(payload, token)) return null;
  if (enrollmentOnly(user,payload) || (requiresMfa(user) && payload.mfa!==true)) return null;
  return user;
}

function verifyWsAuth(ws, url, authorize = () => true) {
  if (db.users.count() === 0) { ws.close(4001, 'Setup required'); return false; }
  const user = verifyAndLoadUser(url);
  if (!user) { ws.close(4001, 'Unauthorized'); return false; }
  if (!authorize(user)) { ws.close(4003, 'Permission denied'); return false; }
  const payload=jwt.decode(url.searchParams.get('token'));
  const key=sessionKey(payload,url.searchParams.get('token'));
  const revoked=id=>{if(key===id)ws.close(4001,'Session revoked');};
  changes.on('revoked',revoked);
  const timer=setInterval(()=>{
    const current=verifyAndLoadUser(url);
    if(!current)ws.close(4001,'Session expired or revoked');
    else if(!authorize(current))ws.close(4003,'Permission revoked');
  },30000);
  timer.unref();
  if(typeof ws.once==='function')ws.once('close',()=>{clearInterval(timer);changes.off('revoked',revoked);});
  else {clearInterval(timer);changes.off('revoked',revoked);}
  return true;
}

function getWsUser(url) {
  return verifyAndLoadUser(url);
}

module.exports = { verifyWsAuth, getWsUser };
