const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'shipyard-notes-'));
process.env.DB_PATH = path.join(root, 'test.db');
process.env.NODE_ENV = 'test';
const db = require('../db');
const express = require('express');
const request = require('supertest');
const app = express();
app.use(express.json());
app.use((req, res, next) => { req.user = { role: req.headers['x-role'] || 'admin', username: req.headers['x-actor'] || 'alice' }; next(); });
app.use((req, res, next) => { req.environmentId = req.headers['x-environment']; next(); });
app.use('/servers', require('../routes/servers'));
after(() => { db.db.close(); fs.rmSync(root,{recursive:true,force:true}); });

test('paginated host history reaches manual runs beyond the legacy limit', async () => {
 const host=db.servers.create({name:'History host',hostname:'history',ip_address:'192.0.2.55'});
 for(let i=0;i<25;i++) { const id=db.updateHistory.create(host.id,'system_update');db.db.prepare('UPDATE update_history SET started_at=? WHERE id=?').run(`2026-09-01 06:00:${String(i).padStart(2,'0')}`,id); }
 const legacy=await request(app).get(`/servers/${host.id}/history`);
 assert.equal(legacy.body.length,20);
 const first=await request(app).get(`/servers/${host.id}/history?page=1&page_size=20`);
 const second=await request(app).get(`/servers/${host.id}/history?page=2&page_size=20`);
 assert.equal(first.status,200);assert.equal(second.status,200);
 assert.equal(first.body.pagination.total,25);assert.equal(first.body.pagination.has_next,true);
 assert.equal(second.body.items.length,5);assert.equal(second.body.pagination.has_next,false);
 assert.equal(new Set([...first.body.items,...second.body.items].map(row=>row.id)).size,25);
 assert.equal((await request(app).get(`/servers/${host.id}/history?page=1`).set('x-environment','other')).status,404);
});

test('mixed sources with equal timestamps remain stable across pages', async () => {
 const host=db.servers.create({name:'mixed-history-host',hostname:'mixed',ip_address:'192.0.2.56'});
 for(let i=0;i<3;i++) {
  const manual=db.updateHistory.create(host.id,'system_update');
  db.db.prepare('UPDATE update_history SET started_at=? WHERE id=?').run('2026-09-01 06:00:00',manual);
  const scheduled=db.scheduleHistory.create(null,'Nightly','check.yml',host.name);
  db.db.prepare('UPDATE schedule_history SET started_at=? WHERE id=?').run('2026-09-01T06:00:00Z',scheduled);
 }
 const load=async()=>{const rows=[];for(let page=1;page<=3;page++){const res=await request(app).get(`/servers/${host.id}/history?page=${page}&page_size=2`);assert.equal(res.status,200);assert.equal(res.body.pagination.total,6);rows.push(...res.body.items);}return rows;};
 const rows=await load();
 assert.deepEqual((await load()).map(r=>r.id),rows.map(r=>r.id));
 assert.equal(new Set(rows.map(r=>`${r._type||'manual'}:${r.id}`)).size,6);
 assert.equal(rows.filter(r=>r._type==='schedule').length,3);
});

test('filters older runs before pagination and validates date range', async () => {
 const host=db.servers.create({name:'filter-history-host',hostname:'filter-history',ip_address:'192.0.2.57'});
 for(let i=0;i<25;i++){const id=db.updateHistory.create(host.id,i===0?'reboot':'system_update');db.db.prepare('UPDATE update_history SET started_at=?, status=?, output=? WHERE id=?').run(i===0?'2026-08-31 23:30:00':'2026-09-02 06:00:00',i===0?'failed':'success',i===0?'Permission denied':'Completed',id);}
 const res=await request(app).get(`/servers/${host.id}/history?page=1&action=reboot&status=failed&search=permission&from=2026-09-01&to=2026-09-01`);
 assert.equal(res.status,200);assert.equal(res.body.items.length,1);assert.equal(res.body.pagination.total,1);assert.equal(res.body.total_unfiltered,25);
 assert.deepEqual(res.body.actions,['reboot','system_update']);
 assert.equal((await request(app).get(`/servers/${host.id}/history?page=1&from=2026-09-02&to=2026-09-01`)).status,400);
});

test('scheduled logs are returned and searchable only for the targeted host', async () => {
 const host=db.servers.create({name:'scheduled-log-host',hostname:'scheduled-log',ip_address:'192.0.2.58'});
 const other=db.servers.create({name:'other-log-host',hostname:'other-log',ip_address:'192.0.2.59'});
 const scheduled=db.scheduleHistory.create(null,'Nightly','check.yml',host.name);
 db.scheduleHistory.complete(scheduled,'failed','ERROR: Überprüfung permission denied');
 const unrelated=db.scheduleHistory.create(null,'Other','check.yml',other.name);
 db.scheduleHistory.complete(unrelated,'failed','Private unrelated output');
 for (const suffix of ['', '?page=1', '?page=1&search='+encodeURIComponent('überprüfung')]) {
  const response=await request(app).get(`/servers/${host.id}/history${suffix}`);
  assert.equal(response.status,200);
  const rows=Array.isArray(response.body)?response.body:response.body.items;
  assert.equal(rows.length,1);
  assert.equal(rows[0].id,scheduled);
  assert.equal(rows[0].output,'ERROR: Überprüfung permission denied');
 }
 const hidden=await request(app).get(`/servers/${host.id}/history?page=1&search=Private`);
 assert.equal(hidden.body.items.length,0);
});

test('individual logs stay scoped and return updated output independently of list filters', async () => {
 const host=db.servers.create({name:'direct-log-host',hostname:'direct-log',ip_address:'192.0.2.60'});
 const other=db.servers.create({name:'foreign-direct-host',hostname:'foreign-direct',ip_address:'192.0.2.61'});
 const manual=db.updateHistory.create(host.id,'reboot');
 const scheduled=db.scheduleHistory.create(null,'Nightly','check.yml',host.name);
 for(const [source,id,table] of [['manual',manual,'update_history'],['schedule',scheduled,'schedule_history']]) {
  const url=`/servers/${host.id}/history/${source}/${id}`;
  db.db.prepare(`UPDATE ${table} SET status='running', output='Started' WHERE id=?`).run(id);
  const first=await request(app).get(url);
  assert.equal(first.status,200);assert.equal(first.body.output,'Started');
  db.db.prepare(`UPDATE ${table} SET status='success', output='Completed' WHERE id=?`).run(id);
  const completed=await request(app).get(url);
  assert.equal(completed.body.status,'success');assert.equal(completed.body.output,'Completed');
  assert.equal((await request(app).get(`/servers/${other.id}/history/${source}/${id}`)).status,404);
  assert.equal((await request(app).get(url).set('x-environment','foreign')).status,404);
 }
 assert.equal((await request(app).get(`/servers/${host.id}/history/invalid/${manual}`)).status,400);
 assert.equal((await request(app).get(`/servers/${host.id}/history/manual/missing`)).status,404);
});
