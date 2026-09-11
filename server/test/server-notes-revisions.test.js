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

test('notes revisions prevent stale overwrite, preserve original content and record attribution', async () => {
  const host = db.servers.create({ name:'Notes host',hostname:'notes',ip_address:'10.1.2.3' });
  db.servers.setNotes(host.id,'original runbook');
  const url = `/servers/${host.id}/notes`;
  const initial = await request(app).get(url);
  assert.equal(initial.body.revision,0);
  assert.equal((await request(app).put(url).send({notes:'accidental overwrite'})).status,428);
  const saved = await request(app).put(url).send({notes:'alice edit',revision:0});
  assert.equal(saved.status,200);
  assert.equal(saved.body.author,'alice');
  assert.equal(saved.body.revision,1);
  assert.ok(Date.parse(saved.body.updated_at));
  const conflict = await request(app).put(url).set('x-actor','bob').send({notes:'bob stale draft',revision:0});
  assert.equal(conflict.status,409);
  assert.equal((await request(app).get(url)).body.notes,'alice edit');
  const history = await request(app).get(url+'/history');
  assert.deepEqual(history.body.revisions.map(r=>r.notes),['alice edit','original runbook']);
  assert.equal((await request(app).put(url).send({notes:null,revision:1})).status,400);
  assert.equal((await request(app).put(url).send({notes:'x'.repeat(5001),revision:1})).status,400);
  const merged = await request(app).put(url).set('x-actor','bob').send({notes:'merged notes',revision:1});
  assert.equal(merged.body.revision,2);
  assert.equal(merged.body.author,'bob');
});

test('history retention keeps the latest 100 revisions and enforces host and note permissions', async () => {
  const host = db.servers.create({name:'Retention host',hostname:'retention',ip_address:'10.1.2.4'});
  const url = `/servers/${host.id}/notes`;
  for (let revision=0; revision<102; revision++) {
    assert.equal((await request(app).put(url).send({notes:`revision ${revision+1}`,revision})).status,200);
  }
  const history = await request(app).get(url+'/history');
  assert.equal(history.body.revisions.length,100);
  assert.equal(history.body.revisions[0].revision,102);
  assert.equal(history.body.revisions[99].revision,3);
  const denied = db.roles.create('No notes', {servers:'all',canViewNotes:false});
  assert.equal((await request(app).get(url+'/history').set('x-role',denied.id)).status,403);
  const scoped = db.roles.create('Different host', {servers:{servers:['not-this-host'],groups:[]},canViewNotes:true});
  assert.equal((await request(app).get(url+'/history').set('x-role',scoped.id)).status,403);
  assert.equal((await request(app).get(url+'/history').set('x-environment','other')).status,404);
});


test('note changes and attribution roll back when central audit fails', async () => {
  const host = db.servers.create({name:'Audit notes host',hostname:'audit-notes',ip_address:'10.1.2.5'});
  db.servers.setNotes(host.id, 'original private content');
  const url = `/servers/${host.id}/notes`;
  db.db.exec("CREATE TRIGGER reject_notes_audit BEFORE INSERT ON audit_log WHEN NEW.action = 'server.notes_update' BEGIN SELECT RAISE(ABORT, 'test audit failure'); END");
  try {
    assert.equal((await request(app).put(url).send({notes:'replacement private content',revision:0})).status,500);
    assert.equal((await request(app).get(url)).body.notes,'original private content');
    assert.equal((await request(app).get(url)).body.revision,0);
    assert.deepEqual((await request(app).get(url+'/history')).body.revisions,[]);
  } finally { db.db.exec('DROP TRIGGER reject_notes_audit'); }
  assert.equal((await request(app).put(url).send({notes:'replacement private content',revision:0})).status,200);
  const audit = db.db.prepare("SELECT * FROM audit_log WHERE action = 'server.notes_update' AND detail LIKE ?").get(`%${host.id}%`);
  assert.ok(audit.detail.includes(host.id));
  assert.ok(audit.detail.includes('Audit notes host'));
  assert.ok(audit.detail.includes('from_revision=0 to_revision=1'));
  assert.ok(!audit.detail.includes('private content'));
});
