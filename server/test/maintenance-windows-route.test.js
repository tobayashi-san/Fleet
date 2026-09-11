'use strict';

const os = require('os');
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(os.tmpdir(), `fleet_test_maintenance_windows_${Date.now()}.db`);
process.env.JWT_SECRET = 'test-jwt-secret-maintenance-windows';
process.env.NODE_ENV = 'test';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const db = require('../db');
const { router: authRouter } = require('../routes/auth');
const authMiddleware = require('../middleware/auth');
const maintenanceWindowsRouter = require('../routes/maintenance-windows');
const { testLimiter } = require('../utils/rate-limiters');

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api', testLimiter, authMiddleware);
app.use('/api/maintenance-windows', maintenanceWindowsRouter);

let token;
let environmentId;

before(async () => {
  await request(app).post('/api/auth/setup').send({ password: 'testpass12345' });
  const login = await request(app).post('/api/auth/login').send({ password: 'testpass12345' });
  token = login.body.token;
  environmentId = db.uuidv4();
  db.db.prepare('INSERT INTO environments (id, name) VALUES (?, ?)').run(environmentId, 'Maintenance test');
});

after(() => {
  for (const ext of ['', '-wal', '-shm']) {
    try { fs.unlinkSync(process.env.DB_PATH + ext); } catch {}
  }
});

