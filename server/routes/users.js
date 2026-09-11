const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const {userAuditDetail}=require('../utils/user-audit');
const { adminOnly } = require('../middleware/auth');
const { serverError } = require('../utils/http-error');
const { normalizeUsername, validateUsername } = require('../utils/usernames');
const { normalizeEmail } = require('../utils/email');
const { roleRevision } = require('../utils/role-revision');
const { validSession } = require('../utils/auth-sessions');
function requireCurrentAdministrator(req) {
  const current=db.users.getById(req.user.id);
  if(!current || current.disabled || current.role!=='admin' || current.token_version!==req.user.token_version || (req.authPayload && !validSession(req.authPayload,req.headers.authorization?.slice(7)))) throw Object.assign(Error('Administrator authorization changed. Sign in again.'),{status:403});
}
function accountChange(req,change) {
  return db.db.transaction(()=>{
    requireCurrentAdministrator(req);
    const current=db.users.getById(req.params.id);
    if(!current)throw Object.assign(Error('User not found'),{status:404});
    return change(current);
  }).immediate();
}

function assignmentRole(role, reviewedRevision) {
  const current = typeof role === 'string' && db.roles.getById(role);
  if (!current) throw Object.assign(Error('Select a valid role explicitly.'), {status:400,field:'role'});
  if (typeof reviewedRevision !== 'string' || !reviewedRevision) throw Object.assign(Error('Reload roles and review the selected permissions before assigning access.'), {status:428,field:'role_revision'});
  if (reviewedRevision !== roleRevision(current)) throw Object.assign(Error('The selected role changed. Close this dialog and reopen it to review the latest permissions.'), {status:409,field:'role_revision'});
}
function userError(res,error,context) {
  if(error.status)return res.status(error.status).json({error:error.message,...(error.field?{field:error.field}:{})});
  if(error.message?.includes('UNIQUE'))return res.status(409).json({error:'Username already exists'});
  return serverError(res,error,context);
}


// GET /api/users – list all users (no password_hash)
router.get('/', adminOnly, (req, res) => {
  try {
    res.json(db.users.getAll());
  } catch (e) {
    serverError(res, e, 'list users');
  }
});

router.get('/mfa-policy',adminOnly,(req,res)=>{
  try {
    requireCurrentAdministrator(req);
    res.set('Cache-Control','no-store').json(require('../utils/mfa-policy').policyOverview(db.users.getAll()));
  } catch(error) { userError(res,error,'MFA policy overview'); }
});

// Invitation links are returned once; delivery is an explicit administrator action.
router.get('/invitations',adminOnly,(req,res)=>{
  const rows=db.db.prepare('SELECT * FROM user_invitations WHERE expires_at>? ORDER BY created_at DESC').all(Date.now());
  res.set('Cache-Control','no-store').json(rows.map(require('../services/user-invitations').publicInvitation));
});
router.post('/invitations',adminOnly,(req,res)=>{
  const {username,email,displayName,role,roleRevision:reviewedRevision}=req.body || {};
  const error=validateUsername(username);if(error)return res.status(400).json({error});
  const normalizedEmail=normalizeEmail(email);if(normalizedEmail?.error)return res.status(400).json({error:normalizedEmail.error});
  try{
    requireCurrentAdministrator(req);assignmentRole(role,reviewedRevision);
    const invitation=require('../services/user-invitations').createInvitation({username:normalizeUsername(username),email:normalizedEmail,displayName:typeof displayName==='string'?displayName.trim().slice(0,100):'',role,reviewedRevision,issuer:req.user},req);
    res.set('Cache-Control','no-store').status(201).json(invitation);
  }catch(error){userError(res,error,'create invitation');}
});
router.delete('/invitations/:id',adminOnly,(req,res)=>{
  try{
    db.db.transaction(()=>{
      requireCurrentAdministrator(req);
      const row=db.db.prepare('SELECT * FROM user_invitations WHERE id=?').get(req.params.id);
      if(!row)throw Object.assign(Error('Invitation not found'),{status:404});
      if(row.accepted_at)throw Object.assign(Error('Invitation was already accepted; manage the resulting user account instead.'),{status:409});
      if(!row.revoked_at){
        db.db.prepare('UPDATE user_invitations SET revoked_at=? WHERE id=?').run(Date.now(),row.id);
        db.auditLog.write('users.invitation.revoke',`Invitation ${row.id} revoked for ${row.username}`,req.ip,true,req.user.username);
      }
    }).immediate();
    res.json({success:true});
  }catch(error){userError(res,error,'revoke invitation');}
});

