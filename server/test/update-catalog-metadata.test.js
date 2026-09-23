const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
process.env.DB_PATH = path.join(os.tmpdir(), `fleet-update-meta-${process.pid}.db`);
process.env.NODE_ENV = 'test';
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const db = require('../db');
const systemInfo = require('../services/system-info');
const original = systemInfo.getAvailableUpdates;
systemInfo.getAvailableUpdates = async () => [];
const app = express();
app.use((req, res, next) => { req.user = { role: req.headers['x-role'] || 'admin' }; next(); });
app.use('/servers', require('../routes/servers'));
after(() => { systemInfo.getAvailableUpdates = original; for (const suffix of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suffix); } catch {} } });
test('metadata marks old empty catalogs stale and force refresh records actual collection time', async () => {
  const host = db.servers.create({ name: 'catalog-host', hostname: 'catalog-host', ip_address: '10.1.2.3' });
  db.updatesCache.set(host.id, []);
  db.db.prepare("UPDATE server_updates_cache SET updated_at = '2000-01-01 01:00:00' WHERE server_id = ?").run(host.id);
  const stale = await request(app).get(`/servers/${host.id}/updates?include_meta=1`);
  assert.equal(stale.status, 200);
  assert.deepEqual(stale.body.updates, []);
  assert.equal(stale.body.stale, true);
  assert.equal(stale.body.cached, true);
  const fresh = await request(app).get(`/servers/${host.id}/updates?include_meta=1&force=1`);
  assert.equal(fresh.body.stale, false);
  assert.equal(fresh.body.cached, false);
  assert.ok(fresh.body.updated_at);
  const legacy = await request(app).get(`/servers/${host.id}/updates`);
  assert.ok(Array.isArray(legacy.body));
});
test('failed forced checks do not replace the last successful timestamp or return stale data as success', async () => {
  const host = db.servers.create({ name: 'failed-catalog', hostname: 'failed-catalog', ip_address: '10.1.2.4' });
  db.updatesCache.set(host.id, []);
  const before = db.db.prepare('SELECT updated_at FROM server_updates_cache WHERE server_id = ?').get(host.id).updated_at;
  systemInfo.getAvailableUpdates = async () => { throw new Error('SSH connection failed'); };
  try {
    const response = await request(app).get(`/servers/${host.id}/updates?include_meta=1&force=1`);
    assert.equal(response.status, 503);
    assert.equal(db.db.prepare('SELECT updated_at FROM server_updates_cache WHERE server_id = ?').get(host.id).updated_at, before);
  } finally { systemInfo.getAvailableUpdates = async () => []; }
});

test('package preview is scoped, fresh and leaves catalog and update history untouched', async () => {
  const host=db.servers.create({name:'preview-host',hostname:'preview-host',ip_address:'192.0.2.40'});
  db.updatesCache.set(host.id,[{package:'old-cached',version:'1'}]);
  const before=db.db.prepare('SELECT * FROM server_updates_cache WHERE server_id=?').get(host.id);
  const historyBefore=db.updateHistory.getByServer(host.id);
  let calls=0;
  const report={checked_at:'2026-09-09T20:00:00Z',updates:[],plan:{strategy:'apt-get dist-upgrade --auto-remove',changes:[{action:'remove',package:'old-kernel',current_version:'1',candidate_version:null}]}};
  systemInfo.getAvailableUpdates=async(server,options)=>{calls++;assert.equal(server.id,host.id);assert.deepEqual(options,{includePlan:true});return report;};
  try {
    const result=await request(app).get(`/servers/${host.id}/updates/preview`);
    assert.equal(result.status,200);assert.deepEqual(result.body,report);
    assert.deepEqual(db.db.prepare('SELECT * FROM server_updates_cache WHERE server_id=?').get(host.id),before);
    assert.deepEqual(db.updateHistory.getByServer(host.id),historyBefore);
    assert.equal((await request(app).get(`/servers/${host.id}/updates/preview`).set('x-role','missing-role')).status,403);
    assert.equal((await request(app).get('/servers/missing-host/updates/preview')).status,404);
    assert.equal(calls,1);
  } finally {systemInfo.getAvailableUpdates=async()=>[];}
});
