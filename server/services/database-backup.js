'use strict';
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const { pipeline } = require('node:stream/promises');
const Database = require('better-sqlite3');
const scrypt = promisify(crypto.scrypt);
const MAGIC = Buffer.from('FLEET-DB-1\n');

async function deriveKey(passphrase, salt) {
  if (typeof passphrase !== 'string' || passphrase.length < 12 || Buffer.byteLength(passphrase) > 1024) {
    throw new Error('Backup passphrase must contain 12–1024 characters (maximum 1024 UTF-8 bytes).');
  }
  return scrypt(passphrase, salt, 32, {N:32768,r:8,p:1,maxmem:64*1024*1024});
}

function inspectDatabase(filename) {
  const database = new Database(filename, {readonly:true,fileMustExist:true});
  try {
    const result = database.pragma('integrity_check');
    if (result.length !== 1 || result[0].integrity_check !== 'ok') throw new Error('Database integrity check failed');
    for (const name of ['users','app_settings','environments']) {
      if (!database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name)) throw new Error('Backup is not a supported Fleet database');
    }
    return {integrity:'ok',scope:'database-only',environments:database.prepare('SELECT COUNT(*) AS n FROM environments').get().n};
  } finally { database.close(); }
}

async function createEncryptedSnapshot(destination, passphrase, prepare, magic = MAGIC, verify = null) {
  const salt = crypto.randomBytes(32), iv = crypto.randomBytes(12);
  const key = await deriveKey(passphrase, salt);
  // The temporary directory is adjacent to the destination for atomic publication.
  const dir = await fsp.mkdtemp(path.join(path.dirname(path.resolve(destination)), '.fleet-backup-'));
  const snapshot = path.join(dir, 'snapshot.db'), encrypted = path.join(dir, 'encrypted');
  try {
    const info = await prepare(snapshot);
    await fsp.chmod(snapshot, 0o600);
    const header = Buffer.concat([magic,salt,iv]);
    await fsp.writeFile(encrypted, header, {mode:0o600,flag:'wx'});
    const cipher = crypto.createCipheriv('aes-256-gcm',key,iv);
    cipher.setAAD(header);
    await pipeline(fs.createReadStream(snapshot),cipher,fs.createWriteStream(encrypted,{flags:'a',mode:0o600}));
    await fsp.appendFile(encrypted,cipher.getAuthTag());
    const handle = await fsp.open(encrypted,'r');
    try { await handle.sync(); } finally { await handle.close(); }
    if (verify) await verify(encrypted);
    // link refuses to replace an existing backup, including symlinks.
    await fsp.link(encrypted,path.resolve(destination));
    return {...info,bytes:(await fsp.stat(encrypted)).size};
  } finally {
    key.fill(0);
    await fsp.rm(dir,{recursive:true,force:true});
  }
}

async function withDecryptedArchive(filename, passphrase, callback, magic = MAGIC) {
  const headerSize = magic.length + 32 + 12;
  const input = await fsp.open(filename,'r');
  let dir, key;
  try {
    const stat = await input.stat();
    if (!stat.isFile() || stat.size <= headerSize + 16) throw new Error('Invalid database backup');
    const header = Buffer.alloc(headerSize), tag = Buffer.alloc(16);
    await input.read(header,0,header.length,0);
    if (!header.subarray(0,magic.length).equals(magic)) throw new Error('Unsupported database backup format');
    await input.read(tag,0,16,stat.size-16);
    key = await deriveKey(passphrase,header.subarray(magic.length,magic.length+32));
    dir = await fsp.mkdtemp(path.join(os.tmpdir(),'fleet-backup-verify-'));
    const snapshot = path.join(dir,'snapshot.db');
    const decipher = crypto.createDecipheriv('aes-256-gcm',key,header.subarray(magic.length+32));
    decipher.setAAD(header); decipher.setAuthTag(tag);
    try {
      await pipeline(input.createReadStream({start:headerSize,end:stat.size-17,autoClose:false}),decipher,fs.createWriteStream(snapshot,{mode:0o600,flags:'wx'}));
    } catch { throw new Error('Backup authentication failed: wrong passphrase or damaged backup'); }
    return await callback(snapshot);
  } finally {
    await input.close();
    if (key) key.fill(0);
    if (dir) await fsp.rm(dir,{recursive:true,force:true});
  }
}

function createEncryptedDatabaseBackup(database, destination, passphrase) {
  return createEncryptedSnapshot(destination,passphrase,async snapshot=>{
    await database.backup(snapshot);
    return inspectDatabase(snapshot);
  });
}
function withVerifiedDatabaseBackup(filename,passphrase,callback) {
  return withDecryptedArchive(filename,passphrase,snapshot=>callback(snapshot,inspectDatabase(snapshot)));
}

function verifyEncryptedDatabaseBackup(filename,passphrase) {
  return withVerifiedDatabaseBackup(filename,passphrase,(_snapshot,info)=>info);
}
async function restoreEncryptedDatabaseBackup(filename, destination, passphrase) {
  return withVerifiedDatabaseBackup(filename,passphrase,async (snapshot,info) => {
    const dir = await fsp.mkdtemp(path.join(path.dirname(path.resolve(destination)),'.fleet-restore-'));
    const staged = path.join(dir,'restored.db');
    try {
      await fsp.copyFile(snapshot,staged,fs.constants.COPYFILE_EXCL);
      await fsp.chmod(staged,0o600);
      const restored = new Database(staged,{fileMustExist:true});
      try {
        if (!restored.pragma('table_info(users)').some(column => column.name === 'token_version')) {
          throw new Error('Restore requires a Fleet database with versioned user sessions');
        }
        restored.transaction(() => {
          // Do not reactivate credentials copied from an older point in time.
          restored.prepare('UPDATE users SET token_version=COALESCE(token_version,0)+1').run();
          if (restored.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='auth_sessions'").get()) {
            restored.prepare('DELETE FROM auth_sessions').run();
          }
          if (restored.pragma('table_info(users)').some(column => column.name === 'totp_secret_pending')) {
            restored.prepare("UPDATE users SET totp_secret_pending=''").run();
          }
        })();
        restored.pragma('wal_checkpoint(TRUNCATE)');
        restored.pragma('journal_mode = DELETE');
      } finally { restored.close(); }
      inspectDatabase(staged);
      const handle = await fsp.open(staged,'r');
      try { await handle.sync(); } finally { await handle.close(); }
      for (const suffix of ['-wal','-shm','-journal']) {
        try {
          await fsp.lstat(path.resolve(destination)+suffix);
          throw Object.assign(new Error('Restore destination has existing SQLite sidecar files'),{code:'EEXIST'});
        } catch (error) { if (error.code !== 'ENOENT') throw error; }
      }
      await fsp.link(staged,path.resolve(destination));
      return {...info,restored:true,versionedSessionsInvalidated:true};
    } finally { await fsp.rm(dir,{recursive:true,force:true}); }
  });
}
module.exports = {createEncryptedDatabaseBackup,verifyEncryptedDatabaseBackup,withVerifiedDatabaseBackup,restoreEncryptedDatabaseBackup,createEncryptedSnapshot,withDecryptedArchive};
