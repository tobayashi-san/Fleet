'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const fsp=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const Database=require('better-sqlite3');
const {createApplicationBackup,verifyApplicationBackup,restoreApplicationBackup}=require('../services/application-backup');
const {createEncryptedSnapshot,withDecryptedArchive}=require('../services/database-backup');
const {packRecoveryBundle,unpackRecoveryBundle}=require('../services/recovery-bundle');
const passphrase='Synthetic overlapping recovery test passphrase';
const magic=Buffer.from('FLEET-APPLICATION-1\n');
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'fleet-root-consistency-'));
 const data=path.join(root,'data'),ssh=path.join(data,'ssh');fs.mkdirSync(ssh,{recursive:true});
 fs.writeFileSync(path.join(ssh,'key'),'original synthetic key');
 const db=new Database(path.join(data,'db.sqlite'));db.exec('CREATE TABLE users(id TEXT,token_version INTEGER); CREATE TABLE app_settings(key TEXT,value TEXT); CREATE TABLE environments(id TEXT);');
 const alias=path.join(root,'ssh-alias');fs.symlinkSync(ssh,alias);
 const roots=[{id:'data',path:data,required:true},{id:'ssh',path:ssh,required:true},{id:'alias',path:alias,required:true}];
 t.after(()=>{db.close();fs.rmSync(root,{recursive:true,force:true});});
 return {root,ssh,db,roots,archive:path.join(root,'application.backup')};
}
test('overlapping directory roots and aliases restore consistent copies',async t=>{
 const {root,db,roots,archive}=fixture(t);
 await createApplicationBackup({database:db,destination:archive,passphrase,roots,offline:true});
 assert.equal((await verifyApplicationBackup(archive,passphrase)).integrity,'ok');
 await restoreApplicationBackup(archive,path.join(root,'restored'),passphrase);
 for(const name of ['data/ssh','ssh','alias'])assert.equal(fs.readFileSync(path.join(root,'restored/files',name,'key'),'utf8'),'original synthetic key');
});
test('change between overlapping root copies prevents publishing an archive',async t=>{
 const {ssh,db,roots,archive}=fixture(t);const mkdir=fsp.mkdir;let changed=false;
 fsp.mkdir=async(filename,...args)=>{
  if(!changed && String(filename).endsWith('/files/ssh')){changed=true;fs.writeFileSync(path.join(ssh,'key'),'changed synthetic key');}
  return mkdir(filename,...args);
 };
 try {await assert.rejects(createApplicationBackup({database:db,destination:archive,passphrase,roots,offline:true}),/Overlapping recovery roots disagree/);}
 finally {fsp.mkdir=mkdir;}
 assert.equal(changed,true);assert.equal(fs.existsSync(archive),false);
});
test('authenticated archive with individually valid but divergent root copies is refused before restore',async t=>{
 const {root,db,roots,archive}=fixture(t);
 await createApplicationBackup({database:db,destination:archive,passphrase,roots,offline:true});
 const altered=path.join(root,'divergent.backup');
 await withDecryptedArchive(archive,passphrase,async bundle=>{
  const contents=path.join(root,'contents');await unpackRecoveryBundle(bundle,contents);
  const payload='different but correctly hashed copy';
  fs.writeFileSync(path.join(contents,'files/ssh/key'),payload);
  const manifestPath=path.join(contents,'files/manifest.json');const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  const entry=manifest.entries.find(entry=>entry.root==='ssh' && entry.path==='key');
  entry.bytes=Buffer.byteLength(payload);entry.sha256=crypto.createHash('sha256').update(payload).digest('hex');
  fs.writeFileSync(manifestPath,JSON.stringify(manifest));
  await createEncryptedSnapshot(altered,passphrase,target=>packRecoveryBundle(contents,target),magic);
 },magic);
 await assert.rejects(verifyApplicationBackup(altered,passphrase),/Overlapping recovery roots disagree/);
 const target=path.join(root,'must-not-restore');
 await assert.rejects(restoreApplicationBackup(altered,target,passphrase),/Overlapping recovery roots disagree/);
 assert.equal(fs.existsSync(target),false);
});
