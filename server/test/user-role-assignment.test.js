'use strict';
const {test,after}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'fleet-assignment-'));process.env.DB_PATH=path.join(root,'test.db');process.env.NODE_ENV='test';
const db=require('../db');const bcrypt=require('bcryptjs');const {roleRevision}=require('../utils/role-revision');const express=require('express');const request=require('supertest');
const actor=db.users.create('admin',null,'synthetic','admin');
const app=express();app.use(express.json());app.use((req,_res,next)=>{req.user=actor;next();});app.use('/users',require('../routes/users'));
const originalHash=bcrypt.hash;bcrypt.hash=async()=> 'synthetic-hash';
after(()=>{bcrypt.hash=originalHash;db.db.close();fs.rmSync(root,{recursive:true,force:true});});
const role=db.roles.create('Reviewed',{servers:'all',canViewServers:true});
const revision=()=>roleRevision(db.roles.getById(role.id));
const payload=()=>({username:'new-user',password:'Synthetic-user-password',role:role.id,roleRevision:revision()});
test('new accounts require explicit valid roles and a reviewed revision',async()=>{
 const body=payload();delete body.role;delete body.roleRevision;
 assert.equal((await request(app).post('/users').send(body)).status,400);
 body.role=role.id;assert.equal((await request(app).post('/users').send(body)).status,428);
 body.roleRevision='stale';assert.equal((await request(app).post('/users').send(body)).status,409);
 assert.equal(db.users.count(),1);
});
test('a role changed during password hashing cannot be assigned and creates no user',async()=>{
 const body=payload();const hash=bcrypt.hash;
 bcrypt.hash=async()=>{db.roles.update(role.id,'Changed',{canUseTerminal:true});return 'synthetic-hash';};
 try{const response=await request(app).post('/users').send(body);assert.equal(response.status,409);assert.equal(response.body.field,'role_revision');assert.equal(db.users.count(),1);}finally{bcrypt.hash=hash;}
 assert.equal((await request(app).post('/users').send(payload())).status,201);
});
test('assignment rejects changed destination or current roles and rolls back token revocation on audit failure',async()=>{
 const target=db.users.getByUsername('new-user');const second=db.roles.create('Destination',{canViewServers:true});
 const body={role:second.id,expectedRole:target.role,roleRevision:roleRevision(second)};
 db.roles.update(second.id,'New destination',{canUseTerminal:true});
 assert.equal((await request(app).put(`/users/${target.id}`).send(body)).status,409);
 body.roleRevision=roleRevision(db.roles.getById(second.id));body.expectedRole='wrong';
 assert.equal((await request(app).put(`/users/${target.id}`).send(body)).status,409);
 body.expectedRole=target.role;
 const before=db.users.getById(target.id);
 db.db.exec("CREATE TRIGGER reject_audit BEFORE INSERT ON audit_log BEGIN SELECT RAISE(ABORT,'synthetic failure'); END");
 try{assert.equal((await request(app).put(`/users/${target.id}`).send(body)).status,500);assert.deepEqual(db.users.getById(target.id),before);}finally{db.db.exec('DROP TRIGGER reject_audit');}
 assert.equal((await request(app).put(`/users/${target.id}`).send(body)).status,200);
 assert.equal(db.users.getById(target.id).role,second.id);assert.equal(db.users.getById(target.id).token_version,before.token_version+1);
 // A profile-only update does not require another role assignment review.
 assert.equal((await request(app).put(`/users/${target.id}`).send({displayName:'Profile only'})).status,200);
});
test('failed creation audit does not leave an unaudited account behind',async()=>{
 db.db.exec("CREATE TRIGGER reject_audit BEFORE INSERT ON audit_log BEGIN SELECT RAISE(ABORT,'synthetic failure'); END");
 try{assert.equal((await request(app).post('/users').send({...payload(),username:'audit-failure'})).status,500);assert.equal(db.users.getByUsername('audit-failure'),undefined);}finally{db.db.exec('DROP TRIGGER reject_audit');}
});
