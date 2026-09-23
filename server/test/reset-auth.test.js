'use strict';
const {test,after} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const root = fs.mkdtempSync(path.join(os.tmpdir(),'fleet-reset-auth-'));
process.env.DB_PATH = path.join(root,'test.db');
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'synthetic-external-jwt-key';
process.env.FLEET_KEY_SECRET = 'synthetic-encryption-key';
const db = require('../db');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const {createSession} = require('../utils/auth-sessions');
const {setSecret,getSecret} = require('../utils/crypto');
const {verifyWsAuth} = require('../ws/auth');
const app = express();
app.use(express.json());
app.use(auth);
app.use('/reset',require('../routes/reset'));
app.get('/protected',(_req,res)=>res.json({ok:true}));
after(()=>{db.db.close();fs.rmSync(root,{recursive:true,force:true});});
const resetPassword='Synthetic-reset-password';
db.users.create('admin-reset',null,require('bcryptjs').hashSync(resetPassword,4),'admin');
db.users.create('viewer-reset',null,'synthetic-hash','viewer');
const admin = db.users.getByUsername('admin-reset');
const sid = createSession(admin);
const token = jwt.sign({userId:admin.id,tv:admin.token_version||0,sid},process.env.JWT_SECRET,{expiresIn:'1h'});
for (const key of ['auth_password_hash','auth_username','auth_email','onboarding_done','totp_enabled','totp_secret','totp_secret_pending']) db.settings.set(key,'synthetic-original');
setSecret(db,'auth_jwt_secret','synthetic-original-secret');
const host = db.servers.create({name:'Preserved host',hostname:'preserved',ip_address:'192.0.2.15'});
const snapshot = () => ({
  users:db.db.prepare('SELECT * FROM users ORDER BY id').all(),
  sessions:db.db.prepare('SELECT * FROM auth_sessions ORDER BY id').all(),
  settings:db.db.prepare('SELECT * FROM app_settings ORDER BY key').all(),
  audit:db.db.prepare('SELECT * FROM audit_log ORDER BY id').all(),
});
const reset = async () => request(app).delete('/reset/auth').set('Authorization',`Bearer ${token}`).send({confirmation:'RESET ALL ACCOUNTS',scope:'all-environments',password:resetPassword,backupApproval:await require('./fixtures/reset-approval')({app,database:db.db,action:'auth',scope:'all-environments',password:resetPassword,headers:{Authorization:`Bearer ${token}`}})});

test('account reset rolls back users, cascaded sessions, credentials and audit on intermediate failures',async()=>{
  for (const trigger of [
    "BEFORE DELETE ON app_settings WHEN OLD.key='auth_username'",
    "BEFORE INSERT ON app_settings WHEN NEW.key='totp_secret_pending'",
    'BEFORE INSERT ON audit_log',
  ]) {
    const before = snapshot();
    db.db.exec(`CREATE TRIGGER fail_reset ${trigger} BEGIN SELECT RAISE(ABORT,'synthetic reset failure'); END`);
    try {
      assert.equal((await reset()).status,500);
      assert.deepEqual(snapshot(),before);
      assert.equal((await request(app).get('/protected').set('Authorization',`Bearer ${token}`)).status,200);
    } finally { db.db.exec('DROP TRIGGER fail_reset'); }
  }
});

test('successful reset removes all accounts and sessions while preserving host data and recording its actor',async()=>{
  assert.equal((await reset()).status,200);
  assert.equal(db.users.count(),0);
  assert.equal(db.db.prepare('SELECT COUNT(*) n FROM auth_sessions').get().n,0);
  for (const key of ['auth_password_hash','auth_username','auth_email']) assert.ok(!db.settings.get(key));
  for (const key of ['onboarding_done','totp_enabled','totp_secret','totp_secret_pending']) assert.equal(db.settings.get(key),'');
  assert.notEqual(getSecret(db,'auth_jwt_secret'),'synthetic-original-secret');
  assert.ok(db.servers.getById(host.id));
  const audit = db.db.prepare("SELECT * FROM audit_log WHERE action='reset.auth'").all();
  assert.equal(audit.length,1);
  assert.equal(audit[0].user,'admin-reset');
  assert.equal(audit[0].success,1);
  assert.equal((await request(app).get('/protected').set('Authorization',`Bearer ${token}`)).status,503);
  let closed;
  assert.equal(verifyWsAuth({close(code){closed=code;}},new URL(`http://localhost/?token=${token}`)),false);
  assert.equal(closed,4001);
  // Even with an unchanged external signing key, recreating the username does not revive its old session.
  db.users.create('admin-reset',null,'synthetic-new-hash','admin');
  assert.equal((await request(app).get('/protected').set('Authorization',`Bearer ${token}`)).status,401);
});
