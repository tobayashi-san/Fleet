'use strict';
const {test,after}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const Database=require('better-sqlite3');
const {verifyRecoveryDatabaseKey}=require('../services/recovery-database-key');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'shipyard-recovery-key-')),file=path.join(root,'test.db');
const database=new Database(file);database.exec('CREATE TABLE app_settings(value TEXT); CREATE TABLE users(totp_secret TEXT,totp_secret_pending TEXT);');
after(()=>{database.close();fs.rmSync(root,{recursive:true,force:true});});
test('key verification distinguishes absent evidence, matching key and damaged or mixed-key ciphertext',()=>{
 assert.equal(verifyRecoveryDatabaseKey(file,'test-key').keyVerified,false);
 assert.throws(()=>verifyRecoveryDatabaseKey(file,''),/required/);
 const previous=process.env.SHIPYARD_KEY_SECRET;process.env.SHIPYARD_KEY_SECRET='test-key';
 try{
  const encrypt=require('../utils/crypto').encrypt;
  database.prepare('INSERT INTO app_settings VALUES (?)').run(encrypt('synthetic-secret'));
  database.prepare('INSERT INTO users VALUES (?,?)').run(encrypt('synthetic-totp'),'');
  const before=fs.readFileSync(file);
  assert.deepEqual(verifyRecoveryDatabaseKey(file,'test-key'),{scope:'core-database-encrypted-values',checkedValues:2,keyVerified:true});
  assert.deepEqual(fs.readFileSync(file),before);
  assert.throws(()=>verifyRecoveryDatabaseKey(file,'wrong-key'),/does not authenticate/);
  process.env.SHIPYARD_KEY_SECRET='another-key';database.prepare('INSERT INTO app_settings VALUES (?)').run(encrypt('other-secret'));
  assert.throws(()=>verifyRecoveryDatabaseKey(file,'test-key'),/does not authenticate/);
  database.prepare("UPDATE app_settings SET value='enc:broken'").run();
  assert.throws(()=>verifyRecoveryDatabaseKey(file,'test-key'),/does not authenticate/);
 }finally{if(previous===undefined)delete process.env.SHIPYARD_KEY_SECRET;else process.env.SHIPYARD_KEY_SECRET=previous;}
});
