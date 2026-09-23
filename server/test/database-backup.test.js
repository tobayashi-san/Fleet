'use strict';
const {test,after} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {execFileSync} = require('node:child_process');
const Database = require('better-sqlite3');
const {createEncryptedDatabaseBackup,verifyEncryptedDatabaseBackup,withVerifiedDatabaseBackup,restoreEncryptedDatabaseBackup} = require('../services/database-backup');
const root = fs.mkdtempSync(path.join(os.tmpdir(),'fleet-backup-test-'));
const filename = path.join(root,'source.db');
const database = new Database(filename);
database.pragma('journal_mode = WAL');
database.exec("CREATE TABLE users(id TEXT,token_version INTEGER,totp_secret_pending TEXT); INSERT INTO users VALUES ('admin',4,'pending-secret'); CREATE TABLE auth_sessions(id TEXT); INSERT INTO auth_sessions VALUES ('old-session'); CREATE TABLE app_settings(key TEXT,value TEXT); CREATE TABLE environments(id TEXT); INSERT INTO environments VALUES ('default'),('production'); INSERT INTO app_settings VALUES ('secret','never-print-backup-secret');");
const passphrase='Test-only backup passphrase 12345';
after(()=>{database.close();fs.rmSync(root,{recursive:true,force:true});});

test('encrypted online snapshot includes committed WAL data and verifies independently',async()=>{
 const target=path.join(root,'complete.backup');
 const info=await createEncryptedDatabaseBackup(database,target,passphrase);
 assert.equal(info.scope,'database-only'); assert.equal(info.environments,2);
 assert.equal(fs.statSync(target).mode & 0o777,0o600);
 assert.equal(fs.readFileSync(target).includes(Buffer.from('never-print-backup-secret')),false);
 database.prepare("UPDATE app_settings SET value='changed after backup'").run();
 let extracted;
 await withVerifiedDatabaseBackup(target,passphrase,(snapshot,verified)=>{
  extracted=snapshot;
  assert.equal(verified.integrity,'ok');
  const copy=new Database(snapshot,{readonly:true});
  try {assert.equal(copy.prepare('SELECT value FROM app_settings').get().value,'never-print-backup-secret');} finally {copy.close();}
 });
 assert.equal(fs.existsSync(extracted),false);
 assert.deepEqual(await verifyEncryptedDatabaseBackup(target,passphrase),{integrity:'ok',scope:'database-only',environments:2});
});

test('wrong passphrase, tampered ciphertext and truncated files never reach restore callback',async()=>{
 const good=path.join(root,'complete.backup');
 await assert.rejects(withVerifiedDatabaseBackup(good,'Incorrect passphrase 12345',()=>assert.fail('must not expose unauthenticated snapshot')),/authentication failed/);
 const damaged=Buffer.from(fs.readFileSync(good));damaged[Math.floor(damaged.length/2)]^=1;
 const bad=path.join(root,'tampered.backup');fs.writeFileSync(bad,damaged);
 await assert.rejects(withVerifiedDatabaseBackup(bad,passphrase,()=>assert.fail('must not expose damaged snapshot')),/authentication failed/);
 fs.writeFileSync(bad,damaged.subarray(0,10));
 await assert.rejects(verifyEncryptedDatabaseBackup(bad,passphrase),/Invalid database backup/);
});

test('existing backups are never replaced and weak passphrases produce no output',async()=>{
 const target=path.join(root,'existing');fs.writeFileSync(target,'keep');
 await assert.rejects(createEncryptedDatabaseBackup(database,target,passphrase),{code:'EEXIST'});
 assert.equal(fs.readFileSync(target,'utf8'),'keep');
 const weak=path.join(root,'weak');
 await assert.rejects(createEncryptedDatabaseBackup(database,weak,'short'),/passphrase/);
 assert.equal(fs.existsSync(weak),false);
 assert.equal(fs.readdirSync(root).some(name=>name.startsWith('.fleet-backup-')),false);
});

test('CLI verifies without exposing database values or modifying the source',()=>{
 const output=execFileSync(process.execPath,[path.join(__dirname,'../cli/database-backup.js'),'verify',path.join(root,'complete.backup')],{encoding:'utf8',env:{...process.env,FLEET_BACKUP_PASSPHRASE:passphrase}});
 assert.equal(JSON.parse(output).integrity,'ok');
 assert.equal(output.includes('never-print-backup-secret'),false);
 assert.equal(output.includes(passphrase),false);
});

