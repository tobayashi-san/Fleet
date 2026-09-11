'use strict';
const {test, after} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'shipyard-reset-schedules-'));
process.env.DB_PATH = path.join(root, 'test.db');
process.env.NODE_ENV = 'test';
const db = require('../db');
const resetPassword = 'Synthetic-reset-password';
db.users.create('test-admin',null,require('bcryptjs').hashSync(resetPassword,4),'admin');
const scheduler = require('../services/scheduler');
const cron = require('node-cron');
const express = require('express');
const request = require('supertest');
const app = express();
app.use(express.json());
app.use((req, _res, next) => { req.user = db.users.getByUsername('test-admin'); req.environmentId = 'selected'; next(); });
app.use('/reset', require('../routes/reset'));
db.db.prepare('INSERT INTO environments (id,name) VALUES (?,?)').run('selected','Selected');
after(() => { scheduler.shutdown(); db.db.close(); fs.rmSync(root, {recursive:true, force:true}); });

function fixture(environmentId) {
  const id = db.schedules.create('Never run', 'synthetic.yml', 'all', '0 0 1 1 *', {environmentId});
  db.db.prepare('INSERT INTO schedule_history (id,schedule_id,environment_id,schedule_name,playbook,status) VALUES (?,?,?,?,?,?)').run(id,id,environmentId,'Never run','synthetic.yml','success');
  scheduler.register(db.schedules.getById(id));
  return id;
}
const reset = async () => request(app).delete('/reset/schedules').send({confirmation:'DELETE SCHEDULES',scope:'selected',password:resetPassword,backupApproval:await require('./fixtures/reset-approval')({app,database:db.db,action:'schedules',scope:'selected',password:resetPassword})});

test('schedule reset removes only the selected environment and unregisters its real cron jobs', async () => {
  const selected = fixture('selected');
  const other = fixture('default');
  assert.ok(scheduler.getNextRun(selected));
  const result = await reset();
  assert.equal(result.status,200);
  assert.equal(db.schedules.getById(selected),undefined);
  assert.equal(scheduler.getNextRun(selected),null);
  assert.ok(db.schedules.getById(other));
  assert.ok(scheduler.getNextRun(other));
  assert.equal(db.db.prepare('SELECT COUNT(*) n FROM schedule_history WHERE id = ?').get(selected).n,0);
  assert.equal(db.db.prepare('SELECT COUNT(*) n FROM schedule_history WHERE id = ?').get(other).n,1);
  assert.equal(db.db.prepare("SELECT environment_id FROM audit_log WHERE action='reset.schedules'").get().environment_id,'selected');
});

test('history or audit failures roll back schedule deletion and preserve cron registration', async () => {
  for (const table of ['schedule_history','audit_log']) {
    const id = fixture('selected');
    const event = table === 'audit_log' ? 'INSERT' : 'DELETE';
    db.db.exec(`CREATE TRIGGER reject_reset BEFORE ${event} ON ${table} BEGIN SELECT RAISE(ABORT, 'synthetic failure'); END`);
    try {
      assert.equal((await reset()).status,500);
      assert.ok(db.schedules.getById(id));
      assert.ok(scheduler.getNextRun(id));
      assert.equal(db.db.prepare('SELECT COUNT(*) n FROM schedule_history WHERE id=?').get(id).n,1);
    } finally { db.db.exec('DROP TRIGGER reject_reset'); }
    assert.equal((await reset()).status,200);
  }
});

test('already queued callbacks do nothing after persisted deletion or disabling', async () => {
  const original = cron.createTask;
  let callback;
  cron.createTask = (_expression, run) => { callback = run; return {timeMatcher:{},start(){},destroy(){}}; };
  try {
    for (const state of ['deleted','disabled']) {
      const id = db.schedules.create('Never execute', 'synthetic.yml', 'all', '0 0 1 1 *');
      scheduler.register(db.schedules.getById(id));
      if (state === 'deleted') db.schedules.delete(id);
      else db.schedules.update(id,{enabled:0});
      const count = db.db.prepare('SELECT COUNT(*) n FROM schedule_history').get().n;
      await callback();
      assert.equal(db.db.prepare('SELECT COUNT(*) n FROM schedule_history').get().n,count);
      scheduler.unregister(id);
    }
  } finally { cron.createTask = original; }
});


test('post-commit scheduler cleanup failure reports success with warning and attempts remaining jobs', async () => {
  const first = fixture('selected');
  const second = fixture('selected');
  const unregister = scheduler.unregister;
  const attempted = [];
  scheduler.unregister = id => {
    attempted.push(id);
    if (id === first) throw new Error('Synthetic cron cleanup failure');
    return unregister(id);
  };
  try {
    const result = await reset();
    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
    assert.match(result.body.warning, /Reset completed/);
    assert.match(result.body.warning, /do not repeat the reset/);
    assert.ok(attempted.includes(first));
    assert.ok(attempted.includes(second));
    assert.equal(db.schedules.getById(first), undefined);
    assert.equal(db.schedules.getById(second), undefined);
    assert.equal(scheduler.getNextRun(second), null);
    assert.equal(db.db.prepare('SELECT COUNT(*) n FROM schedule_history WHERE environment_id=?').get('selected').n, 0);
  } finally {
    scheduler.unregister = unregister;
    unregister(first);
  }
});
