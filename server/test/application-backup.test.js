'use strict';
const {test,after}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const os=require('node:os');const crypto=require('node:crypto');const Database=require('better-sqlite3');
const {createApplicationBackup,verifyApplicationBackup,restoreApplicationBackup}=require('../services/application-backup');const {packRecoveryBundle,unpackRecoveryBundle}=require('../services/recovery-bundle');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'shipyard-application-backup-'));const data=path.join(root,'data');fs.mkdirSync(data);fs.mkdirSync(path.join(root,'playbooks'));
fs.writeFileSync(path.join(root,'playbooks','run.yml'),'synthetic-playbook\n');fs.writeFileSync(path.join(data,'state.tfstate'),'synthetic-state\n');
const db=new Database(path.join(data,'shipyard.db'));db.pragma('journal_mode = WAL');db.exec('CREATE TABLE users(id TEXT,token_version INTEGER); CREATE TABLE app_settings(key TEXT,value TEXT); CREATE TABLE environments(id TEXT);');
const roots=[{id:'data',path:data,required:true},{id:'playbooks',path:path.join(root,'playbooks'),required:true}];const passphrase='Application backup test passphrase';
after(()=>{db.close();fs.rmSync(root,{recursive:true,force:true});});
test('offline application archive combines database and files and verifies independently',async()=>{
 const archive=path.join(root,'application.backup');
 await assert.rejects(createApplicationBackup({database:db,destination:archive,passphrase,roots}),/stopped/);
 const info=await createApplicationBackup({database:db,destination:archive,passphrase,roots,offline:true});
 assert.equal(info.scope,'application-database-and-files');assert.equal(info.verified,true);
 assert.equal(fs.readFileSync(archive).includes(Buffer.from('synthetic-state')),false);
 assert.equal(fs.statSync(archive).mode&0o777,0o600);
 const verified=await verifyApplicationBackup(archive,passphrase);assert.equal(verified.integrity,'ok');assert.ok(verified.entries>=7);
 await assert.rejects(verifyApplicationBackup(archive,'wrong application passphrase'),/authentication failed/);
 assert.equal(fs.readdirSync(root).some(name=>name.startsWith('.shipyard-backup-')),false);
});
test('file bundle round trip retains safe links and rejects pre-existing destinations',async()=>{
 const source=path.join(root,'bundle-source');fs.mkdirSync(source);fs.mkdirSync(path.join(source,'dir'));fs.writeFileSync(path.join(source,'dir','file'),'payload');fs.symlinkSync('dir/file',path.join(source,'link'));
 const bundle=path.join(root,'plain.bundle');await packRecoveryBundle(source,bundle);
 const target=path.join(root,'unpacked');await unpackRecoveryBundle(bundle,target);
 assert.equal(fs.readFileSync(path.join(target,'dir','file'),'utf8'),'payload');assert.equal(fs.readlinkSync(path.join(target,'link')),'dir/file');
 await assert.rejects(unpackRecoveryBundle(bundle,target),{code:'EEXIST'});
 assert.equal(fs.readFileSync(path.join(target,'dir','file'),'utf8'),'payload');
});
function malicious(name,entries){
 const chunks=[Buffer.from('SHIPYARD-FILES-1\n')];
 for(const entry of entries){const json=Buffer.from(JSON.stringify(entry));const size=Buffer.alloc(4);size.writeUInt32BE(json.length);chunks.push(size,json);if(entry.type==='file')chunks.push(Buffer.from(entry.payload||''));}
 chunks.push(Buffer.alloc(4));const filename=path.join(root,name);fs.writeFileSync(filename,Buffer.concat(chunks));return filename;
}
test('bundle extraction rejects traversal, duplicate paths, escaping links and symlink parents',async()=>{
 const cases=[
  [{path:'../outside',type:'directory'}],
  [{path:'same',type:'directory'},{path:'same',type:'directory'}],
  [{path:'link',type:'symlink',target:'../../outside'}],
  [{path:'dir',type:'directory'},{path:'link',type:'symlink',target:'dir'},{path:'link/child',type:'directory'}],
 ];
 for(let index=0;index<cases.length;index++){
  const target=path.join(root,`bad-target-${index}`);await assert.rejects(unpackRecoveryBundle(malicious(`bad-${index}`,cases[index]),target));assert.equal(fs.existsSync(target),false);
 }
 assert.equal(fs.existsSync(path.join(root,'outside')),false);
});
test('bundle extraction rejects altered content and truncation without retaining partial data',async()=>{
 const file={path:'file',type:'file',bytes:3,sha256:crypto.createHash('sha256').update('old').digest('hex'),payload:'new'};
 const archive=malicious('bad-hash',[file]);const target=path.join(root,'bad-hash-target');await assert.rejects(unpackRecoveryBundle(archive,target),/checksum/);assert.equal(fs.existsSync(target),false);
 fs.writeFileSync(archive,fs.readFileSync(archive).subarray(0,25));await assert.rejects(unpackRecoveryBundle(archive,target),/Truncated/);assert.equal(fs.existsSync(target),false);
});
test('CLI verifies the encrypted package and database writes during creation abort publication',async()=>{
 const {execFileSync}=require('node:child_process');
 const stdout=execFileSync(process.execPath,[path.join(__dirname,'../cli/application-backup.js'),'verify',path.join(root,'application.backup')],{encoding:'utf8',env:{...process.env,SHIPYARD_BACKUP_PASSPHRASE:passphrase}});
 assert.equal(JSON.parse(stdout).integrity,'ok');
 const fsp=require('node:fs/promises');const original=fsp.lstat;let changed=false;
 fsp.lstat=async(...args)=>{if(!changed && args[0]===path.join(root,'playbooks','run.yml')){changed=true;db.prepare('INSERT INTO app_settings VALUES (?,?)').run('concurrent-write','fixture');}return original(...args);};
 const target=path.join(root,'must-not-publish.backup');
 try{await assert.rejects(createApplicationBackup({database:db,destination:target,passphrase,roots,offline:true}),/Database changed/);}finally{fsp.lstat=original;}
 assert.equal(changed,true);assert.equal(fs.existsSync(target),false);
});
test('application restore prepares database and files without overwriting original paths',async()=>{
 const target=path.join(root,'recovery');
 fs.writeFileSync(path.join(root,'playbooks','run.yml'),'newer original content');
 const info=await restoreApplicationBackup(path.join(root,'application.backup'),target,passphrase);
 assert.equal(info.activated,false);assert.equal(info.restored,true);
 assert.equal(fs.readFileSync(path.join(target,'files','playbooks','run.yml'),'utf8'),'synthetic-playbook\n');
 assert.equal(fs.readFileSync(path.join(root,'playbooks','run.yml'),'utf8'),'newer original content');
 assert.equal(fs.existsSync(path.join(target,'files','data','shipyard.db')),false);
 assert.equal(fs.existsSync(path.join(target,'files','data','shipyard.db-wal')),false);
 const restored=new Database(path.join(target,'database.db'),{readonly:true});
 try{assert.equal(restored.prepare('SELECT COUNT(*) AS n FROM app_settings').get().n,0);}finally{restored.close();}
 const plan=JSON.parse(fs.readFileSync(path.join(target,'recovery-plan.json'),'utf8'));
 assert.equal(plan.state,'prepared-not-activated');
 assert.equal(plan.roots.find(entry=>entry.id==='data').source,data);
 assert.equal(plan.roots.find(entry=>entry.id==='data').recovered,'files/data');
 assert.ok(fs.existsSync(path.join(target,'READY')));
 await assert.rejects(restoreApplicationBackup(path.join(root,'application.backup'),target,passphrase),{code:'EEXIST'});
 assert.ok(fs.existsSync(path.join(target,'READY')));
 const absent=path.join(root,'failed-recovery');
 await assert.rejects(restoreApplicationBackup(path.join(root,'application.backup'),absent,'wrong recovery password'),/authentication failed/);
 assert.equal(fs.existsSync(absent),false);
});
test('authenticated package with a contradictory file manifest is refused before restore',async()=>{
 const {createEncryptedSnapshot,withDecryptedArchive}=require('../services/database-backup');
 const magic=Buffer.from('SHIPYARD-APPLICATION-1\n');const altered=path.join(root,'contradictory.backup');
 await withDecryptedArchive(path.join(root,'application.backup'),passphrase,async bundle=>{
  const contents=path.join(root,'contradictory-source');await unpackRecoveryBundle(bundle,contents);
  const filename=path.join(contents,'files','manifest.json');const manifest=JSON.parse(fs.readFileSync(filename,'utf8'));
  manifest.entries.find(entry=>entry.type==='file').sha256='0'.repeat(64);
  fs.writeFileSync(filename,JSON.stringify(manifest));
  await createEncryptedSnapshot(altered,passphrase,async target=>packRecoveryBundle(contents,target),magic);
 },magic);
 await assert.rejects(verifyApplicationBackup(altered,passphrase),/manifest checksum mismatch/);
 const target=path.join(root,'contradictory-restore');await assert.rejects(restoreApplicationBackup(altered,target,passphrase),/manifest checksum mismatch/);assert.equal(fs.existsSync(target),false);
});
test('CLI application restore creates a reviewable recovery directory',()=>{
 const {execFileSync}=require('node:child_process');const target=path.join(root,'cli-recovery');
 const result=JSON.parse(execFileSync(process.execPath,[path.join(__dirname,'../cli/application-backup.js'),'restore',path.join(root,'application.backup'),target],{encoding:'utf8',env:{...process.env,SHIPYARD_BACKUP_PASSPHRASE:passphrase}}));
 assert.equal(result.restored,true);assert.equal(result.activated,false);
 assert.ok(fs.existsSync(path.join(target,'recovery-plan.json')));
 assert.equal(fs.readdirSync(root).some(name=>name.startsWith('.shipyard-application-verify-')),false);
});
test('application backup resolves configured root and database aliases without copying raw SQLite files',async()=>{
 const alias=path.join(root,'data-alias');fs.symlinkSync(data,alias);const dbAlias=path.join(root,'db-alias.sqlite');fs.symlinkSync(path.join(data,'shipyard.db'),dbAlias);
 const aliasedDb=new Database(dbAlias,{readonly:true});const archive=path.join(root,'aliased.backup');
 try{
  await assert.rejects(createApplicationBackup({database:aliasedDb,destination:path.join(alias,'recursive.backup'),passphrase,roots:[{id:'data',path:data,required:true}],offline:true}),/outside recovery roots/);
  await createApplicationBackup({database:aliasedDb,destination:archive,passphrase,roots:[{id:'data',path:alias,required:true}],offline:true});
 }finally{aliasedDb.close();}
 const target=path.join(root,'aliased-recovery');await restoreApplicationBackup(archive,target,passphrase);
 assert.equal(fs.existsSync(path.join(target,'files','data','shipyard.db')),false);
 assert.equal(fs.existsSync(path.join(target,'files','data','shipyard.db-wal')),false);
 assert.equal(fs.readFileSync(path.join(target,'files','data','state.tfstate'),'utf8'),'synthetic-state\n');
 const plan=JSON.parse(fs.readFileSync(path.join(target,'recovery-plan.json'),'utf8'));
 assert.equal(plan.roots[0].source,alias);assert.equal(plan.roots[0].resolvedSource,data);
});

