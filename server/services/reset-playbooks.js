'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {createHash,randomUUID} = require('node:crypto');
const log = require('../utils/logger').child('reset-playbooks');
const PREFIX = '.fleet-reset-';
const markerKey = id => `reset_commit:${id}`;
const digest = data => createHash('sha256').update(data).digest('hex');
function recoveryRequired(cause) {
  const error = new Error('Playbook reset requires offline recovery before retrying.',{cause});
  error.code = 'RESET_RECOVERY_REQUIRED';
  return error;
}
function syncDirectory(directory) {
  const fd = fs.openSync(directory,'r');
  try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
function fileDigest(filename) {
  const fd = fs.openSync(filename,fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    if (!fs.fstatSync(fd).isFile()) throw Error('Reset requires regular user playbook files');
    return digest(fs.readFileSync(fd));
  } finally { fs.closeSync(fd); }
}
function rollback(directory,staging,files) {
  for (const file of files) {
    const staged = path.join(staging,file.name), original = path.join(directory,file.name);
    let stat;
    try { stat=fs.lstatSync(staged); } catch(error) {
      if(error.code!=='ENOENT')throw error;
      if(fileDigest(original)!==file.sha256)throw Error('Original playbook changed or missing; manual recovery required');
      continue;
    }
    if (!stat.isFile() || fileDigest(staged)!==file.sha256) throw Error('Staged playbook changed; manual recovery required');
    try { fs.linkSync(staged,original); }
    catch(error) {
      if (error.code!=='EEXIST') throw error;
      const target=fs.lstatSync(original);
      // A previous recovery may have stopped between linking and unlinking.
      if (!target.isFile() || target.dev!==stat.dev || target.ino!==stat.ino) throw Error('Recovery conflicts with an existing playbook; files preserved');
    }
    fs.unlinkSync(staged);
    syncDirectory(directory);
    syncDirectory(staging);
  }
}
function finish(directory,staging,database,id) {
  // Keep the journal until all staged files are gone, including during cleanup
  // interrupted by process exit. An empty directory is safe to finish later.
  for(const name of fs.readdirSync(staging))if(name!=='journal.json')fs.unlinkSync(path.join(staging,name));
  fs.unlinkSync(path.join(staging,'journal.json'));
  syncDirectory(staging);
  fs.rmdirSync(staging);
  syncDirectory(directory);
  database.prepare('DELETE FROM app_settings WHERE key=?').run(markerKey(id));
}
function readJournal(staging) {
  const filename=path.join(staging,'journal.json');
  const stat=fs.lstatSync(filename);
  if (!stat.isFile() || stat.size>1024*1024) throw Error('Missing or invalid reset journal; manual recovery required');
  const raw=fs.readFileSync(filename,'utf8');
  const journal=JSON.parse(raw);
  if (journal.version!==1 || journal.id!==path.basename(staging) || !Array.isArray(journal.files)) throw Error('Invalid reset journal');
  const names=new Set();
  for(const file of journal.files) {
    if(typeof file.name!=='string' || path.basename(file.name)!==file.name || !/\.ya?ml$/.test(file.name) || names.has(file.name) || !/^[a-f0-9]{64}$/.test(file.sha256)) throw Error('Invalid reset journal member');
    names.add(file.name);
  }
  for(const name of fs.readdirSync(staging)) if(name!=='journal.json' && !names.has(name)) throw Error('Unlisted reset staging file; manual recovery required');
  return {journal,hash:digest(raw)};
}
// Run offline, using the original database. Never overwrite a conflicting file.
function recoverPendingPlaybookResets(directory,database) {
  const results=[];
  let entries;
  try { entries=fs.readdirSync(directory,{withFileTypes:true}); }
  catch(error) { if(error.code==='ENOENT')return results; throw error; }
  for(const entry of entries.filter(entry=>entry.name.startsWith(PREFIX))) {
    if(!entry.isDirectory())throw Error('Invalid reset staging directory');
    const staging=path.join(directory,entry.name);
    if(fs.readdirSync(staging).length===0) {
      fs.rmdirSync(staging);syncDirectory(directory);
      database.prepare('DELETE FROM app_settings WHERE key=?').run(markerKey(entry.name));
      results.push({id:entry.name,action:'removed-empty-staging'});
      continue;
    }
    const {journal,hash}=readJournal(staging);
    const identity=database.prepare("SELECT value FROM app_settings WHERE key='reset_database_id'").get();
    if(!identity || identity.value!==journal.databaseId)throw Error('Reset journal belongs to a different database');
    const marker=database.prepare('SELECT value FROM app_settings WHERE key=?').get(markerKey(journal.id));
    if(marker && marker.value!==hash)throw Error('Reset journal does not match its database commit');
    if(!marker)rollback(directory,staging,journal.files);
    finish(directory,staging,database,journal.id);
    results.push({id:journal.id,action:marker?'cleaned-committed-reset':'restored-uncommitted-reset'});
  }
  return results;
}
function withRemovedPlaybooks(directory,commit,database,checkBackup = () => {}) {
  if(!database)throw Error('Reset journal requires the transaction database');
  const commitWithoutFiles = () => database.transaction(() => { checkBackup(directory); return commit(); }).immediate();
  let entries;
  try { entries=fs.readdirSync(directory,{withFileTypes:true}); }
  catch(error) { if(error.code==='ENOENT')return {result:commitWithoutFiles(),cleanupPending:false}; throw error; }
  if(entries.some(entry=>entry.name.startsWith(PREFIX)))throw recoveryRequired();
  checkBackup(directory);
  const names=entries.filter(entry=>/\.ya?ml$/.test(entry.name)).map(entry=>entry.name).sort();
  for(const name of names)if(!fs.lstatSync(path.join(directory,name)).isFile())throw Error('Reset requires regular user playbook files');
  if(!names.length)return {result:commitWithoutFiles(),cleanupPending:false};
  const files=names.map(name=>({name,sha256:fileDigest(path.join(directory,name))}));
  database.prepare("INSERT OR IGNORE INTO app_settings (key,value) VALUES ('reset_database_id',?)").run(randomUUID());
  const databaseId=database.prepare("SELECT value FROM app_settings WHERE key='reset_database_id'").get().value;
  const staging=fs.mkdtempSync(path.join(directory,PREFIX));
  fs.chmodSync(staging,0o700);
  const id=path.basename(staging);
  const raw=JSON.stringify({version:1,id,databaseId,files});
  const fd=fs.openSync(path.join(staging,'journal.json'),'wx',0o600);
  try { fs.writeFileSync(fd,raw);fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  syncDirectory(staging);syncDirectory(directory);
  let result;
  try {
    for(const name of names)fs.renameSync(path.join(directory,name),path.join(staging,name));
    syncDirectory(staging);syncDirectory(directory);
    result=database.transaction(()=>{
      checkBackup(staging);
      const value=commit();
      database.prepare('INSERT INTO app_settings (key,value) VALUES (?,?)').run(markerKey(id),digest(raw));
      return value;
    }).immediate();
  } catch(error) {
    try { rollback(directory,staging,files);finish(directory,staging,database,id); }
    catch(rollbackError) {
      log.error({err:rollbackError,staging},'Playbook reset rollback incomplete; offline recovery required');
      throw recoveryRequired(error);
    }
    throw error;
  }
  try { finish(directory,staging,database,id); }
  catch(error) {
    log.error({err:error,staging},'Reset committed; private playbook staging cleanup remains');
    return {result,cleanupPending:true};
  }
  return {result,cleanupPending:false};
}
module.exports={withRemovedPlaybooks,recoverPendingPlaybookResets};
