'use strict';
const {test,after}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'shipyard-role-revisions-'));process.env.DB_PATH=path.join(root,'test.db');process.env.NODE_ENV='test';
const db=require('../db');const express=require('express');const request=require('supertest');const app=express();app.use(express.json());app.use((req,_res,next)=>{req.user={role:'admin',username:'review-admin'};next();});app.use('/roles',require('../routes/roles'));
after(()=>{db.db.close();fs.rmSync(root,{recursive:true,force:true});});
const create=async(name)=>{const response=await request(app).post('/roles').send({name,permissions:{servers:'all',canViewServers:true}});assert.equal(response.status,201);assert.match(response.body.revision,/^[a-f0-9]{64}$/);return response.body;};
test('stale or missing revisions cannot overwrite a newer role or delete it',async()=>{
 const role=await create('Concurrent review');
 const update=await request(app).put(`/roles/${role.id}`).send({name:'Changed',permissions:{canUseTerminal:false},revision:role.revision});assert.equal(update.status,200);assert.notEqual(update.body.revision,role.revision);
 const before=db.roles.getById(role.id);const audits=db.db.prepare('SELECT COUNT(*) n FROM audit_log').get().n;
 for(const method of ['put','delete'])for(const revision of [undefined,role.revision]){
  const response=await request(app)[method](`/roles/${role.id}`).send({name:'Stale',permissions:{canUseTerminal:true},revision});
  assert.equal(response.status,revision?409:428);assert.equal(response.body.field,'revision');
 }
 assert.deepEqual(db.roles.getById(role.id),before);assert.equal(db.db.prepare('SELECT COUNT(*) n FROM audit_log').get().n,audits);
 const refreshed=(await request(app).get('/roles')).body.find(r=>r.id===role.id);assert.equal(refreshed.revision,update.body.revision);
 assert.equal((await request(app).delete(`/roles/${role.id}`).send({revision:refreshed.revision})).status,200);
});
test('audit failure rolls back both role edits and deletion, retaining the reviewed revision',async()=>{
 const role=await create('Rollback');const before=db.roles.getById(role.id);
 db.db.exec("CREATE TRIGGER fail_role_audit BEFORE INSERT ON audit_log BEGIN SELECT RAISE(ABORT,'synthetic audit failure'); END");
 try{
  for(const method of ['put','delete']){
   const result=await request(app)[method](`/roles/${role.id}`).send({name:'Not committed',permissions:{canUseTerminal:true},revision:role.revision});assert.equal(result.status,500);assert.deepEqual(db.roles.getById(role.id),before);
  }
 }finally{db.db.exec('DROP TRIGGER fail_role_audit');}
 assert.equal((await request(app).put(`/roles/${role.id}`).send({name:'Committed',permissions:{canUseTerminal:false},revision:role.revision})).status,200);
});
test('revision checks do not permit deletion of an assigned role',async()=>{
 const role=await create('Assigned');db.users.create('assigned',null,'synthetic-hash',role.id);
 assert.equal((await request(app).delete(`/roles/${role.id}`).send({revision:role.revision})).status,400);assert.ok(db.roles.getById(role.id));
});
test('role audit retains names and effective access changes after deletion',async()=>{
 const role=await create('Audit source');
 const updated=await request(app).put(`/roles/${role.id}`).send({name:'Audit renamed',permissions:{servers:{servers:['host-a']},canUseTerminal:true},revision:role.revision});
 assert.equal(updated.status,200);
 const detail=JSON.parse(db.db.prepare("SELECT detail FROM audit_log WHERE action='roles.update' ORDER BY rowid DESC LIMIT 1").get().detail);
 assert.equal(detail.resource.name,'Audit renamed');
 assert.ok(detail.changes.some(c=>c.label==='Name'&&c.before==='Audit source'&&c.after==='Audit renamed'));
 assert.ok(detail.changes.some(c=>c.label==='Use Terminal'&&c.after==='Allowed'));
 assert.ok(detail.changes.some(c=>c.label==='Servers'&&c.before==='all'&&c.after.includes('host-a')));
 assert.equal((await request(app).delete(`/roles/${role.id}`).send({revision:updated.body.revision})).status,200);
 const deleted=JSON.parse(db.db.prepare("SELECT detail FROM audit_log WHERE action='roles.delete' ORDER BY rowid DESC LIMIT 1").get().detail);
 assert.equal(deleted.resource.name,'Audit renamed');assert.equal(deleted.resource.id,role.id);
 assert.ok(deleted.changes.some(c=>c.label==='Use Terminal'&&c.before==='Allowed'&&c.after==='Not present'));
});
test('failed creation audit leaves no unaudited role',async()=>{
 db.db.exec("CREATE TRIGGER fail_role_create_audit BEFORE INSERT ON audit_log BEGIN SELECT RAISE(ABORT,'synthetic audit failure'); END");
 try {assert.equal((await request(app).post('/roles').send({name:'Unaudited',permissions:{}})).status,500);assert.equal(db.roles.getAll().some(r=>r.name==='Unaudited'),false);}
 finally {db.db.exec('DROP TRIGGER fail_role_create_audit');}
});