test('completed encrypted application package is authenticated before publication',async()=>{
 const fsp=require('node:fs/promises');const append=fsp.appendFile;
 let changed=false;
 fsp.appendFile=async(filename,data,...args)=>{
  const result=await append(filename,data,...args);
  // Corrupt only the outer application archive authentication tag, not nested DB archives.
  if(!changed && path.basename(filename)==='encrypted'){
   const header=fs.readFileSync(filename).subarray(0,23).toString();
   if(header.startsWith('SHIPYARD-APPLICATION-1')){
    const bytes=fs.readFileSync(filename);bytes[bytes.length-1]^=1;fs.writeFileSync(filename,bytes);changed=true;
   }
  }
  return result;
 };
 const destination=path.join(root,'corrupt-before-publication.backup');
 try{await assert.rejects(createApplicationBackup({database:db,destination,passphrase,roots,offline:true}),/authentication failed/);}
 finally{fsp.appendFile=append;}
 assert.equal(changed,true);assert.equal(fs.existsSync(destination),false);
 assert.equal(fs.readdirSync(root).some(name=>name.startsWith('.shipyard-backup-')),false);
});

test('prepared recovery is compared to the authenticated archive including database, files, plan and extra members',async()=>{
 const {verifyPreparedApplicationRecovery}=require('../services/application-backup');
 const archive=path.join(root,'application.backup'),target=path.join(root,'prepared-check');
 await restoreApplicationBackup(archive,target,passphrase);
 assert.equal((await verifyPreparedApplicationRecovery(archive,target,passphrase)).preparedVerified,true);
 for(const member of ['database.db','recovery-plan.json','READY','files/playbooks/run.yml']){
  const filename=path.join(target,member),original=fs.readFileSync(filename);
  fs.appendFileSync(filename,'changed');
  await assert.rejects(verifyPreparedApplicationRecovery(archive,target,passphrase),/differs/);
  assert.ok(fs.readFileSync(filename).includes(Buffer.from('changed'))); // verification never repairs/mutates user files
  fs.writeFileSync(filename,original);
 }
 fs.writeFileSync(path.join(target,'unexpected'),'extra');
 await assert.rejects(verifyPreparedApplicationRecovery(archive,target,passphrase),/contents differ/);
 fs.unlinkSync(path.join(target,'unexpected'));
 const file=path.join(target,'files/playbooks/run.yml'),original=fs.readFileSync(file);
 fs.unlinkSync(file);fs.symlinkSync(path.join(root,'outside'),file);
 await assert.rejects(verifyPreparedApplicationRecovery(archive,target,passphrase),/type differs/);
 fs.unlinkSync(file);fs.writeFileSync(file,original,{mode:0o600});
 fs.chmodSync(file,0o644);
 await assert.rejects(verifyPreparedApplicationRecovery(archive,target,passphrase),/permissions differ/);
 fs.chmodSync(file,0o600);
 assert.equal((await verifyPreparedApplicationRecovery(archive,target,passphrase)).preparedVerified,true);
 const result=JSON.parse(require('node:child_process').execFileSync(process.execPath,[path.join(__dirname,'../cli/application-backup.js'),'verify-prepared',archive,target],{encoding:'utf8',env:{...process.env,SHIPYARD_BACKUP_PASSPHRASE:passphrase}}));
 assert.equal(result.preparedVerified,true);assert.equal(result.restored,false);assert.equal(result.activated,false);
});

