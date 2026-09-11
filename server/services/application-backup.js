'use strict';
const fs=require('node:fs/promises');const path=require('node:path');const os=require('node:os');
const {createEncryptedSnapshot,withDecryptedArchive,withVerifiedDatabaseBackup,createEncryptedDatabaseBackup,verifyEncryptedDatabaseBackup,restoreEncryptedDatabaseBackup}=require('./database-backup');
const {recoveryRoots,stageRecoveryFiles}=require('./recovery-files');
const {packRecoveryBundle,unpackRecoveryBundle,safePath}=require('./recovery-bundle');
const {verifyRecoveryRootConsistency}=require('./recovery-root-consistency');
const MAGIC=Buffer.from('SHIPYARD-APPLICATION-1\n');
function version(database){return `${database.pragma('data_version',{simple:true})}:${database.prepare('SELECT total_changes() AS n').get().n}`;}
async function createApplicationBackup({database,destination,passphrase,roots=recoveryRoots(database),offline=false}){
 if(!offline)throw Error('Application backup requires stopped application and filesystem writers');
 const physicalDestination=path.join(await fs.realpath(path.dirname(path.resolve(destination))),path.basename(destination));
 for(const root of roots){
  let source=path.resolve(root.path);
  try{source=await fs.realpath(source);}catch(error){if(error.code!=='ENOENT' || root.required)throw error;}
  const relative=path.relative(source,physicalDestination);
  if(relative==='' || (!relative.startsWith(`..${path.sep}`) && relative!=='..' && !path.isAbsolute(relative)))throw Error('Application backup destination must be outside recovery roots');
 }
 const result=await createEncryptedSnapshot(destination,passphrase,async bundle=>{
  const dir=await fs.mkdtemp(path.join(path.dirname(bundle),'application-'));
  try {
   const before=version(database);
   await createEncryptedDatabaseBackup(database,path.join(dir,'database.backup'),passphrase);
   const dbPath=database.name && database.name!==':memory:' ? await fs.realpath(database.name) : null;
   const excluded=dbPath ? ['', '-wal','-shm','-journal'].map(suffix=>dbPath+suffix) : [];
   const files=await stageRecoveryFiles(roots,path.join(dir,'files'),excluded);
   await verifyRecoveryRootConsistency(path.join(dir,'files'),files.roots);
   if(before!==version(database))throw Error('Database changed during application backup; stop all writers and retry');
   const manifest={format:'shipyard-application',version:1,applicationVersion:require('../package.json').version,createdAt:new Date().toISOString(),database:'database.backup',files:'files/manifest.json',consistency:'requires-stopped-writers',externalRequirements:['original SHIPYARD_KEY_SECRET','deployment configuration and external JWT_SECRET','remote workload backups'],roots:files.roots};
   await fs.writeFile(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,2),{mode:0o600,flag:'wx'});
   const result=await packRecoveryBundle(dir,bundle);
   return {...result,scope:'application-database-and-files',roots:files.roots.length};
  } finally {await fs.rm(dir,{recursive:true,force:true});}
 },MAGIC,archive=>verifyApplicationBackup(archive,passphrase));
 return {...result,verified:true};
}
async function readManifest(filename) {
 const stat=await fs.lstat(filename);
 if(!stat.isFile() || stat.size>64*1024*1024)throw Error('Invalid or oversized recovery manifest');
 return JSON.parse(await fs.readFile(filename,'utf8'));
}
function validateFileManifest(manifest,files,members) {
 if(files.version!==1 || files.scope!=='application-files' || !Array.isArray(files.roots) || !Array.isArray(files.entries) || !Array.isArray(manifest.roots))throw Error('Invalid recovery file manifest');
 const roots=new Map();
 for(const root of files.roots){
  if(!/^[a-z0-9-]+$/.test(root.id) || roots.has(root.id) || typeof root.source!=='string' || !path.isAbsolute(root.source) || !['included','absent'].includes(root.status) || (root.resolvedSource!==undefined && (typeof root.resolvedSource!=='string' || !path.isAbsolute(root.resolvedSource))))throw Error('Invalid recovery root manifest');
  roots.set(root.id,root);
 }
 if(manifest.roots.length!==roots.size)throw Error('Recovery root manifests disagree');
 const compared=new Set();
 for(const root of manifest.roots){const other=roots.get(root.id);if(!other || compared.has(root.id) || other.source!==root.source || other.status!==root.status || other.resolvedSource!==root.resolvedSource)throw Error('Recovery root manifests disagree');compared.add(root.id);}
 const expected=new Set(['manifest.json','database.backup','files','files/manifest.json']);
 if(members.get('files')?.type!=='directory')throw Error('Missing recovery files directory');
 for(const entry of files.entries){
  if(roots.get(entry.root)?.status!=='included' || !(entry.path==='' || safePath(entry.path)) || !Number.isInteger(entry.mode) || entry.mode<0 || entry.mode>0o777)throw Error('Invalid recovery file entry');
  const name=`files/${entry.root}${entry.path ? '/'+entry.path : ''}`;
  const actual=members.get(name);
  if(expected.has(name) || !actual || actual.type!==entry.type)throw Error('Recovery file manifest does not match package');
  if(entry.type==='file' && (actual.bytes!==entry.bytes || actual.sha256!==entry.sha256))throw Error('Recovery manifest checksum mismatch');
  if(entry.type==='symlink' && actual.target!==entry.target)throw Error('Recovery manifest link mismatch');
  expected.add(name);
 }
 for(const root of roots.values())if(root.status==='included' && !expected.has(`files/${root.id}`))throw Error('Recovery root is missing');
 if(expected.size!==members.size || [...members.keys()].some(name=>!expected.has(name)))throw Error('Unlisted recovery package members');
}
async function withVerifiedApplicationBackup(filename,passphrase,callback,parent=os.tmpdir()){
 return withDecryptedArchive(filename,passphrase,async bundle=>{
  const dir=await fs.mkdtemp(path.join(parent,'.shipyard-application-verify-'));
  try {
   const target=path.join(dir,'contents');
   const result=await unpackRecoveryBundle(bundle,target);
   for(const filename of ['manifest.json','database.backup','files/manifest.json'])if(result.members.get(filename)?.type!=='file')throw Error('Recovery package manifest members must be regular files');
   const manifest=await readManifest(path.join(target,'manifest.json'));
   if(manifest.format!=='shipyard-application' || manifest.version!==1 || manifest.database!=='database.backup' || manifest.files!=='files/manifest.json' || typeof manifest.applicationVersion!=='string' || manifest.applicationVersion.length>100)throw Error('Invalid application recovery manifest');
   const files=await readManifest(path.join(target,'files','manifest.json'));
   validateFileManifest(manifest,files,result.members);
   await verifyRecoveryRootConsistency(path.join(target,'files'),files.roots);
   const database=await verifyEncryptedDatabaseBackup(path.join(target,'database.backup'),passphrase);
   const info={entries:result.entries,scope:'application-database-and-files',integrity:database.integrity,applicationVersion:manifest.applicationVersion,createdAt:manifest.createdAt};
   return await callback(target,manifest,info);
  } finally {await fs.rm(dir,{recursive:true,force:true});}
 },MAGIC);
}
function verifyApplicationBackup(filename,passphrase){return withVerifiedApplicationBackup(filename,passphrase,(_target,_manifest,info)=>info);}
async function restoreApplicationBackup(filename,destination,passphrase){
 const target=path.resolve(destination);
 return withVerifiedApplicationBackup(filename,passphrase,async(contents,manifest,info)=>{
  await restoreEncryptedDatabaseBackup(path.join(contents,'database.backup'),path.join(contents,'database.db'),passphrase);
  await fs.mkdir(target,{mode:0o700}); // Ownership starts only after exclusive creation succeeds.
  try {
   await fs.rename(path.join(contents,'database.db'),path.join(target,'database.db'));
   await fs.rename(path.join(contents,'files'),path.join(target,'files'));
   const plan={version:1,state:'prepared-not-activated',applicationVersion:manifest.applicationVersion,database:'database.db',roots:manifest.roots.map(root=>({...root,recovered:root.status==='included' ? `files/${root.id}` : null})),requires:['original application encryption key','deployment configuration','stopped writers and target-path review before activation']};
   await fs.writeFile(path.join(target,'recovery-plan.json'),JSON.stringify(plan,null,2),{mode:0o600,flag:'wx'});
   await fs.writeFile(path.join(target,'READY'),'Prepared recovery files; not activated.\n',{mode:0o600,flag:'wx'});
   return {...info,restored:true,activated:false,versionedSessionsInvalidated:true};
  } catch(error){await fs.rm(target,{recursive:true,force:true});throw error;}
 },path.dirname(target));
}
async function verifyPreparedApplicationRecovery(filename,destination,passphrase) {
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'shipyard-recovery-comparison-'));
 try {
  const expected=path.join(dir,'expected');
  const info=await restoreApplicationBackup(filename,expected,passphrase);
  await require('./compare-recovery-tree').compareRecoveryTree(expected,path.resolve(destination));
  return {...info,restored:false,preparedVerified:true,activated:false};
 } finally {await fs.rm(dir,{recursive:true,force:true});}
}
async function verifyApplicationDatabaseKey(filename,passphrase,secret) {
 return withVerifiedApplicationBackup(filename,passphrase,async(contents)=>{
  const database=await withVerifiedDatabaseBackup(path.join(contents,'database.backup'),passphrase,snapshot=>
   require('./recovery-database-key').verifyRecoveryDatabaseKey(snapshot,secret));
  const files=await readManifest(path.join(contents,'files','manifest.json'));
  const sshRootIncluded=files.roots.some(root=>root.id==='ssh' && root.status==='included');
  const keys=files.entries.filter(entry=>entry.root==='ssh' && entry.type==='file' && entry.path.endsWith('.enc'));
  for(const entry of keys){
   if(entry.bytes>1024*1024)throw Error('Encrypted managed SSH file exceeds verification size limit');
   const handle=await fs.open(path.join(contents,'files','ssh',entry.path),require('node:fs').constants.O_RDONLY | require('node:fs').constants.O_NOFOLLOW);
   try {
    const encoded=await handle.readFile('utf8');
    try { require('./recovery-ciphertext').authenticateRecoveryCiphertext(encoded,secret); }
    catch { throw Error('Application key does not authenticate all encrypted managed SSH files; the key may be wrong or stored ciphertext damaged'); }
   } finally {await handle.close();}
  }
  return {...database,scope:'core-database-and-managed-ssh-encrypted-values',checkedSshFiles:keys.length,sshRootIncluded,keyVerified:database.checkedValues+keys.length>0};
 });
}

module.exports={verifyApplicationDatabaseKey,createApplicationBackup,verifyApplicationBackup,withVerifiedApplicationBackup,restoreApplicationBackup,verifyPreparedApplicationRecovery};