// POST /api/users – create user
router.post('/', adminOnly, async (req, res) => {
  const { username, displayName, email, password, role } = req.body;
  const usernameErr = validateUsername(username);
  if (usernameErr) return res.status(400).json({ error: usernameErr });
  const usernameNorm = normalizeUsername(username);
  if (!password || typeof password !== 'string' || password.length < 12) {
    return res.status(400).json({ error: 'Password must be at least 12 characters' });
  }
  const emailNorm = normalizeEmail(email);
  if (emailNorm && emailNorm.error) return res.status(400).json({ error: emailNorm.error });
  try {
    if (db.users.getByUsername(usernameNorm)) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    assignmentRole(role,req.body.roleRevision);
    const hash = await bcrypt.hash(password, 12);
    const displayNameNorm = (displayName && typeof displayName === 'string') ? displayName.trim().replace(/\s+/g, ' ').slice(0, 100) : '';
    const user = db.db.transaction(() => {
      requireCurrentAdministrator(req);
      assignmentRole(role,req.body.roleRevision);
      const created = db.users.create(usernameNorm,emailNorm || '',hash,role,displayNameNorm);
      db.auditLog.write('users.create', userAuditDetail(null,db.users.getById(created.id)),req.ip,true,req.user?.username);
      return created;
    }).immediate();
    res.status(201).json(user);
  } catch (e) { userError(res,e,'create user'); }
});

// PUT /api/users/:id – admin can update username/displayName/email/role
router.put('/:id', adminOnly, (req, res) => {
  const { id } = req.params;
  const { username, displayName, email, role } = req.body;
  const fields = {};
  if (username !== undefined) {
    const usernameErr = validateUsername(username);
    if (usernameErr) return res.status(400).json({ error: usernameErr });
    fields.username = normalizeUsername(username);
  }
  if (displayName !== undefined) {
    if (typeof displayName !== 'string') return res.status(400).json({ error: 'displayName must be a string' });
    fields.display_name = displayName.trim().replace(/\s+/g, ' ').slice(0, 100);
  }
  if (email !== undefined) {
    const emailNorm = normalizeEmail(email);
    if (emailNorm && emailNorm.error) return res.status(400).json({ error: emailNorm.error });
    fields.email = emailNorm || '';
  }
  if (role !== undefined) {
    const knownRoles = db.roles.getAll().map(r => r.id);
    if (role !== 'admin' && !knownRoles.includes(role)) return res.status(400).json({ error: 'Invalid role' });
    fields.role = role;
  }
  try {
    const user = db.db.transaction(() => {
      requireCurrentAdministrator(req);
      const existing = db.users.getById(id);
      if (!existing) throw Object.assign(Error('User not found'),{status:404});
      if (fields.username) {
        const duplicate = db.users.getByUsername(fields.username);
        if (duplicate && duplicate.id !== id) throw Object.assign(Error('Username already exists'),{status:409});
      }
      if (fields.role && existing.role !== fields.role) {
        if (req.user.id === id) throw Object.assign(Error('Cannot change your own role'),{status:400});
        if (req.body.expectedRole !== existing.role) throw Object.assign(Error('This user has a different role now. Close this dialog and reopen the user to review their current access.'),{status:409,field:'role_revision'});
        if (existing.role === 'admin' && fields.role !== 'admin' && db.users.countActiveAdmins() <= 1) throw Object.assign(Error('Cannot remove the last active administrator'),{status:409});
        assignmentRole(fields.role,req.body.roleRevision);
        db.users.incrementTokenVersion(id);
      }
      const updated = db.users.update(id,fields);
      db.auditLog.write('users.update',userAuditDetail(existing,db.users.getById(id)),req.ip,true,req.user?.username);
      return updated;
    }).immediate();
    res.json(user);
  } catch (e) { userError(res,e,'update user'); }

});