test('application key CLI authenticates encrypted archived core values without exposing secrets',async()=>{
 const {execFileSync}=require('node:child_process');
 const previous=process.env.SHIPYARD_KEY_SECRET;process.env.SHIPYARD_KEY_SECRET='application-recovery-test-key';
 const archive=path.join(root,'key-check.backup');
 try{
  db.prepare('INSERT INTO app_settings VALUES (?,?)').run('synthetic-encrypted',require('../utils/crypto').encrypt('must-not-appear-in-output'));
  await createApplicationBackup({database:db,destination:archive,passphrase,roots,offline:true});
  const args=[path.join(__dirname,'../cli/application-backup.js'),'verify-key',archive];
  const env={...process.env,SHIPYARD_BACKUP_PASSPHRASE:passphrase};
  const output=execFileSync(process.execPath,args,{encoding:'utf8',env});
  assert.equal(JSON.parse(output).keyVerified,true);assert.equal(JSON.parse(output).checkedValues,1);
  assert.ok(!output.includes('must-not-appear-in-output'));assert.ok(!output.includes(process.env.SHIPYARD_KEY_SECRET));
  assert.throws(()=>execFileSync(process.execPath,args,{encoding:'utf8',env:{...env,SHIPYARD_KEY_SECRET:'wrong-key'},stdio:'pipe'}),/does not authenticate/);
 }finally{if(previous===undefined)delete process.env.SHIPYARD_KEY_SECRET;else process.env.SHIPYARD_KEY_SECRET=previous;}
});