test('CLI can create from a read-only database connection',()=>{
 const target=path.join(root,'cli-created.backup');
 const output=execFileSync(process.execPath,[path.join(__dirname,'../cli/database-backup.js'),'create',target],{encoding:'utf8',env:{...process.env,DB_PATH:filename,FLEET_BACKUP_PASSPHRASE:passphrase}});
 assert.equal(JSON.parse(output).scope,'database-only');
 assert.equal(fs.statSync(target).mode & 0o777,0o600);
});

test('unsupported database structure is rejected without publishing a backup',async()=>{
 const foreign=new Database(':memory:');foreign.exec('CREATE TABLE unrelated(id INTEGER)');
 const target=path.join(root,'foreign.backup');
 try {await assert.rejects(createEncryptedDatabaseBackup(foreign,target,passphrase),/supported Fleet/);} finally {foreign.close();}
 assert.equal(fs.existsSync(target),false);
 assert.equal(fs.readdirSync(root).some(name=>name.startsWith('.fleet-backup-')),false);
});

test('restore authenticates into a new database and invalidates copied versioned sessions',async()=>{
 const target=path.join(root,'restored.db');
 const info=await restoreEncryptedDatabaseBackup(path.join(root,'complete.backup'),target,passphrase);
 assert.equal(info.restored,true);assert.equal(info.versionedSessionsInvalidated,true);
 assert.equal(fs.statSync(target).mode & 0o777,0o600);
 const restored=new Database(target,{readonly:true});
 try {
  assert.equal(restored.prepare('SELECT value FROM app_settings').get().value,'never-print-backup-secret');
  assert.equal(restored.prepare('SELECT token_version FROM users').get().token_version,5);
  assert.equal(restored.prepare('SELECT totp_secret_pending FROM users').get().totp_secret_pending,'');
  assert.equal(restored.prepare('SELECT COUNT(*) AS n FROM auth_sessions').get().n,0);
 } finally {restored.close();}
 assert.equal(database.prepare('SELECT token_version FROM users').get().token_version,4);
 assert.equal(fs.existsSync(target+'-wal'),false);
 assert.equal(fs.readdirSync(root).some(name=>name.startsWith('.fleet-restore-')),false);
});

test('failed restore never replaces an existing destination or leaves a new one',async()=>{
 const existing=path.join(root,'existing-database');fs.writeFileSync(existing,'keep');
 await assert.rejects(restoreEncryptedDatabaseBackup(path.join(root,'complete.backup'),existing,passphrase),{code:'EEXIST'});
 assert.equal(fs.readFileSync(existing,'utf8'),'keep');
 const missing=path.join(root,'must-not-exist.db');
 await assert.rejects(restoreEncryptedDatabaseBackup(path.join(root,'complete.backup'),missing,'Wrong passphrase 12345'),/authentication failed/);
 assert.equal(fs.existsSync(missing),false);
 assert.equal(fs.readdirSync(root).some(name=>name.startsWith('.fleet-restore-')),false);
});

test('CLI restores to a new path without touching the configured running database',()=>{
 const target=path.join(root,'cli-restored.db');
 const output=execFileSync(process.execPath,[path.join(__dirname,'../cli/database-backup.js'),'restore',path.join(root,'complete.backup'),target],{encoding:'utf8',env:{...process.env,DB_PATH:filename,FLEET_BACKUP_PASSPHRASE:passphrase}});
 assert.equal(JSON.parse(output).restored,true);
 assert.equal(database.prepare('SELECT value FROM app_settings').get().value,'changed after backup');
});

test('restore refuses an unused filename with leftover SQLite sidecars',async()=>{
 const target=path.join(root,'orphaned.db');fs.writeFileSync(target+'-wal','keep old WAL');
 await assert.rejects(restoreEncryptedDatabaseBackup(path.join(root,'complete.backup'),target,passphrase),{code:'EEXIST'});
 assert.equal(fs.existsSync(target),false);
 assert.equal(fs.readFileSync(target+'-wal','utf8'),'keep old WAL');
});
