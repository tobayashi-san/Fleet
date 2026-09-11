const {test,after}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'dashboard-history-'));process.env.DB_PATH=path.join(root,'test.db');process.env.NODE_ENV='test';
const db=require('../db');const express=require('express');const request=require('supertest');
const app=express();app.use((req,res,next)=>{req.environmentId=req.headers['x-environment']||'default';req.user={role:req.headers['x-role']||'admin',username:'viewer'};next();});app.use('/dashboard',require('../routes/dashboard'));
after(()=>{db.db.close();fs.rmSync(root,{recursive:true,force:true});});

test('dashboard uses IDs for retained history and never exposes execution output',async()=>{
 const deleted=db.servers.create({name:'Original name',hostname:'original',ip_address:'192.0.2.1'});
 const oldRun=db.updateHistory.create(deleted.id,'system_update');db.updateHistory.updateStatus(oldRun,'failed','PRIVATE EXECUTION OUTPUT');db.servers.delete(deleted.id);
 const replacement=db.servers.create({name:deleted.id,hostname:'replacement',ip_address:'192.0.2.2'});
 const role=db.roles.create('Scoped summary',{canViewServers:true,canViewUpdates:true,servers:{groups:[],servers:[replacement.id]}});
 const restricted=await request(app).get('/dashboard').set('x-role',role.id);
 assert.equal(restricted.status,200);assert.equal(restricted.body.recentHistory.length,0);assert.equal(restricted.body.summary.failedOperations,0);
 const own=db.updateHistory.create(replacement.id,'system_update');db.updateHistory.updateStatus(own,'success','PRIVATE OWN OUTPUT');
 const visible=await request(app).get('/dashboard').set('x-role',role.id);
 assert.deepEqual(visible.body.recentHistory.map(row=>row.id),[own]);assert.equal(visible.body.recentHistory[0].output,undefined);
 const admin=await request(app).get('/dashboard');const retained=admin.body.recentHistory.find(row=>row.id===oldRun);
 assert.equal(retained.server_name,'Original name');assert.equal(retained.target_deleted,1);assert.equal(retained.output,undefined);
 assert.equal(JSON.stringify(admin.body).includes('PRIVATE'),false);
});

test('other hosts cannot push an allowed execution out of the history limit',async()=>{
 const allowed=db.servers.create({name:'Allowed',hostname:'allowed',ip_address:'192.0.2.3'});
 const hidden=db.servers.create({name:'Hidden',hostname:'hidden',ip_address:'192.0.2.4'});
 const own=db.updateHistory.create(allowed.id,'system_update');db.db.prepare('UPDATE update_history SET started_at=? WHERE id=?').run('2020-01-01 00:00:00',own);
 db.db.transaction(()=>{for(let i=0;i<501;i++)db.updateHistory.create(hidden.id,'system_update');})();
 const role=db.roles.create('History scope',{canViewServers:true,canViewServerHistory:true,servers:{groups:[],servers:[allowed.id]}});
 const result=await request(app).get('/dashboard').set('x-role',role.id);
 assert.equal(result.status,200);assert.deepEqual(result.body.recentHistory.map(row=>row.id),[own]);
});

test('audit access alone does not grant host execution history in the dashboard',async()=>{
 const role=db.roles.create('Audit without host history',{canViewServers:true,canViewAudit:true,servers:'all'});
 const result=await request(app).get('/dashboard').set('x-role',role.id);
 assert.equal(result.status,200);assert.deepEqual(result.body.recentHistory,[]);
 assert.equal(result.body.summary.failedOperations,0);
});