test('maintenance windows validate their period and are scoped to the environment', async () => {
  const invalid = await request(app).post('/api/maintenance-windows').set('Authorization', `Bearer ${token}`).send({
    environment_id: environmentId,
    name: 'Invalid period',
    starts_at: '2099-08-12T12:00:00.000Z',
    ends_at: '2099-08-12T11:00:00.000Z',
  });
  assert.equal(invalid.status, 400);

  const invalidTimezone = await request(app).post('/api/maintenance-windows').set('Authorization', `Bearer ${token}`).send({
    environment_id: environmentId,
    name: 'Invalid timezone',
    starts_at: '2099-08-12T12:00:00.000Z',
    ends_at: '2099-08-12T14:00:00.000Z',
    timezone: 'Zurich-ish',
  });
  assert.equal(invalidTimezone.status, 400);

  const created = await request(app).post('/api/maintenance-windows').set('Authorization', `Bearer ${token}`).send({
    environment_id: environmentId,
    name: 'Proxmox maintenance',
    starts_at: '2099-08-12T12:00:00.000Z',
    ends_at: '2099-08-12T14:00:00.000Z',
    description: 'Update node',
    affected_resources: 'Cluster pve-prod, node pve-01',
    timezone: 'Europe/Zurich',
    owner: 'Platform team',
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.environment_id, environmentId);
  assert.equal(created.body.state, 'scheduled');
  assert.equal(created.body.affected_resources, 'Cluster pve-prod, node pve-01');
  assert.equal(created.body.timezone, 'Europe/Zurich');
  assert.equal(created.body.owner, 'Platform team');

  const ownEnvironment = await request(app).get(`/api/maintenance-windows?environment_id=${environmentId}`).set('Authorization', `Bearer ${token}`);
  assert.equal(ownEnvironment.status, 200);
  assert.equal(ownEnvironment.body.length, 1);
  const defaultEnvironment = await request(app).get('/api/maintenance-windows?environment_id=default').set('Authorization', `Bearer ${token}`);
  assert.equal(defaultEnvironment.status, 200);
  assert.equal(defaultEnvironment.body.length, 0);
});

test('maintenance windows can be updated and deleted with an audit trail', async () => {
  const created = await request(app).post('/api/maintenance-windows').set('Authorization', `Bearer ${token}`).send({
    environment_id: environmentId,
    name: 'Planned maintenance',
    starts_at: '2099-08-13T12:00:00.000Z',
    ends_at: '2099-08-13T14:00:00.000Z',
  });
  assert.equal(created.status, 201);

  const updated = await request(app).put(`/api/maintenance-windows/${created.body.id}`).set('Authorization', `Bearer ${token}`).send({
    revision: created.body.revision,
    name: 'Rescheduled maintenance',
    starts_at: '2099-08-13T13:00:00.000Z',
    ends_at: '2099-08-13T15:00:00.000Z',
    description: 'Followed by a reboot',
    affected_resources: 'Managed hosts tagged production',
    timezone: 'Europe/Zurich',
    owner: 'Operations',
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.name, 'Rescheduled maintenance');
  assert.equal(updated.body.affected_resources, 'Managed hosts tagged production');
  assert.equal(updated.body.owner, 'Operations');

  const deleted = await request(app).delete(`/api/maintenance-windows/${created.body.id}`).set('Authorization', `Bearer ${token}`).send({revision:updated.body.revision});
  assert.equal(deleted.status, 204);
  const audit = db.auditLog.query({ action: 'maintenance_window', environmentId });
  assert.ok(audit.some(row => row.action === 'maintenance_window.create'));
  assert.ok(audit.some(row => row.action === 'maintenance_window.update'));
  assert.ok(audit.some(row => row.action === 'maintenance_window.delete'));
});

test('structured host scope and change reference round-trip and reject other environments', async () => {
  const host = db.servers.create({ name: 'maintenance-target', hostname: 'maintenance-target', ip_address: '10.90.0.1', environment_id: environmentId });
  const outside = db.servers.create({ name: 'outside-target', hostname: 'outside-target', ip_address: '10.91.0.1' });
  const value = { environment_id: environmentId, name: 'Scoped change', starts_at: '2099-09-10T10:00:00Z', ends_at: '2099-09-10T11:00:00Z', resource_ids: [host.id, host.id], change_reference: 'CHG-104' };
  const created = await request(app).post('/api/maintenance-windows').set('Authorization', `Bearer ${token}`).send(value);
  assert.equal(created.status, 201);
  assert.deepEqual(created.body.resource_ids, [host.id]);
  const listed = await request(app).get(`/api/maintenance-windows?environment_id=${environmentId}`).set('Authorization', `Bearer ${token}`);
  const saved = listed.body.find(row => row.id === created.body.id);
  assert.deepEqual(saved.resource_ids, [host.id]);
  assert.equal(saved.change_reference, 'CHG-104');
  const rejected = await request(app).put(`/api/maintenance-windows/${created.body.id}`).set('Authorization', `Bearer ${token}`).send({ ...value, resource_ids: [outside.id] });
  assert.equal(rejected.status, 400);
  const badShape = await request(app).post('/api/maintenance-windows').set('Authorization', `Bearer ${token}`).send({ ...value, resource_ids: 'all' });
  assert.equal(badShape.status, 400);
});

test('weekly recurrence previews and saves local times across DST without preview writes', async () => {
 const value={environment_id:environmentId,name:'Weekly maintenance',starts_at:'2026-03-22T08:00:00.000Z',ends_at:'2026-03-22T09:00:00.000Z',timezone:'Europe/Zurich',recurrence:{frequency:'weekly',count:3}};
 const before=db.db.prepare('SELECT COUNT(*) AS n FROM maintenance_windows').get().n;
 const preview=await request(app).post('/api/maintenance-windows/preview').set('Authorization',`Bearer ${token}`).send(value);
 assert.equal(preview.status,200);
 assert.deepEqual(preview.body.occurrences.map(row=>row.starts_at),['2026-03-22T08:00:00.000Z','2026-03-29T07:00:00.000Z','2026-04-05T07:00:00.000Z']);
 assert.equal(db.db.prepare('SELECT COUNT(*) AS n FROM maintenance_windows').get().n,before);
 const saved=await request(app).post('/api/maintenance-windows').set('Authorization',`Bearer ${token}`).send(value);
 assert.equal(saved.status,201);assert.equal(saved.body.occurrences.length,3);
 assert.deepEqual(saved.body.occurrences.map(row=>row.starts_at),preview.body.occurrences.map(row=>row.starts_at));
 const conflicts=await request(app).post('/api/maintenance-windows/preview').set('Authorization',`Bearer ${token}`).send(value);
 assert.ok(conflicts.body.occurrences.every(row=>row.conflicts.length===1));
});

test('recurrence rejects skipped/duplicated local times and rolls back a partially inserted series', async () => {
 const value={environment_id:environmentId,name:'Atomic series',starts_at:'2026-03-22T01:30:00.000Z',ends_at:'2026-03-22T02:30:00.000Z',timezone:'Europe/Zurich',recurrence:{frequency:'weekly',count:3}};
 const before=db.db.prepare('SELECT COUNT(*) AS n FROM maintenance_windows').get().n;
 for(const variant of [value,{...value,recurrence:{frequency:'weekly',count:53}},{...value,starts_at:'2026-10-18T00:30:00.000Z',ends_at:'2026-10-18T01:30:00.000Z'}]) {
   const response=await request(app).post('/api/maintenance-windows').set('Authorization',`Bearer ${token}`).send(variant);
   assert.equal(response.status,400);
 }
 db.db.exec("CREATE TRIGGER fail_second_maintenance BEFORE INSERT ON maintenance_windows WHEN NEW.name='Atomic series' AND NEW.starts_at='2026-03-29T07:00:00.000Z' BEGIN SELECT RAISE(ABORT,'fixture failure'); END;");
 try {
   const response=await request(app).post('/api/maintenance-windows').set('Authorization',`Bearer ${token}`).send({...value,starts_at:'2026-03-22T08:00:00.000Z',ends_at:'2026-03-22T09:00:00.000Z'});
   assert.equal(response.status,400);assert.equal(db.db.prepare('SELECT COUNT(*) AS n FROM maintenance_windows').get().n,before);
 } finally {db.db.exec('DROP TRIGGER fail_second_maintenance');}
});

test('daily preview reports overlaps within the planned set and excludes adjacent windows', async () => {
 const value={environment_id:environmentId,name:'Daily range',starts_at:'2027-01-10T08:00:00.000Z',ends_at:'2027-01-11T09:00:00.000Z',timezone:'UTC',recurrence:{frequency:'daily',count:2}};
 const preview=await request(app).post('/api/maintenance-windows/preview').set('Authorization',`Bearer ${token}`).send(value);
 assert.equal(preview.status,200);assert.deepEqual(preview.body.occurrences.map(row=>row.planned_conflicts),[[2],[1]]);
 const adjacent=await request(app).post('/api/maintenance-windows/preview').set('Authorization',`Bearer ${token}`).send({...value,ends_at:'2027-01-11T08:00:00.000Z'});
 assert.deepEqual(adjacent.body.occurrences.map(row=>row.planned_conflicts),[[],[]]);
});

test('recurrence preview enforces capability, target scope and authoritative environment without writes', async () => {
 const jwt=require('jsonwebtoken');
 const scopedApp=express();scopedApp.use(express.json());
 scopedApp.use('/api',authMiddleware,require('../middleware/environment-context'));
 scopedApp.use('/api/maintenance-windows',maintenanceWindowsRouter);
 const own=db.servers.create({name:'preview-own',hostname:'preview-own',ip_address:'10.90.3.1',environment_id:environmentId});
 const hidden=db.servers.create({name:'preview-hidden',hostname:'preview-hidden',ip_address:'10.90.3.2',environment_id:environmentId});
 const makeToken=(name,permissions)=>{const role=db.roles.create(name,permissions);const user=db.users.create(name,'','unused',role.id,'');return jwt.sign({userId:user.id,tv:0},process.env.JWT_SECRET,{expiresIn:'5m'});};
 const scope={servers:{servers:[own.id],groups:[]}};
 const editor=makeToken('preview-editor',{...scope,canEditMaintenance:true});
 const reader=makeToken('preview-reader',{...scope,canViewMaintenance:true});
 const value={environment_id:environmentId,name:'Permission preview',starts_at:'2027-02-10T10:00:00.000Z',ends_at:'2027-02-10T11:00:00.000Z',timezone:'UTC',resource_ids:[own.id],recurrence:{frequency:'daily',count:2}};
 const headers={Authorization:`Bearer ${editor}`,'X-Shipyard-Environment':environmentId};
 const before=db.db.prepare('SELECT COUNT(*) AS n FROM maintenance_windows').get().n;
 assert.equal((await request(scopedApp).post('/api/maintenance-windows/preview').set({...headers,Authorization:`Bearer ${reader}`}).send(value)).status,403);
 for(const endpoint of ['/preview','']) {
   assert.equal((await request(scopedApp).post('/api/maintenance-windows'+endpoint).set(headers).send({...value,resource_ids:[hidden.id]})).status,400);
   assert.equal((await request(scopedApp).post('/api/maintenance-windows'+endpoint).set({...headers,'X-Shipyard-Environment':'default'}).send(value)).status,409);
   assert.equal((await request(scopedApp).post('/api/maintenance-windows'+endpoint).set({...headers,'X-Shipyard-Environment':'default'}).send({...value,environment_id:'default'})).status,404);
 }
 assert.equal(db.db.prepare('SELECT COUNT(*) AS n FROM maintenance_windows').get().n,before);
 // A role allowed to edit but not read maintenance must not obtain names through conflict preview.
 const existing=await request(app).post('/api/maintenance-windows').set('Authorization',`Bearer ${token}`).send({...value,name:'CONFIDENTIAL CHANGE',recurrence:undefined});
 assert.equal(existing.status,201);
 const preview=await request(scopedApp).post('/api/maintenance-windows/preview').set(headers).send(value);
 assert.equal(preview.status,200);assert.equal(preview.body.conflicts_checked,false);
 assert.ok(preview.body.occurrences.every(row=>row.conflicts.length===0));
 assert.equal(JSON.stringify(preview.body).includes('CONFIDENTIAL'),false);
 assert.equal(JSON.stringify(preview.body).includes(existing.body.id),false);
 const allowed=await request(scopedApp).post('/api/maintenance-windows').set(headers).send(value);
 assert.equal(allowed.status,201);assert.equal(allowed.body.occurrences.length,2);
 assert.ok(allowed.body.occurrences.every(row=>row.environment_id===environmentId&&row.resource_ids[0]===own.id));
});

test('explicit maintenance scope never interprets an empty selected list as the entire environment', async () => {
 const host=db.servers.create({name:'scope-host',hostname:'scope-host',ip_address:'10.90.4.1',environment_id:environmentId});
 const value={environment_id:environmentId,name:'Explicit scope',starts_at:'2027-03-01T10:00:00Z',ends_at:'2027-03-01T11:00:00Z',resource_scope:'selected',resource_ids:[]};
 const before=db.db.prepare('SELECT COUNT(*) AS n FROM maintenance_windows').get().n;
 for(const endpoint of ['/preview','']) for(const invalid of [value,{...value,resource_scope:'everything'},{...value,resource_scope:'environment',resource_ids:[host.id]}]) {
  const response=await request(app).post('/api/maintenance-windows'+endpoint).set('Authorization',`Bearer ${token}`).send(invalid);
  assert.equal(response.status,400);
 }
 assert.equal(db.db.prepare('SELECT COUNT(*) AS n FROM maintenance_windows').get().n,before);
 const created=await request(app).post('/api/maintenance-windows').set('Authorization',`Bearer ${token}`).send({...value,resource_ids:[host.id]});
 assert.equal(created.status,201);
 const rejected=await request(app).put('/api/maintenance-windows/'+created.body.id).set('Authorization',`Bearer ${token}`).send(value);
 assert.equal(rejected.status,400);
 assert.deepEqual(JSON.parse(db.db.prepare('SELECT resource_ids FROM maintenance_windows WHERE id=?').get(created.body.id).resource_ids),[host.id]);
 const all=await request(app).post('/api/maintenance-windows').set('Authorization',`Bearer ${token}`).send({...value,resource_scope:'environment'});
 assert.equal(all.status,201);assert.deepEqual(all.body.resource_ids,[]);
});


test('maintenance edits reject stale or missing revisions without overwriting newer ownership',async()=>{
 const value={environment_id:environmentId,name:'Concurrent maintenance',starts_at:'2099-10-01T10:00:00Z',ends_at:'2099-10-01T11:00:00Z',owner:'Original team'};
 const created=await request(app).post('/api/maintenance-windows').set('Authorization',`Bearer ${token}`).send(value);
 assert.equal(created.status,201);assert.match(created.body.revision,/^[a-f0-9]{64}$/);
 const path='/api/maintenance-windows/'+created.body.id;
 const updated=await request(app).put(path).set('Authorization',`Bearer ${token}`).send({...value,owner:'New owner',revision:created.body.revision});
 assert.equal(updated.status,200);assert.notEqual(updated.body.revision,created.body.revision);
 for(const revision of [undefined,created.body.revision]){
  const rejected=await request(app).put(path).set('Authorization',`Bearer ${token}`).send({...value,owner:'Stale owner',revision});
  assert.equal(rejected.status,409);assert.equal(db.db.prepare('SELECT owner FROM maintenance_windows WHERE id=?').get(created.body.id).owner,'New owner');
 }
 const listed=await request(app).get('/api/maintenance-windows').query({environment_id:environmentId}).set('Authorization',`Bearer ${token}`);
 assert.equal(listed.body.find(row=>row.id===created.body.id).revision,updated.body.revision);
 const merged=await request(app).put(path).set('Authorization',`Bearer ${token}`).send({...value,owner:'Reviewed owner',revision:updated.body.revision});assert.equal(merged.status,200);
});


test('deletion requires the reviewed revision and rolls back if audit fails',async()=>{
 const value={environment_id:environmentId,name:'Delete race',starts_at:'2099-11-01T10:00:00Z',ends_at:'2099-11-01T11:00:00Z'};
 const created=await request(app).post('/api/maintenance-windows').set('Authorization',`Bearer ${token}`).send(value);
 const route='/api/maintenance-windows/'+created.body.id;
 const updated=await request(app).put(route).set('Authorization',`Bearer ${token}`).send({...value,owner:'New team',revision:created.body.revision});
 for(const revision of [undefined,created.body.revision])assert.equal((await request(app).delete(route).set('Authorization',`Bearer ${token}`).send({revision})).status,409);
 const original=db.auditLog.write;db.auditLog.write=()=>{throw Error('Fixture audit failure');};
 try{assert.equal((await request(app).delete(route).set('Authorization',`Bearer ${token}`).send({revision:updated.body.revision})).status,400);assert.ok(db.db.prepare('SELECT 1 FROM maintenance_windows WHERE id=?').get(created.body.id));}finally{db.auditLog.write=original;}
 assert.equal((await request(app).delete(route).set('Authorization',`Bearer ${token}`).send({revision:updated.body.revision})).status,204);
});


test('maintenance creation rolls back the complete series when audit persistence fails',async()=>{
 const value={environment_id:environmentId,name:'Atomic series',starts_at:'2099-11-01T10:00:00Z',ends_at:'2099-11-01T11:00:00Z',recurrence:{frequency:'weekly',count:3}};
 const count=()=>db.db.prepare('SELECT COUNT(*) AS n FROM maintenance_windows').get().n;
 const before=count();const write=db.auditLog.write;db.auditLog.write=()=>{throw Error('Fixture audit failure');};
 try{const result=await request(app).post('/api/maintenance-windows').set('Authorization',`Bearer ${token}`).send(value);assert.equal(result.status,400);assert.equal(count(),before);}finally{db.auditLog.write=write;}
 const result=await request(app).post('/api/maintenance-windows').set('Authorization',`Bearer ${token}`).send(value);assert.equal(result.status,201);assert.equal(result.body.occurrences.length,3);assert.equal(count(),before+3);
});

test('maintenance text bounds reject truncation and coercion on preview, create and update',async()=>{
 const value={environment_id:environmentId,name:'Text validation',starts_at:'2099-11-01T10:00:00Z',ends_at:'2099-11-01T11:00:00Z'};
 const created=await request(app).post('/api/maintenance-windows').set('Authorization',`Bearer ${token}`).send(value);
 for(const [field,limit] of [['name',120],['owner',120],['change_reference',200],['description',1000],['affected_resources',1000],['timezone',80]]){
  for(const bad of ['x'.repeat(limit+1),42,[],null]){
   const body={...value,[field]:bad,revision:created.body.revision};
   for(const suffix of ['', '/preview'])assert.equal((await request(app).post('/api/maintenance-windows'+suffix).set('Authorization',`Bearer ${token}`).send(body)).status,400,field);
   assert.equal((await request(app).put('/api/maintenance-windows/'+created.body.id).set('Authorization',`Bearer ${token}`).send(body)).status,400,field);
  }
 }
 assert.equal(db.db.prepare('SELECT name FROM maintenance_windows WHERE id=?').get(created.body.id).name,'Text validation');
 const boundary=await request(app).post('/api/maintenance-windows').set('Authorization',`Bearer ${token}`).send({...value,name:'n'.repeat(120),owner:'o'.repeat(120),change_reference:'c'.repeat(200),description:'d'.repeat(1000),affected_resources:'a'.repeat(1000)});
 assert.equal(boundary.status,201);assert.equal(boundary.body.owner.length,120);assert.equal(boundary.body.change_reference.length,200);
});


test('series identity persists across editing and deleting individual occurrences',async()=>{
 const value={environment_id:environmentId,name:'Series identity',starts_at:'2099-11-01T10:00:00Z',ends_at:'2099-11-01T11:00:00Z',recurrence:{frequency:'weekly',count:3}};
 const response=await request(app).post('/api/maintenance-windows').set('Authorization',`Bearer ${token}`).send(value);
 assert.equal(response.status,201);const rows=response.body.occurrences;
 assert.equal(new Set(rows.map(row=>row.series_id)).size,1);assert.ok(rows[0].series_id);
 assert.deepEqual(rows.map(row=>row.series_index),[1,2,3]);assert.ok(rows.every(row=>row.series_count===3&&row.recurrence_frequency==='weekly'));
 const edited=await request(app).put('/api/maintenance-windows/'+rows[1].id).set('Authorization',`Bearer ${token}`).send({...rows[1],name:'One renamed occurrence',series_id:'forged-series'});
 assert.equal(edited.status,200);assert.equal(edited.body.series_id,rows[0].series_id);assert.equal(edited.body.series_index,2);
 await request(app).delete('/api/maintenance-windows/'+rows[0].id).set('Authorization',`Bearer ${token}`).send({revision:rows[0].revision});
 const list=await request(app).get('/api/maintenance-windows').query({environment_id:environmentId}).set('Authorization',`Bearer ${token}`);
 const members=list.body.filter(row=>row.series_id===rows[0].series_id);assert.equal(members.length,2);assert.ok(members.every(row=>row.series_count===3));
 assert.equal(members.find(row=>row.id===rows[2].id).name,rows[2].name);
});

test('host-scoped maintenance editors cannot create or remove environment-wide coverage',async()=>{
 const own=db.servers.create({name:'scope-own',hostname:'scope-own',ip_address:'10.90.7.1',environment_id:environmentId});
 const hidden=db.servers.create({name:'scope-hidden',hostname:'scope-hidden',ip_address:'10.90.7.2',environment_id:environmentId});
 const role=db.roles.create('Scoped maintenance editor',{servers:{servers:[own.id],groups:[]},canViewMaintenance:true,canEditMaintenance:true});
 const user=db.users.create('scoped-maintenance','','unused',role.id,'');
 const scopedToken=require('jsonwebtoken').sign({userId:user.id,tv:0},process.env.JWT_SECRET,{expiresIn:'5m'});
 const value={environment_id:environmentId,name:'Scope control',starts_at:'2099-12-01T10:00:00Z',ends_at:'2099-12-01T11:00:00Z'};
 const send=(method,path,body,auth=scopedToken)=>request(app)[method]('/api/maintenance-windows'+path).set('Authorization',`Bearer ${auth}`).send(body);
 for(const scope of [{},{resource_ids:[],resource_scope:'environment'}]){
  assert.equal((await send('post','',{...value,...scope})).status,400);
  assert.equal((await send('post','/preview',{...value,...scope})).status,400);
 }
 const broad=await send('post','',value,token);
 const mixed=await send('post','',{...value,resource_ids:[own.id,hidden.id]},token);
 const ownWindow=await send('post','',{...value,resource_ids:[own.id]});assert.equal(ownWindow.status,201);
 for(const row of [broad.body,mixed.body]){
  assert.equal((await send('put','/'+row.id,{...value,resource_ids:[own.id],revision:row.revision})).status,403);
  assert.equal((await send('delete','/'+row.id,{revision:row.revision})).status,403);
 }
 const list=await request(app).get('/api/maintenance-windows').query({environment_id:environmentId}).set('Authorization',`Bearer ${scopedToken}`);
 assert.equal(list.status,200);assert.equal(list.body.find(row=>row.id===broad.body.id).can_edit,false);assert.equal(list.body.find(row=>row.id===mixed.body.id).can_edit,false);assert.equal(list.body.find(row=>row.id===ownWindow.body.id).can_edit,true);
 assert.equal((await send('delete','/'+ownWindow.body.id,{revision:ownWindow.body.revision})).status,204);
});


test('maintenance state and suppression share the exact end boundary',async()=>{
 const realNow=Date.now;const now=realNow();Date.now=()=>now;
 try{
  const host=db.servers.create({name:'boundary-host',hostname:'boundary-host',ip_address:'10.90.8.1',environment_id:environmentId});
  const value={environment_id:environmentId,name:'Exact boundary',starts_at:new Date(now-3600000).toISOString(),ends_at:new Date(now).toISOString(),resource_ids:[host.id]};
  const response=await request(app).post('/api/maintenance-windows').set('Authorization',`Bearer ${token}`).send(value);
  assert.equal(response.status,201);assert.equal(response.body.state,'completed');
  const list=await request(app).get('/api/maintenance-windows').query({environment_id:environmentId}).set('Authorization',`Bearer ${token}`);
  assert.equal(list.body.find(row=>row.id===response.body.id).state,'completed');
  const {coveredByMaintenance}=require('../utils/notification-maintenance');
  assert.equal(coveredByMaintenance(db.db,environmentId,[host.id],now),false);
  assert.equal(coveredByMaintenance(db.db,environmentId,[host.id],now-1),true);
 }finally{Date.now=realNow;}
});

test('cancellation preserves history, stops suppression and excludes conflicts atomically',async()=>{
 const now=Date.now();const host=db.servers.create({name:'cancel-host',hostname:'cancel-host',ip_address:'10.90.9.1',environment_id:environmentId});
 const value={environment_id:environmentId,name:'Cancel active work',starts_at:new Date(now-60000).toISOString(),ends_at:new Date(now+3600000).toISOString(),resource_ids:[host.id]};
 const created=await request(app).post('/api/maintenance-windows').set('Authorization',`Bearer ${token}`).send(value);
 const route='/api/maintenance-windows/'+created.body.id+'/cancel';
 const cancel=body=>request(app).post(route).set('Authorization',`Bearer ${token}`).send(body);
 for(const invalid of [{reason:'Changed plan'},{revision:created.body.revision,reason:''},{revision:created.body.revision,reason:'x'.repeat(501)}])assert.ok([400,409].includes((await cancel(invalid)).status));
 const write=db.auditLog.write;db.auditLog.write=()=>{throw Error('Fixture audit failure');};
 try{assert.equal((await cancel({revision:created.body.revision,reason:'Dependency delayed'})).status,400);assert.equal(db.db.prepare('SELECT cancelled_at FROM maintenance_windows WHERE id=?').get(created.body.id).cancelled_at,null);}finally{db.auditLog.write=write;}
 const {coveredByMaintenance}=require('../utils/notification-maintenance');assert.equal(coveredByMaintenance(db.db,environmentId,[host.id]),true);
 const cancelled=await cancel({revision:created.body.revision,reason:'Dependency delayed'});assert.equal(cancelled.status,200);assert.equal(cancelled.body.state,'cancelled');assert.equal(cancelled.body.cancellation_reason,'Dependency delayed');assert.ok(cancelled.body.cancelled_at);assert.notEqual(cancelled.body.revision,created.body.revision);
 assert.equal(coveredByMaintenance(db.db,environmentId,[host.id]),false);
 const preview=await request(app).post('/api/maintenance-windows/preview').set('Authorization',`Bearer ${token}`).send(value);assert.equal(preview.status,200);assert.equal(preview.body.occurrences[0].conflicts.some(row=>row.id===created.body.id),false);
 const list=await request(app).get('/api/maintenance-windows').query({environment_id:environmentId}).set('Authorization',`Bearer ${token}`);const stored=list.body.find(row=>row.id===created.body.id);assert.equal(stored.state,'cancelled');assert.equal(stored.can_edit,false);
 const edit=await request(app).put('/api/maintenance-windows/'+created.body.id).set('Authorization',`Bearer ${token}`).send({...value,revision:cancelled.body.revision});assert.equal(edit.status,409);
 assert.equal((await cancel({revision:cancelled.body.revision,reason:'Again'})).status,409);
});

test('maintenance audit retains before/after changes and cancellation history after deletion',async()=>{
 const host=db.servers.create({name:'Historical audit host',hostname:'audit-host',ip_address:'192.0.2.88',environment_id:environmentId});
 const value={name:'Audit planned',environment_id:environmentId,starts_at:'2035-01-01T10:00:00Z',ends_at:'2035-01-01T11:00:00Z',timezone:'Europe/Zurich',resource_ids:[host.id],change_reference:'CHG-1'};
 const created=await request(app).post('/api/maintenance-windows').set('Authorization',`Bearer ${token}`).send(value);assert.equal(created.status,201);
 const route='/api/maintenance-windows/'+created.body.id;
 const read=action=>JSON.parse(db.db.prepare('SELECT detail FROM audit_log WHERE action=? ORDER BY rowid DESC LIMIT 1').get(action).detail);
 assert.equal(read('maintenance_window.create').resource.id,created.body.id);
 const edited=await request(app).put(route).set('Authorization',`Bearer ${token}`).send({...value,name:'Audit changed',ends_at:'2035-01-01T12:00:00Z',change_reference:'CHG-2',revision:created.body.revision});assert.equal(edited.status,200);
 const changes=read('maintenance_window.update').changes;
 assert.ok(changes.some(c=>c.label==='Change reference'&&c.before==='CHG-1'&&c.after==='CHG-2'));
 assert.ok(changes.some(c=>c.label==='End (UTC)'&&c.after==='2035-01-01T12:00:00.000Z'));
 const cancelled=await request(app).post(route+'/cancel').set('Authorization',`Bearer ${token}`).send({revision:edited.body.revision,reason:'Dependency unavailable'});assert.equal(cancelled.status,200);
 assert.ok(read('maintenance_window.cancel').changes.some(c=>c.label==='Cancellation reason'&&c.after==='Dependency unavailable'));
 assert.equal((await request(app).delete(route).set('Authorization',`Bearer ${token}`).send({revision:cancelled.body.revision})).status,204);
 const removed=read('maintenance_window.delete');assert.equal(removed.resource.name,'Audit changed');
 assert.ok(removed.changes.some(c=>c.label==='Resources'&&c.before.includes('Historical audit host')&&c.after==='Not present'));
});
