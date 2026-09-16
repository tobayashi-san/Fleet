const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'shipyard-inventory-'));
process.env.DB_PATH = path.join(root, 'test.db');
process.env.NODE_ENV = 'test';
const db = require('../db');
const express = require('express');
const request = require('supertest');
const app = express();
app.use(express.json());
app.use((req,res,next)=>{req.user={role:req.headers['x-role']||'admin',username:'tester'};next();});
app.use('/servers',require('../routes/servers'));
app.use('/dashboard',require('../routes/dashboard'));
after(()=>{db.db.close();fs.rmSync(root,{recursive:true,force:true});});

test('inventory provides cached update counts and canonical detail attention',async()=>{
 const host=db.servers.create({name:'inventory-host',hostname:'inventory',ip_address:'192.0.2.10'});
 db.updatesCache.set(host.id,[{name:'upgrade'},{name:'phased',phased:true}]);
 const custom=db.customUpdateTasks.create(host.id,{name:'Failing check',type:'script'});
 db.customUpdateTasks.setCheckFailure(custom.id);
 db.dockerImageUpdatesCache.set(host.id,[{status:'update_available'},{status:'up_to_date'}]);
 const list=await request(app).get('/servers');
 assert.equal(list.status,200);
 const row=list.body.find(s=>s.id===host.id);
 assert.equal(row.updates_count,1);
 assert.ok(row.updates_checked_at);
 assert.equal(row.image_updates_count,1);
 assert.equal(row.attention.requiresAttention,true);
 assert.equal(row.attention.reasons.find(reason=>reason.code==='custom_check_failed').count,1);
 const detail=await request(app).get('/servers/'+host.id);
 assert.deepEqual(row.attention,detail.body.attention);
 assert.ok(row.image_updates_checked_at);
 const dashboard=await request(app).get('/dashboard');
 assert.equal(dashboard.status,200);
 const dashboardHost=dashboard.body.servers.find(server=>server.id===host.id);
 for(const field of ['updates_count','updates_checked_at','updates_stale','image_updates_count','image_updates_stale','image_updates_checked_at','custom_updates_count','custom_updates_stale']) {
   assert.equal(dashboardHost[field],row[field],`dashboard and host inventory disagree: ${field}`);
 }
 assert.deepEqual(dashboardHost.attention,row.attention);
 assert.equal(dashboardHost.custom_updates_stale,true);
 db.db.prepare("UPDATE custom_update_tasks SET last_checked_at=datetime('now') WHERE id=?").run(custom.id);
 assert.equal((await request(app).get('/dashboard')).body.servers.find(s=>s.id===host.id).custom_updates_stale,false);
 assert.equal(dashboardHost.updates_stale,false);
 assert.equal(dashboardHost.image_updates_stale,false);
 const freshImages = await request(app).get(`/servers/${host.id}/docker/image-updates/cached`);
 assert.equal(freshImages.body.stale,false);
 assert.equal(freshImages.body.updated_at,row.image_updates_checked_at);
 assert.match(freshImages.body.source,/registry/);
 db.db.prepare("UPDATE docker_image_updates_cache SET updated_at='2000-01-01 00:00:00' WHERE server_id=?").run(host.id);
 for (const route of ['/dashboard','/servers']) {
   const result = (await request(app).get(route)).body;
   assert.equal((result.servers || result).find(server=>server.id===host.id).image_updates_stale,true);
 }
 db.db.prepare("UPDATE server_updates_cache SET updated_at='2000-01-01 00:00:00' WHERE server_id=?").run(host.id);
 assert.equal((await request(app).get('/dashboard')).body.servers.find(server=>server.id===host.id).updates_stale,true);

 assert.equal((await request(app).get(`/servers/${host.id}/docker/image-updates/cached`)).body.stale,true);
 const unknown=db.servers.create({name:'unknown-cache',hostname:'unknown',ip_address:'192.0.2.11'});
 const uncached=(await request(app).get('/servers')).body.find(s=>s.id===unknown.id);
 assert.equal(uncached.updates_count,null);
 assert.equal(uncached.updates_checked_at,null);
 assert.equal(uncached.image_updates_count,null);
 const dashboardUnknown=(await request(app).get('/dashboard')).body.servers.find(server=>server.id===unknown.id);
 assert.equal(dashboardUnknown.updates_count,null);
 assert.equal(dashboardUnknown.custom_updates_stale,false);
 assert.equal(dashboardUnknown.updates_checked_at,null);
 const reader=db.roles.create('image reader',{servers:{servers:[host.id],groups:[]},canViewServers:true,canViewDocker:true,canViewUpdates:true,canPullDocker:false});
 assert.equal((await request(app).get(`/servers/${host.id}/docker/image-updates/cached`).set('x-role',reader.id)).status,200);
 assert.equal((await request(app).get(`/servers/${host.id}/docker/image-updates`).set('x-role',reader.id)).status,403);
 const role=db.roles.create('inventory only',{servers:{servers:[host.id],groups:[]},canViewServers:true,canViewUpdates:false,canViewDocker:false,canViewCustomUpdates:false,canViewServerHistory:false});
 const scoped=await request(app).get('/servers').set('x-role',role.id);
 assert.equal(scoped.status,200);
 assert.equal((await request(app).get(`/servers/${host.id}/docker/image-updates/cached`).set('x-role',role.id)).status,403);
 assert.equal(scoped.body.length,1);
 for(const field of ['updates_count','updates_checked_at','updates_stale','image_updates_count','image_updates_stale','custom_updates_count','custom_updates_stale','reboot_required']) assert.equal(Object.hasOwn(scoped.body[0],field),false);
 assert.equal(scoped.body[0].attention.reasons.some(reason=>reason.code.includes('updates') || reason.code==='custom_check_failed'),false);
 assert.deepEqual((await request(app).get('/servers?environment_id=missing')).body,[]);
});

