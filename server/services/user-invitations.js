'use strict';
const crypto=require('node:crypto');
const bcrypt=require('bcryptjs');
const db=require('../db');
const {roleRevision}=require('../utils/role-revision');
const {userAuditDetail}=require('../utils/user-audit');
const fail=(message,status=400)=>Object.assign(Error(message),{status});
const digest=token=>crypto.createHash('sha256').update(token).digest('hex');
function invitationProblem(row){
 if(row.accepted_at)return 'accepted';
 if(row.revoked_at)return 'revoked';
 if(row.expires_at<=Date.now())return 'expired';
 const issuer=db.users.getById(row.issuer_id),role=db.roles.getById(row.role);
 if(!issuer||issuer.disabled||issuer.role!=='admin'||(issuer.token_version||0)!==row.issuer_token_version)return 'issuer_changed';
 if(!role||roleRevision(role)!==row.role_revision)return 'role_changed';
 if(db.users.getByUsername(row.username))return 'username_unavailable';
 return null;
}
function publicInvitation(row){
 const problem=invitationProblem(row);
 return {status:problem ? (['accepted','revoked','expired'].includes(problem) ? problem : 'invalid') : 'pending', invalidReason:problem && !['accepted','revoked','expired'].includes(problem) ? problem : null,id:row.id,username:row.username,email:row.email,displayName:row.display_name,role:row.role,expiresAt:row.expires_at,acceptedAt:row.accepted_at,revokedAt:row.revoked_at,createdAt:row.created_at};
}
function createInvitation({username,email,displayName,role,reviewedRevision,issuer},req){
 const token=crypto.randomBytes(32).toString('base64url'),id=crypto.randomUUID();
 return db.db.transaction(()=>{
  if(db.users.getByUsername(username))throw fail('Username already exists',409);
  if(db.db.prepare('SELECT 1 FROM user_invitations WHERE username=? AND expires_at>? AND accepted_at IS NULL AND revoked_at IS NULL').get(username,Date.now()))throw fail('An active invitation already exists for this username. Revoke it before creating another.',409);
  if(db.db.prepare('SELECT COUNT(*) n FROM user_invitations WHERE expires_at>? AND accepted_at IS NULL AND revoked_at IS NULL').get(Date.now()).n>=1000)throw fail('Too many active invitations',409);
  db.db.prepare('INSERT INTO user_invitations (id,token_hash,username,email,display_name,role,role_revision,issuer_id,issuer_token_version,expires_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run(id,digest(token),username,email||'',displayName||'',role,reviewedRevision,issuer.id,issuer.token_version||0,Date.now()+24*60*60*1000);
  db.auditLog.write('users.invitation.create',`Invitation ${id} created for ${username}; role=${role}; expires in 24 hours`,req.ip,true,issuer.username);
  return {...publicInvitation(db.db.prepare('SELECT * FROM user_invitations WHERE id=?').get(id)),token};
 }).immediate();
}
function validInvitation(token){
 if(typeof token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(token))throw fail('Invitation is invalid or no longer available',410);
 const row=db.db.prepare('SELECT * FROM user_invitations WHERE token_hash=?').get(digest(token));
 const problem=row ? invitationProblem(row) : 'missing';
 if(['missing','accepted','revoked','expired'].includes(problem))throw fail('Invitation is invalid or no longer available',410);
 if(problem==='username_unavailable')throw fail('Username is no longer available. Ask an administrator for a new invitation.',409);
 if(problem)throw fail('Invitation access changed. Ask an administrator for a new invitation.',409);
 return row;
}
async function acceptInvitation(token,password,req){
 if(typeof password!=='string'||password.length<12||Buffer.byteLength(password)>72)throw fail('Password must contain at least 12 characters and at most 72 UTF-8 bytes');
 validInvitation(token);
 const hash=await bcrypt.hash(password,12);
 return db.db.transaction(()=>{
  const row=validInvitation(token);
  const user=db.users.create(row.username,row.email,hash,row.role,row.display_name);
  db.db.prepare('UPDATE user_invitations SET accepted_at=? WHERE id=?').run(Date.now(),row.id);
  db.auditLog.write('users.invitation.accept',userAuditDetail(null,db.users.getById(user.id)),req.ip,true,row.username);
  return {username:row.username};
 }).immediate();
}
function previewInvitation(token){
 const row=validInvitation(token);
 return {username:row.username,displayName:row.display_name,roleName:db.roles.getById(row.role).name,expiresAt:row.expires_at};
}
module.exports={createInvitation,acceptInvitation,publicInvitation,previewInvitation};
