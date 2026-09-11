'use strict';
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const request = require('supertest');
module.exports = async function resetApproval({app, database, action, password, code, scope = 'default', headers = {}}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'reset-approval-fixture-'));
  const filename = path.join(dir, 'archive');
  const passphrase = 'Synthetic reset approval passphrase';
  const files = action === 'playbooks' || action === 'all';
  try {
    if (files) {
      let playbooks = process.env.SHIPYARD_PLAYBOOKS_DIR;
      try { await fs.access(playbooks); } catch { playbooks = path.join(dir, 'empty'); await fs.mkdir(playbooks); }
      await require('../../services/application-backup').createApplicationBackup({database, destination: filename, passphrase, offline: true, roots: [{id: 'playbooks', path: playbooks, required: true}]});
    } else await require('../../services/database-backup').createEncryptedDatabaseBackup(database, filename, passphrase);
    const prepared = await request(app).post(`/reset/${action}/backup`).set(headers).send({password, code, scope, passphrase, format: files ? 'application' : 'database'});
    assert.equal(prepared.status, 200, JSON.stringify(prepared.body));
    const verified = await request(app).put(`/reset/${action}/backup/${prepared.body.id}`).set(headers).set('Content-Type', 'application/octet-stream').send(await fs.readFile(filename));
    assert.equal(verified.status, 200, JSON.stringify(verified.body));
    return verified.body.id;
  } finally { await fs.rm(dir, {recursive: true, force: true}); }
};