test('creation uses a consistent explicit environment and rejects conflicting context', async () => {
 const scopedApp=express();
 scopedApp.use(express.json());
 scopedApp.use((req,res,next)=>{req.user={role:'admin',username:'tester'};next();});
 scopedApp.use(require('../middleware/environment-context'));
 scopedApp.use('/servers',require('../routes/servers'));
 db.db.prepare('INSERT INTO environments (id,name) VALUES (?,?)').run('staging','Staging');
 const data={name:'staging-created',hostname:'staging-created',ip_address:'192.0.2.50',environment_id:'staging'};
 const created=await request(scopedApp).post('/servers').set('X-Shipyard-Environment','staging').send(data);
 assert.equal(created.status,201);
 assert.equal(created.body.environment_id,'staging');
 assert.equal(db.servers.getById(created.body.id).environment_id,'staging');
 const mismatch=await request(scopedApp).post('/servers').set('X-Shipyard-Environment','default').send({...data,name:'must-not-exist'});
 assert.equal(mismatch.status,409);
 assert.equal(db.servers.getAll('default').some(server=>server.name==='must-not-exist'),false);
});

test('invalid SSH ports reject before persistence or connection testing', async () => {
 const host=db.servers.create({name:'port-host',hostname:'port-host',ip_address:'192.0.2.70',ssh_port:2222});
 for (const port of [0,65536,-1,22.5,'22junk','',null,true]) {
   const payload={name:'invalid-port',ip_address:'192.0.2.71',ssh_port:port};
   assert.equal((await request(app).post('/servers').send(payload)).status,400);
   assert.equal((await request(app).put('/servers/'+host.id).send({ssh_port:port})).status,400);
   assert.equal((await request(app).post('/servers/connection-test').send({...payload,password:'fixture-only'})).status,400);
 }
 assert.equal(db.servers.getById(host.id).ssh_port,2222);
 assert.equal(db.servers.getAll().some(server=>server.name==='invalid-port'),false);
 for (const port of [1,'65535']) {
   const result=await request(app).put('/servers/'+host.id).send({ssh_port:port});
   assert.equal(result.status,200);
   assert.equal(result.body.ssh_port,Number(port));
 }
 const imported=await request(app).post('/servers/import').send({servers:[{name:'bad-import',ip_address:'192.0.2.72',ssh_port:'22junk'}]});
 assert.equal(imported.status,200);
 assert.equal(imported.body.created,0);
 assert.equal(imported.body.skipped,1);
 assert.match(imported.body.errors[0],/SSH port/);
});

test('quality distinguishes failed attempts from stale results and clears failure after successful refresh', async()=>{
 const host=db.servers.create({name:'quality-host',hostname:'quality',ip_address:'192.0.2.90'});
 const read=async()=> (await request(app).get('/dashboard')).body.servers.find(s=>s.id===host.id).check_quality;
 assert.equal((await read()).find(c=>c.kind==='os').state,'not_checked');
 assert.equal((await read()).find(c=>c.kind==='custom').state,'not_applicable');
 db.updatesCache.set(host.id,[]);
 db.checkAttempts.failed(host.id,'os','Package manager unavailable');
 const failed=(await read()).find(c=>c.kind==='os');
 assert.equal(failed.state,'failed');assert.ok(failed.checked_at);assert.ok(failed.attempted_at);
 db.updatesCache.set(host.id,[]);
 assert.equal((await read()).find(c=>c.kind==='os').state,'current');
 db.db.prepare("UPDATE server_updates_cache SET updated_at='2000-01-01' WHERE server_id=?").run(host.id);
 assert.equal((await read()).find(c=>c.kind==='os').state,'stale');
});
