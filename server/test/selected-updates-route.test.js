const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'selected-updates-'));
process.env.DB_PATH=path.join(root,'test.db');process.env.NODE_ENV='test';
const db=require('../db');const runner=require('../services/ansible-runner');
const original=runner.runPlaybook;const calls=[];
// An unsuccessful completed fake run avoids post-update host refreshes.
runner.runPlaybook=async(...args)=>{calls.push(args);return {success:false,stdout:'fixture',stderr:''};};
const express=require('express');const request=require('supertest');
const app=express();app.use(express.json());app.use((req,res,next)=>{req.environmentId=req.headers['x-environment']||'default';req.user={role:req.headers['x-role']||'admin',username:'operator'};next();});app.use('/servers',require('../routes/server-actions')());
const first=db.servers.create({name:'first',hostname:'first',ip_address:'192.0.2.1'});
const second=db.servers.create({name:'second',hostname:'second',ip_address:'192.0.2.2'});
db.db.prepare('INSERT INTO environments (id,name) VALUES (?,?)').run('stage','Stage');
const stage=db.servers.create({name:'stage-host',hostname:'stage-host',ip_address:'192.0.2.3',environment_id:'stage'});
const updater=db.roles.create('Selected updater',{canRunUpdates:true,canRunPlaybooks:false,servers:{servers:[first.id],groups:[]}});
after(()=>{runner.runPlaybook=original;db.db.close();fs.rmSync(root,{recursive:true,force:true});});

test('selected updates use exact authorized IDs with update-only permissions',async()=>{
 const response=await request(app).post('/servers/update-all').set('x-role',updater.id).send({server_ids:[first.id]});
 assert.equal(response.status,200);assert.equal(calls.length,1);
 assert.equal(calls[0][0],'update.yml');assert.equal(calls[0][1],'first');assert.deepEqual(calls[0][4],{environmentId:'default'});
});
test('malformed, unavailable and partially forbidden target sets never start a run',async()=>{
 const before=calls.length;
 for(const server_ids of [[],null,'all',[1],[''],Array(501).fill(first.id)]) {
  assert.equal((await request(app).post('/servers/update-all').send({server_ids})).status,400);
 }
 for(const server_ids of [[first.id,second.id],['missing'],[stage.id]]) {
  assert.equal((await request(app).post('/servers/update-all').set('x-role',updater.id).send({server_ids})).status,403);
 }
 assert.equal((await request(app).post('/servers/update-all').set('x-role','missing-role').send({server_ids:[first.id]})).status,403);
 assert.equal(calls.length,before);
});
test('environment is retained in execution and audit; omitted IDs preserve all-host behavior with explicit targets',async()=>{
 const response=await request(app).post('/servers/update-all').set('x-environment','stage').send({server_ids:[stage.id]});
 assert.equal(response.status,200);
 assert.equal(calls.at(-1)[1],'stage-host');assert.deepEqual(calls.at(-1)[4],{environmentId:'stage'});
 const audit=db.db.prepare("SELECT * FROM audit_log WHERE action='server.update_all' AND environment_id='stage'").all();
 assert.equal(audit.length,1);assert.match(audit[0].detail,/targets=stage-host/);
 assert.equal((await request(app).post('/servers/update-all').send({})).status,200);
 assert.equal(calls.at(-1)[1],'first,second');
});
