'use strict';
const os = require('os');
const fs = require('fs');
const path = require('path');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'shipyard-reset-'));
process.env.DB_PATH = path.join(root, 'test.db');
process.env.NODE_ENV = 'test';
const {test,after} = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const db = require('../db');
const resetPassword = 'Synthetic-reset-password';
db.users.create('test-admin',null,require('bcryptjs').hashSync(resetPassword,4),'admin');
const app = express();
app.use(express.json());
app.use((req,_res,next) => {req.user={...db.users.getByUsername('test-admin'),role:req.headers['x-role']||'admin'};req.environmentId=req.headers['x-environment']||'default';next();});
app.use('/reset',require('../routes/reset'));
after(()=>{db.db.close();fs.rmSync(root,{recursive:true,force:true});});
const phrases = {servers:'DELETE HOSTS',schedules:'DELETE SCHEDULES',playbooks:'DELETE PLAYBOOKS',auth:'RESET ALL ACCOUNTS',all:'RESET HOSTS SCHEDULES AND ACCOUNTS'};

test('all reset actions reject absent or incorrect confirmation before mutating data',async()=>{
 const host=db.servers.create({name:'Keep',hostname:'keep',ip_address:'192.0.2.1'});
 for(const action of Object.keys(phrases)){
  for(const body of [null,{}, {confirmation:'yes',scope:'default'}]){
   const res=await request(app).delete(`/reset/${action}`).send(body);
   assert.equal(res.status,400);
   assert.equal(res.body.field,'confirmation');
  }
 }
 assert.ok(db.servers.getById(host.id));
});

test('valid phrases cannot bypass scope binding or admin authorization',async()=>{
 for(const [action,confirmation] of Object.entries(phrases)){
  const res=await request(app).delete(`/reset/${action}`).send({confirmation,scope:'wrong-environment'});
  assert.equal(res.status,409);
  const denied=await request(app).delete(`/reset/${action}`).set('x-role','viewer').send({confirmation,scope:'default'});
  assert.equal(denied.status,403);
 }
});

test('confirmed host reset removes only the explicitly bound environment',async()=>{
 db.db.prepare('INSERT INTO environments (id,name) VALUES (?,?)').run('other','Other');
 const other=db.servers.create({name:'Other host',hostname:'other',ip_address:'192.0.2.2',environment_id:'other'});
 const response=await request(app).delete('/reset/servers').send({confirmation:phrases.servers,scope:'default',password:resetPassword,backupApproval:await require('./fixtures/reset-approval')({app,database:db.db,action:'servers',password:resetPassword})});
 assert.equal(response.status,200);
 assert.equal(db.db.prepare("SELECT COUNT(*) AS n FROM servers WHERE environment_id='default'").get().n,0);
 assert.ok(db.servers.getById(other.id));
});

test('host reset restores hosts and related inventory if its audit insert fails',async()=>{
 const host=db.servers.create({name:'Preserve on audit failure',hostname:'preserve',ip_address:'192.0.2.3'});
 db.db.prepare('INSERT INTO server_info (server_id) VALUES (?)').run(host.id);
 const beforeHosts=db.db.prepare('SELECT * FROM servers ORDER BY id').all();
 const beforeInfo=db.db.prepare('SELECT * FROM server_info ORDER BY server_id').all();
 db.db.exec("CREATE TRIGGER reject_host_reset BEFORE INSERT ON audit_log WHEN NEW.action='reset.servers' BEGIN SELECT RAISE(ABORT,'synthetic audit failure'); END");
 try {
  const response=await request(app).delete('/reset/servers').send({confirmation:phrases.servers,scope:'default',password:resetPassword,backupApproval:await require('./fixtures/reset-approval')({app,database:db.db,action:'servers',password:resetPassword})});
  assert.equal(response.status,500);
  assert.deepEqual(db.db.prepare('SELECT * FROM servers ORDER BY id').all(),beforeHosts);
  assert.deepEqual(db.db.prepare('SELECT * FROM server_info ORDER BY server_id').all(),beforeInfo);
 } finally { db.db.exec('DROP TRIGGER reject_host_reset'); }
 const retry=await request(app).delete('/reset/servers').send({confirmation:phrases.servers,scope:'default',password:resetPassword,backupApproval:await require('./fixtures/reset-approval')({app,database:db.db,action:'servers',password:resetPassword})});
 assert.equal(retry.status,200);
 assert.equal(db.servers.getById(host.id),undefined);
});

test('all destructive reset routes reject missing backup approval even with valid credentials',async()=>{
 const before=db.db.prepare('SELECT * FROM users ORDER BY id').all();
 for(const [action,confirmation] of Object.entries(phrases)){
  const response=await request(app).delete(`/reset/${action}`).send({confirmation,password:resetPassword,scope:['servers','schedules'].includes(action)?'default':'all-environments'});
  assert.equal(response.status,409);
  assert.equal(response.body.field,'backup');
 }
 assert.deepEqual(db.db.prepare('SELECT * FROM users ORDER BY id').all(),before);
});

test('a new host after verification invalidates approval and its retry without deleting records',async()=>{
 const backupApproval=await require('./fixtures/reset-approval')({app,database:db.db,action:'servers',password:resetPassword});
 const host=db.servers.create({name:'Created after backup',hostname:'new-after-backup',ip_address:'192.0.2.7'});
 for(let attempt=0;attempt<2;attempt++){
  const result=await request(app).delete('/reset/servers').send({confirmation:phrases.servers,scope:'default',password:resetPassword,backupApproval});
  assert.equal(result.status,409);
  assert.equal(result.body.field,'backup');
  assert.ok(db.servers.getById(host.id));
 }
});
