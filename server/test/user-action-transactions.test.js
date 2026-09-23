'use strict';
const {test,after}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'fleet-account-actions-'));process.env.DB_PATH=path.join(root,'test.db');process.env.NODE_ENV='test';process.env.FLEET_KEY_SECRET='synthetic-key';
const db=require('../db');const bcrypt=require('bcryptjs');const express=require('express');const request=require('supertest');const {createSession}=require('../utils/auth-sessions');const {roleRevision}=require('../utils/role-revision');
const actor=db.users.create('administrator',null,'synthetic-admin-hash','admin');
const app=express();app.use(express.json());app.use((req,_res,next)=>{req.user=db.users.getById(actor.id);next();});app.use('/users',require('../routes/users'));
const originalHash=bcrypt.hash;bcrypt.hash=async()=> 'synthetic-new-hash';
after(()=>{bcrypt.hash=originalHash;db.db.close();fs.rmSync(root,{recursive:true,force:true});});
const row=id=>db.db.prepare('SELECT * FROM users WHERE id=?').get(id);
test('account mutations and session cascades roll back when audit fails and can be retried',async()=>{
 const target=db.users.create('target',null,'synthetic-original-hash','user');db.users.setTotp(target.id,'synthetic-totp',true);db.users.setPendingTotp(target.id,'synthetic-pending');createSession(target);
 const actions=[['put','/status',{disabled:true}],['put','/status',{disabled:false}],['post','/revoke-sessions',{}],['put','/password',{password:'Synthetic-reset-password'}],['put','/totp-disable',{}],['delete','',{}]];
 for(const [method,suffix,body] of actions){
  const before=row(target.id);const sessions=db.db.prepare('SELECT * FROM auth_sessions ORDER BY id').all();const count=db.db.prepare('SELECT COUNT(*) n FROM audit_log').get().n;
  db.db.exec("CREATE TRIGGER fail_audit BEFORE INSERT ON audit_log BEGIN SELECT RAISE(ABORT,'synthetic audit failure'); END");
  try{
   assert.equal((await request(app)[method](`/users/${target.id}${suffix}`).send(body)).status,500);
   assert.deepEqual(row(target.id),before);assert.deepEqual(db.db.prepare('SELECT * FROM auth_sessions ORDER BY id').all(),sessions);assert.equal(db.db.prepare('SELECT COUNT(*) n FROM audit_log').get().n,count);
  }finally{db.db.exec('DROP TRIGGER fail_audit');}
  assert.equal((await request(app)[method](`/users/${target.id}${suffix}`).send(body)).status,200);
  assert.equal(db.db.prepare('SELECT COUNT(*) n FROM audit_log').get().n,count+1);
 }
 assert.equal(row(target.id),undefined);assert.equal(db.db.prepare('SELECT COUNT(*) n FROM auth_sessions').get().n,0);
});
test('administrator suspension during hashing blocks password reset and account creation',async()=>{
 const target=db.users.create('race-target',null,'original','user');const before=row(target.id);const hash=bcrypt.hash;
 for(const action of ['password','create']){
  bcrypt.hash=async()=>{db.users.update(actor.id,{disabled:1});return 'must-not-save';};
  try{
   const result=action==='password'?await request(app).put(`/users/${target.id}/password`).send({password:'Synthetic-password'}):await request(app).post('/users').send({username:'must-not-exist',password:'Synthetic-password',role:'user',roleRevision:roleRevision(db.roles.getById('user'))});
   assert.equal(result.status,403);assert.deepEqual(row(target.id),before);assert.equal(db.users.getByUsername('must-not-exist'),undefined);
  }finally{bcrypt.hash=hash;db.users.update(actor.id,{disabled:0});}
 }
});
test('concurrent target security change or deletion is not overwritten by a pending password reset',async()=>{
 const target=db.users.getByUsername('race-target');const hash=bcrypt.hash;
 bcrypt.hash=async()=>{db.users.incrementTokenVersion(target.id);return 'must-not-save';};
 try{
  assert.equal((await request(app).put(`/users/${target.id}/password`).send({password:'Synthetic-password'})).status,409);assert.equal(row(target.id).password_hash,'original');
 }finally{bcrypt.hash=hash;}
 bcrypt.hash=async()=>{db.users.delete(target.id);return 'must-not-save';};
 try{assert.equal((await request(app).put(`/users/${target.id}/password`).send({password:'Synthetic-password'})).status,404);}finally{bcrypt.hash=hash;}
});
test('account audit captures historical changes without credential material',async()=>{
 const created=await request(app).post('/users').send({username:'audit-user',displayName:'Audit User',email:'audit@example.test',password:'Never-log-this-password',role:'user',roleRevision:roleRevision(db.roles.getById('user'))});
 assert.equal(created.status,201);const id=created.body.id;
 const read=()=>JSON.parse(db.db.prepare('SELECT detail FROM audit_log ORDER BY rowid DESC LIMIT 1').get().detail);
 assert.equal(read().kind,'user-change');assert.equal(read().resource.name,'audit-user');
 const role=db.roles.create('Audit destination',{canViewServers:true});
 assert.equal((await request(app).put(`/users/${id}`).send({username:'renamed-user',role:role.id,expectedRole:'user',roleRevision:roleRevision(role)})).status,200);
 assert.ok(read().changes.some(c=>c.label==='Username'&&c.before==='audit-user'&&c.after==='renamed-user'));
 assert.ok(read().changes.some(c=>c.label==='Role'&&c.after.includes('Audit destination')));
 assert.equal((await request(app).put(`/users/${id}/status`).send({disabled:true})).status,200);
 assert.ok(read().changes.some(c=>c.label==='Account status'&&c.before==='Enabled'&&c.after==='Disabled'));
 db.users.setTotp(id,'Never-log-this-mfa-secret',true);
 assert.equal((await request(app).put(`/users/${id}/totp-disable`).send({})).status,200);
 assert.ok(read().changes.some(c=>c.label==='MFA'&&c.before==='Enabled'&&c.after==='Disabled'));
 assert.equal((await request(app).put(`/users/${id}/password`).send({password:'Never-log-this-password'})).status,200);
 assert.ok(read().changes.some(c=>c.label==='Password'&&c.after==='Replaced'));
 assert.equal((await request(app).delete(`/users/${id}`)).status,200);
 assert.equal(read().resource.name,'renamed-user');assert.equal(read().resource.id,id);
 const audit=JSON.stringify(db.db.prepare('SELECT detail FROM audit_log').all());
 for(const secret of ['Never-log-this-password','Never-log-this-mfa-secret','synthetic-new-hash','password_hash','totp_secret','pending_totp_secret'])assert.equal(audit.includes(secret),false);
});
