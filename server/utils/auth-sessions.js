'use strict';
const {randomUUID,createHash}=require('crypto');
const {EventEmitter}=require('events');
const db=require('../db');
const changes=new EventEmitter();changes.setMaxListeners(0);
function createSession(user,req){
 const now=Date.now();const id=randomUUID();
 db.db.prepare('DELETE FROM auth_sessions WHERE expires_at<=?').run(now);
 db.db.prepare('INSERT INTO auth_sessions (id,user_id,token_version,created_at,last_seen_at,expires_at,ip,user_agent) VALUES (?,?,?,?,?,?,?,?)')
  .run(id,user.id,user.token_version||0,now,now,now+8*3600000,String(req?.ip||'').slice(0,100),String(req?.headers?.['user-agent']||'').slice(0,512));
 return id;
}
function sessionKey(payload, token) {
 return payload.sid === undefined ? `legacy:${createHash('sha256').update(token).digest('hex')}` : payload.sid;
}
function validSession(payload, token){
 // Existing signed sessions retain their original lifetime during migration.
 if(payload.sid===undefined)return !db.db.prepare('SELECT id FROM auth_sessions WHERE id=? AND revoked_at IS NOT NULL').get(sessionKey(payload,token));
 if(typeof payload.sid!=='string')return false;
 const row=db.db.prepare('SELECT user_id,expires_at,revoked_at,last_seen_at FROM auth_sessions WHERE id=?').get(payload.sid);
 if(!row||row.user_id!==payload.userId||row.revoked_at||row.expires_at<=Date.now())return false;
 // Last-seen telemetry must not turn valid authentication into a write-lock error.
 const now = Date.now();
 if (row.last_seen_at < now - 60000) {
  try {
   db.db.prepare('UPDATE auth_sessions SET last_seen_at=? WHERE id=? AND last_seen_at<?').run(now,payload.sid,now-60000);
  } catch (error) {
   if (!['SQLITE_BUSY', 'SQLITE_LOCKED', 'SQLITE_BUSY_SNAPSHOT'].includes(error.code)) throw error;
  }
 }
 return true;
}
function revokeSession(userId,id){
 const result=db.db.transaction(()=>{
  const row=db.db.prepare('SELECT id FROM auth_sessions WHERE id=? AND user_id=?').get(id,userId);
  if(!row)return false;
  db.db.prepare('UPDATE auth_sessions SET revoked_at=COALESCE(revoked_at,?) WHERE id=?').run(Date.now(),id);
  const user=db.users.getById(userId);
  db.auditLog.write('auth.session_revoke',`session=${id}`,null,true,user?.username);
  return true;
 })();
 if(result)changes.emit('revoked',id);
 return result;
}
function revokeSignIn(user, payload, token) {
 if (payload.sid !== undefined) return revokeSession(user.id, payload.sid);
 const id = sessionKey(payload, token);
 const now = Date.now();
 db.db.transaction(() => {
  db.db.prepare('INSERT OR IGNORE INTO auth_sessions (id,user_id,token_version,created_at,last_seen_at,expires_at,revoked_at) VALUES (?,?,?,?,?,?,?)')
   .run(id,user.id,user.token_version||0,now,now,typeof payload.exp === 'number' ? payload.exp*1000 : Number.MAX_SAFE_INTEGER,now);
  db.auditLog.write('auth.session_revoke',`session=${id}`,null,true,user.username);
 })();
 changes.emit('revoked',id);
 return true;
}
module.exports={createSession,validSession,revokeSession,revokeSignIn,sessionKey,changes};
