'use strict';
const {test, after} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reset-backup-route-'));
process.env.DB_PATH = path.join(root, 'test.db');
process.env.NODE_ENV = 'test';
const db = require('../db');
const password = 'Synthetic-backup-check-password';
db.users.create('admin', null, require('bcryptjs').hashSync(password, 4), 'admin');
db.users.create('second', null, require('bcryptjs').hashSync(password, 4), 'admin');
const express = require('express');
const request = require('supertest');
const {router, takeBackupApproval} = require('../routes/reset-backup');
const {createEncryptedDatabaseBackup} = require('../services/database-backup');
const {resetBackupState} = require('../services/reset-backup-proof');
const app = express();
app.use(express.json());
app.use((req, _res, next) => { req.user = db.users.getByUsername(req.headers['x-user'] || 'admin'); req.environmentId = req.headers['x-environment'] || 'default'; next(); });
app.use('/reset', router);
app.post('/consume/:action', (req, res) => {
  try { res.json({fingerprint: takeBackupApproval(req)}); }
  catch (error) { res.status(409).json({error: error.message}); }
});
const passphrase = 'Synthetic archive passphrase';
const filename = path.join(root, 'test.backup');
after(() => { db.db.close(); fs.rmSync(root, {recursive: true, force: true}); });
const prepare = (extra = {}) => request(app).post('/reset/schedules/backup').send({password, passphrase, scope: 'default', format: 'database', ...extra});
const upload = id => request(app).put(`/reset/schedules/backup/${id}`).set('Content-Type', 'application/octet-stream');

test('verification requires credentials, scope and a valid archive format before upload authorization', async () => {
  assert.equal((await prepare({password: 'wrong'})).status, 403);
  assert.equal((await prepare({scope: 'other'})).status, 409);
  assert.equal((await prepare({format: 'unknown'})).status, 400);
  assert.equal((await request(app).post('/reset/playbooks/backup').send({password, passphrase, scope: 'all-environments', format: 'database'})).status, 400);
});

test('uploaded archive issues a single-use approval bound to user, action and scope', async () => {
  await createEncryptedDatabaseBackup(db.db, filename, passphrase);
  const prepared = await prepare();
  assert.equal(prepared.status, 200, JSON.stringify(prepared.body));
  const id = prepared.body.id;
  const archive = fs.readFileSync(filename);
  assert.equal((await upload(id).set('x-user', 'second').send(archive)).status, 409);
  assert.equal((await upload(id).set('x-environment', 'other').send(archive)).status, 409);
  const verified = await upload(id).send(archive);
  assert.equal(verified.status, 200, JSON.stringify(verified.body));
  assert.equal(verified.body.scope, 'default');
  assert.equal(verified.headers['cache-control'], 'no-store');
  assert.equal((await upload(id).send(archive)).status, 409);
  const body = {backupApproval: verified.body.id};
  assert.equal((await request(app).post('/consume/servers').send(body)).status, 409);
  assert.equal((await request(app).post('/consume/schedules').set('x-user', 'second').send(body)).status, 409);
  const result = await request(app).post('/consume/schedules').send(body);
  assert.equal(result.status, 200);
  assert.equal(result.body.fingerprint, resetBackupState({database: db.db, action: 'schedules', environmentId: 'default'}));
  assert.equal((await request(app).post('/consume/schedules').send(body)).status, 409);
});

test('changed authorization or archive contents cannot issue approval', async () => {
  const archive = fs.readFileSync(filename);
  let prepared = await prepare();
  db.db.prepare("UPDATE users SET token_version=token_version+1 WHERE username='admin'").run();
  assert.equal((await upload(prepared.body.id).send(archive)).status, 409);
  prepared = await prepare();
  const corrupted = Buffer.from(archive); corrupted[corrupted.length - 1] ^= 1;
  const result = await upload(prepared.body.id).send(corrupted);
  assert.equal(result.status, 409);
  assert.match(result.body.error, /authentication failed/);
  assert.equal(result.body.id, undefined);
});
