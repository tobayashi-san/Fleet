'use strict';
const {test,after}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const os=require('node:os');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'fleet-invitations-'));process.env.DB_PATH=path.join(root,'test.db');process.env.NODE_ENV='test';
const db=require('../db');const bcrypt=require('bcryptjs');const express=require('express');const request=require('supertest');const {roleRevision}=require('../utils/role-revision');
const issuer=db.users.create('inviting-admin','',bcrypt.hashSync('Synthetic-password-123',4),'admin');
const role=db.roles.create('Invited viewer',{servers:'all',canViewServers:true});
const app=express();app.use(express.json());app.use('/auth',require('../routes/auth').router);app.use('/users',(req,res,next)=>{req.user=db.users.getById(issuer.id);next();},require('../routes/users'));
after(()=>{db.db.close();fs.rmSync(root,{recursive:true,force:true});});
const invite=username=>request(app).post('/users/invitations').send({username,role:role.id,roleRevision:roleRevision(db.roles.getById(role.id))});
const accept=token=>request(app).post('/auth/invitations/accept').send({token,password:'Recipient-password-123'});
test('invitation token is one-time, hashed at rest, absent from lists/audit and creates account with recipient password',async()=>{
 const result=await invite('invited-one');assert.equal(result.status,201);assert.equal(result.headers['cache-control'],'no-store');
 const {id,token}=result.body;assert.equal(token.length,43);assert.equal(db.users.getByUsername('invited-one'),undefined);
 const stored=db.db.prepare('SELECT * FROM user_invitations WHERE id=?').get(id);assert.notEqual(stored.token_hash,token);
 assert.ok(!JSON.stringify((await request(app).get('/users/invitations')).body).includes(token));
 assert.ok(!JSON.stringify(db.db.prepare('SELECT * FROM audit_log').all()).includes(token));
 assert.equal((await accept(token)).status,201);
 const user=db.users.getByUsername('invited-one');assert.equal(user.role,role.id);assert.ok(bcrypt.compareSync('Recipient-password-123',user.password_hash));
 assert.equal((await accept(token)).status,410);
 assert.equal((await request(app).delete(`/users/invitations/${id}`)).status,409);
});
test('revocation, expiry and role changes prevent accepting stale invitations',async()=>{
 const revoked=await invite('invited-revoked');await request(app).delete(`/users/invitations/${revoked.body.id}`);assert.equal((await accept(revoked.body.token)).status,410);
 const expired=await invite('invited-expired');db.db.prepare('UPDATE user_invitations SET expires_at=0 WHERE id=?').run(expired.body.id);assert.equal((await accept(expired.body.token)).status,410);
 const changed=await invite('invited-changed');db.db.prepare('UPDATE roles SET name=? WHERE id=?').run('Changed viewer',role.id);assert.equal((await accept(changed.body.token)).status,409);
 assert.equal(db.users.getByUsername('invited-changed'),undefined);
});
test('audit failure rolls back account creation and leaves invitation available; revoked issuer blocks acceptance',async()=>{
 const result=await invite('invited-atomic');assert.equal(result.status,201);
 db.db.exec("CREATE TRIGGER reject_accept BEFORE INSERT ON audit_log WHEN NEW.action='users.invitation.accept' BEGIN SELECT RAISE(ABORT,'synthetic audit failure'); END");
 try{assert.equal((await accept(result.body.token)).status,500);assert.equal(db.users.getByUsername('invited-atomic'),undefined);assert.equal(db.db.prepare('SELECT accepted_at FROM user_invitations WHERE id=?').get(result.body.id).accepted_at,null);}finally{db.db.exec('DROP TRIGGER reject_accept');}
 db.users.incrementTokenVersion(issuer.id);assert.equal((await accept(result.body.token)).status,409);
});

test('concurrent acceptance creates exactly one account and pending duplicate invites are rejected',async()=>{
 const result=await invite('invited-race');assert.equal(result.status,201);
 assert.equal((await invite('invited-race')).status,409);
 const responses=await Promise.all([accept(result.body.token),accept(result.body.token)]);
 assert.deepEqual(responses.map(response=>response.status).sort(),[201,410]);
 assert.equal(db.db.prepare('SELECT COUNT(*) n FROM users WHERE username=?').get('invited-race').n,1);
});
test('public preview reveals only recipient context, does not consume token and rejects revoked links',async()=>{
 const result=await invite('invited-preview');
 const preview=await request(app).post('/auth/invitations/preview').send({token:result.body.token});
 assert.equal(preview.status,200);assert.equal(preview.headers['cache-control'],'no-store');
 assert.deepEqual(Object.keys(preview.body).sort(),['displayName','expiresAt','roleName','username']);
 assert.equal(preview.body.username,'invited-preview');assert.equal(db.users.getByUsername('invited-preview'),undefined);
 assert.equal(db.db.prepare('SELECT accepted_at FROM user_invitations WHERE id=?').get(result.body.id).accepted_at,null);
 await request(app).delete(`/users/invitations/${result.body.id}`);
 assert.equal((await request(app).post('/auth/invitations/preview').send({token:result.body.token})).status,410);
 assert.equal((await request(app).post('/auth/invitations/preview').send({token:'bad'})).status,410);
});
test('administrators can distinguish invalid invitations and preview rejects a claimed username',async()=>{
 const changed=await invite('invited-invalid-role');
 db.db.prepare('UPDATE roles SET name=? WHERE id=?').run('Revised viewer',role.id);
 let response=await request(app).get('/users/invitations');
 assert.equal(response.headers['cache-control'],'no-store');
 let row=response.body.find(item=>item.id===changed.body.id);
 assert.equal(row.status,'invalid');assert.equal(row.invalidReason,'role_changed');
 const claimed=await invite('invited-claimed');
 db.users.create('invited-claimed','',bcrypt.hashSync('Synthetic-password-123',4),role.id);
 response=await request(app).post('/auth/invitations/preview').send({token:claimed.body.token});
 assert.equal(response.status,409);assert.match(response.body.error,/Username is no longer available/);
 row=(await request(app).get('/users/invitations')).body.find(item=>item.id===claimed.body.id);
 assert.equal(row.invalidReason,'username_unavailable');
 const issuerChanged=await invite('invited-invalid-issuer');db.users.incrementTokenVersion(issuer.id);
 row=(await request(app).get('/users/invitations')).body.find(item=>item.id===issuerChanged.body.id);
 assert.equal(row.invalidReason,'issuer_changed');
 assert.equal((await request(app).delete(`/users/invitations/${issuerChanged.body.id}`)).status,200);
 row=(await request(app).get('/users/invitations')).body.find(item=>item.id===issuerChanged.body.id);
 assert.equal(row.status,'revoked');assert.equal(row.invalidReason,null);
});