test('key verification includes managed SSH ciphertext and rejects mixed keys without revealing content',async()=>{
 const {verifyApplicationDatabaseKey}=require('../services/application-backup');
 const previous=process.env.SHIPYARD_KEY_SECRET;process.env.SHIPYARD_KEY_SECRET='application-recovery-test-key';
 const ssh=path.join(root,'managed-ssh');fs.mkdirSync(ssh);
 const encrypted=require('../utils/crypto').encrypt('synthetic-private-key-material').slice(4);
 fs.writeFileSync(path.join(ssh,'identity.enc'),encrypted);
 const keyRoots=[...roots,{id:'ssh',path:ssh,required:true}];
 try{
  const archive=path.join(root,'ssh-key-check.backup');
  await createApplicationBackup({database:db,destination:archive,passphrase,roots:keyRoots,offline:true});
  const result=await verifyApplicationDatabaseKey(archive,passphrase,process.env.SHIPYARD_KEY_SECRET);
  assert.equal(result.keyVerified,true);assert.equal(result.checkedSshFiles,1);assert.equal(result.sshRootIncluded,true);
  assert.ok(!JSON.stringify(result).includes('synthetic-private-key-material'));
  process.env.SHIPYARD_KEY_SECRET='different-ssh-key';
  fs.writeFileSync(path.join(ssh,'identity.enc'),require('../utils/crypto').encrypt('other-private-key-material').slice(4));
  const mixed=path.join(root,'mixed-key-check.backup');
  await createApplicationBackup({database:db,destination:mixed,passphrase,roots:keyRoots,offline:true});
  await assert.rejects(verifyApplicationDatabaseKey(mixed,passphrase,'application-recovery-test-key'),/managed SSH files/);
 }finally{if(previous===undefined)delete process.env.SHIPYARD_KEY_SECRET;else process.env.SHIPYARD_KEY_SECRET=previous;}
});