// PUT /api/users/:id/status – suspend or reactivate an account
router.put('/:id/status', adminOnly, (req,res)=>{
  const {id}=req.params;const {disabled}=req.body || {};
  if(typeof disabled!=='boolean')return res.status(400).json({error:'disabled must be a boolean'});
  try {
    const updated=accountChange(req,user=>{
      if(req.user.id===id && disabled)throw Object.assign(Error('Cannot disable your own account'),{status:400});
      if(disabled && user.role==='admin' && !user.disabled && db.users.countActiveAdmins()<=1)throw Object.assign(Error('Cannot disable the last active administrator'),{status:409});
      db.users.update(id,{disabled:disabled?1:0});
      db.users.incrementTokenVersion(id);
      db.auditLog.write(disabled?'users.disable':'users.enable',userAuditDetail(user,db.users.getById(id)),req.ip,true,req.user.username);
      return db.users.getById(id);
    });
    res.json(updated);
  }catch(error){userError(res,error,'update user status');}
});

router.post('/:id/revoke-sessions',adminOnly,(req,res)=>{
  try{
    accountChange(req,user=>{
      db.users.incrementTokenVersion(req.params.id);
      db.auditLog.write('users.sessions.revoke',userAuditDetail(user,db.users.getById(req.params.id),[{label:'Sessions',before:'Previous sessions',after:'Revoked'}]),req.ip,true,req.user.username);
    });
    res.json({success:true});
  }catch(error){userError(res,error,'revoke user sessions');}
});

router.put('/:id/password',adminOnly,async(req,res)=>{
  const {id}=req.params;const {password}=req.body || {};
  if(typeof password!=='string' || password.length<12)return res.status(400).json({error:'Password must be at least 12 characters'});
  const before=db.users.getById(id);
  if(!before)return res.status(404).json({error:'User not found'});
  try{
    const hash=await bcrypt.hash(password,12);
    accountChange(req,current=>{
      if(current.token_version!==before.token_version)throw Object.assign(Error('Account security changed while preparing the password. Review the account and retry.'),{status:409});
      db.users.setPasswordHash(id,hash);
      db.users.incrementTokenVersion(id);
      db.auditLog.write('users.password',userAuditDetail(current,db.users.getById(id),[{label:'Password',before:'Previous credential',after:'Replaced'},{label:'Sessions',before:'Previous sessions',after:'Revoked'}]),req.ip,true,req.user.username);
    });
    res.json({success:true});
  }catch(error){userError(res,error,'reset user password');}
});

router.put('/:id/totp-disable',adminOnly,(req,res)=>{
  try{
    accountChange(req,user=>{
      const {id}=req.params;
      db.users.setTotp(id,'',false);
      db.users.setPendingTotp(id,'');
      db.users.incrementTokenVersion(id);
      db.auditLog.write('users.totp.disable',userAuditDetail(user,db.users.getById(id)),req.ip,true,req.user.username);
    });
    res.json({success:true});
  }catch(error){userError(res,error,'admin disable user totp');}
});

router.delete('/:id',adminOnly,(req,res)=>{
  try{
    accountChange(req,user=>{
      const {id}=req.params;
      if(req.user.id===id)throw Object.assign(Error('Cannot delete your own account'),{status:400});
      if(user.role==='admin' && !user.disabled && db.users.countActiveAdmins()<=1)throw Object.assign(Error('Cannot delete the last active administrator'),{status:409});
      db.users.delete(id);
      db.auditLog.write('users.delete',userAuditDetail(user,null),req.ip,true,req.user.username);
    });
    res.json({success:true});
  }catch(error){userError(res,error,'delete user');}
});

module.exports=router;
