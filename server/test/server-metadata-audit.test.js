const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'shipyard-host-audit-'));
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

test('host metadata changes record before/after and roll back on audit failure',async()=>{
 const host=db.servers.create({name:'metadata-before',hostname:'metadata',ip_address:'192.0.2.77'});
 const changed=await request(app).put(`/servers/${host.id}`).send({name:'metadata-after',tags:['production']});
 assert.equal(changed.status,200);
 const audit=db.db.prepare("SELECT * FROM audit_log WHERE action='server.update' ORDER BY rowid DESC LIMIT 1").get();
 const detail=JSON.parse(audit.detail);
 assert.equal(detail.kind,'host-change');assert.equal(detail.resource.id,host.id);
 assert.ok(detail.changes.some(field=>field.label==='Name'&&field.before==='metadata-before'&&field.after==='metadata-after'));
 assert.ok(detail.changes.some(field=>field.label==='Tags'&&field.after==='["production"]'));
 db.db.exec("CREATE TRIGGER fail_metadata_audit BEFORE INSERT ON audit_log WHEN NEW.action='server.update' BEGIN SELECT RAISE(ABORT,'Audit unavailable'); END");
 try {
  const failed=await request(app).put(`/servers/${host.id}`).send({name:'must-not-persist'});
  assert.equal(failed.status,500);assert.equal(db.servers.getById(host.id).name,'metadata-after');
 } finally {db.db.exec('DROP TRIGGER fail_metadata_audit');}
});

test('link and mount edits are included while unchanged saves add no audit entry',async()=>{
 const host=db.servers.create({name:'metadata-links',hostname:'metadata-links',ip_address:'192.0.2.78'});
 const patch={links:[{name:'Runbook',url:'https://docs.example.test/host'}],storage_mounts:[{name:'Data',path:'/srv/data'}]};
 const saved=await request(app).put(`/servers/${host.id}`).send(patch);
 assert.equal(saved.status,200);
 const read=()=>db.db.prepare("SELECT * FROM audit_log WHERE action='server.update' ORDER BY rowid DESC").all();
 const rows=read();const detail=JSON.parse(rows[0].detail);
 assert.ok(detail.changes.some(item=>item.label==='Links'&&item.after.includes('Runbook')));
 assert.ok(detail.changes.some(item=>item.label==='Storage mounts'&&item.after.includes('/srv/data')));
 assert.equal((await request(app).put(`/servers/${host.id}`).send(patch)).status,200);
 assert.equal(read().length,rows.length);
});

test('audit failure also rolls back automatic group and tag changes',async()=>{
 const host=db.servers.create({name:'metadata-group',hostname:'metadata-group',ip_address:'192.0.2.79'});
 const group=db.serverGroups.create('production','#111111',null,'default');
 db.db.exec("CREATE TRIGGER fail_group_audit BEFORE INSERT ON audit_log WHEN NEW.action='server.update' BEGIN SELECT RAISE(ABORT,'Audit unavailable'); END");
 try {
  const rejected=await request(app).put(`/servers/${host.id}`).send({tags:['production']});
  assert.equal(rejected.status,500);
  assert.equal(db.servers.getById(host.id).group_id,null);
  assert.equal(db.servers.getById(host.id).tags,'[]');
 } finally {db.db.exec('DROP TRIGGER fail_group_audit');}
 const accepted=await request(app).put(`/servers/${host.id}`).send({tags:['production']});
 assert.equal(accepted.status,200);assert.equal(db.servers.getById(host.id).group_id,group.id);
 const record=db.db.prepare("SELECT detail FROM audit_log WHERE action='server.update' ORDER BY rowid DESC LIMIT 1").get();
 assert.ok(JSON.parse(record.detail).changes.some(item=>item.label==='Group ID'&&item.after===group.id));
});

test('host deletion rolls back on audit failure and records its original environment',async()=>{
 const env='audit-delete-env';db.db.prepare('INSERT INTO environments(id,name) VALUES (?,?)').run(env,'Deletion test');
 const host=db.servers.create({name:'deleted-audit-host',hostname:'deleted-audit-host',ip_address:'192.0.2.80',environment_id:env});
 db.db.exec("CREATE TRIGGER fail_delete_audit BEFORE INSERT ON audit_log WHEN NEW.action='server.delete' BEGIN SELECT RAISE(ABORT,'Audit unavailable'); END");
 try {
  const rejected=await request(app).delete(`/servers/${host.id}`).set('x-environment',env);
  assert.equal(rejected.status,500);assert.ok(db.servers.getById(host.id));
 } finally {db.db.exec('DROP TRIGGER fail_delete_audit');}
 const accepted=await request(app).delete(`/servers/${host.id}`).set('x-environment',env);
 assert.equal(accepted.status,200);assert.equal(db.servers.getById(host.id),undefined);
 const audit=db.db.prepare("SELECT * FROM audit_log WHERE action='server.delete' ORDER BY rowid DESC LIMIT 1").get();
 assert.equal(audit.environment_id,env);assert.ok(audit.detail.includes(host.name));assert.ok(audit.detail.includes(host.id));
});

test('host creation is atomic with its audit and records the selected environment',async()=>{
 const env='audit-create-env';db.db.prepare('INSERT INTO environments(id,name) VALUES (?,?)').run(env,'Creation test');
 const payload={name:'created-audit-host',ip_address:'192.0.2.81'};
 db.db.exec("CREATE TRIGGER fail_create_audit BEFORE INSERT ON audit_log WHEN NEW.action='server.create' BEGIN SELECT RAISE(ABORT,'Audit unavailable'); END");
 try {
  const rejected=await request(app).post('/servers').set('x-environment',env).send(payload);
  assert.equal(rejected.status,500);assert.equal(db.db.prepare('SELECT id FROM servers WHERE name=?').get(payload.name),undefined);
 } finally {db.db.exec('DROP TRIGGER fail_create_audit');}
 const accepted=await request(app).post('/servers').set('x-environment',env).send(payload);
 assert.equal(accepted.status,201);assert.equal(accepted.body.environment_id,env);
 const audit=db.db.prepare("SELECT * FROM audit_log WHERE action='server.create' ORDER BY rowid DESC LIMIT 1").get();
 assert.equal(audit.environment_id,env);assert.ok(audit.detail.includes(accepted.body.id));
});
