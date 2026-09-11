'use strict';
const {test,after}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const os=require('node:os');const crypto=require('node:crypto');const Database=require('better-sqlite3');
const {recoveryRoots,stageRecoveryFiles}=require('../services/recovery-files');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'shipyard-recovery-files-'));const source=path.join(root,'source');fs.mkdirSync(source);fs.mkdirSync(path.join(source,'nested'));
fs.writeFileSync(path.join(source,'nested','playbook.yml'),'fixture: true\n');fs.writeFileSync(path.join(source,'exclude.db'),'not a live DB snapshot');fs.symlinkSync('nested/playbook.yml',path.join(source,'local-link'));
after(()=>fs.rmSync(root,{recursive:true,force:true}));
test('staging preserves file contents, empty directories and internal links with a hash manifest',async()=>{
 fs.mkdirSync(path.join(source,'empty'));
 const target=path.join(root,'stage');
 const manifest=await stageRecoveryFiles([{id:'playbooks',path:source,required:true}],target,[path.join(source,'exclude.db')]);
 const file=manifest.entries.find(entry=>entry.path==='nested/playbook.yml');
 assert.equal(file.sha256,crypto.createHash('sha256').update('fixture: true\n').digest('hex'));
 assert.equal(fs.readFileSync(path.join(target,'playbooks','nested','playbook.yml'),'utf8'),'fixture: true\n');
 assert.equal(fs.statSync(target).mode & 0o777,0o700);
 assert.equal(fs.readlinkSync(path.join(target,'playbooks','local-link')),'nested/playbook.yml');
 assert.equal(fs.existsSync(path.join(target,'playbooks','exclude.db')),false);
 assert.ok(fs.statSync(path.join(target,'playbooks','empty')).isDirectory());
 assert.deepEqual(JSON.parse(fs.readFileSync(path.join(target,'manifest.json'),'utf8')),manifest);
});
test('required missing roots and escaping links abort and clean staging without changing sources',async()=>{
 const missing=path.join(root,'missing-stage');
 await assert.rejects(stageRecoveryFiles([{id:'required',path:path.join(root,'absent'),required:true}],missing),{code:'ENOENT'});
 assert.equal(fs.existsSync(missing),false);
 fs.symlinkSync('../outside',path.join(source,'escape'));
 const target=path.join(root,'unsafe-stage');
 try {await assert.rejects(stageRecoveryFiles([{id:'files',path:source}],target),/escapes root/);} finally {fs.unlinkSync(path.join(source,'escape'));}
 assert.equal(fs.existsSync(target),false);
 assert.equal(fs.readFileSync(path.join(source,'nested','playbook.yml'),'utf8'),'fixture: true\n');
});
test('optional missing roots are explicit and staging cannot overwrite or recurse into sources',async()=>{
 const target=path.join(root,'optional');const manifest=await stageRecoveryFiles([{id:'unused',path:path.join(root,'absent')}],target);
 assert.equal(manifest.roots[0].status,'absent');
 await assert.rejects(stageRecoveryFiles([],target),{code:'EEXIST'});
 await assert.rejects(stageRecoveryFiles([{id:'files',path:source}],path.join(source,'stage')),/outside source roots/);
});
test('recovery root discovery includes configured paths and each registered infrastructure workspace',()=>{
 const db=new Database(':memory:');db.exec('CREATE TABLE tofu_workspaces(id TEXT,path TEXT)');db.prepare('INSERT INTO tofu_workspaces VALUES (?,?)').run('workspace-id',path.join(root,'workspace'));
 try {
  const roots=recoveryRoots(db,{SHIPYARD_PLAYBOOKS_DIR:source,PLUGINS_DIR:path.join(root,'plugins'),SHIPYARD_SSH_DIR:path.join(root,'ssh'),SSL_CERT:path.join(root,'cert.pem')});
  assert.equal(roots.find(row=>row.id==='playbooks').path,source);
  assert.equal(roots.find(row=>row.id==='plugins').required,true);
  assert.ok(roots.some(row=>row.path===path.join(root,'workspace') && row.required));
  assert.ok(roots.some(row=>row.id==='tls-cert'));
 } finally {db.close();}
});
test('a file changed during its read aborts staging and removes the partial copy',async()=>{
 const changing=path.join(root,'changing');fs.mkdirSync(changing);const file=path.join(changing,'state.json');fs.writeFileSync(file,'x'.repeat(128*1024));
 const fsp=require('node:fs/promises');const originalOpen=fsp.open;
 fsp.open=async(...args)=>{
  const handle=await originalOpen(...args);
  if(args[0]===file){const originalStream=handle.createReadStream.bind(handle);handle.createReadStream=options=>{const stream=originalStream(options);stream.once('data',()=>fs.appendFileSync(file,'changed'));return stream;};}
  return handle;
 };
 const target=path.join(root,'changed-stage');
 try {await assert.rejects(stageRecoveryFiles([{id:'state',path:changing}],target),/changed during recovery staging/);} finally {fsp.open=originalOpen;}
 assert.equal(fs.existsSync(target),false);
});
test('configured directory and file symlink roots capture their explicit targets and record both paths',async()=>{
 const alias=path.join(root,'source-alias');fs.symlinkSync(source,alias);
 const fileAlias=path.join(root,'cert-alias');fs.symlinkSync(path.join(source,'nested','playbook.yml'),fileAlias);
 const target=path.join(root,'alias-stage');
 const manifest=await stageRecoveryFiles([{id:'directory',path:alias,required:true},{id:'certificate',path:fileAlias,required:true}],target);
 assert.equal(manifest.roots[0].source,alias);assert.equal(manifest.roots[0].resolvedSource,source);
 assert.equal(fs.readFileSync(path.join(target,'directory','nested','playbook.yml'),'utf8'),'fixture: true\n');
 assert.equal(fs.lstatSync(path.join(target,'certificate')).isFile(),true);
 assert.equal(manifest.roots[1].resolvedSource,path.join(source,'nested','playbook.yml'));
});
test('physical destination aliases cannot bypass source recursion checks and exclusions resolve aliases',async()=>{
 const alias=path.join(root,'source-alias');
 await assert.rejects(stageRecoveryFiles([{id:'source',path:source}],path.join(alias,'recursive-stage')),/outside source roots/);
 const exclusion=path.join(root,'db-alias');fs.symlinkSync(path.join(source,'exclude.db'),exclusion);
 const target=path.join(root,'excluded-alias-stage');await stageRecoveryFiles([{id:'source',path:alias}],target,[exclusion]);
 assert.equal(fs.existsSync(path.join(target,'source','exclude.db')),false);
});
test('retargeting a configured root during capture aborts and removes partial output',async()=>{
 const alias=path.join(root,'retarget-alias');const other=path.join(root,'retarget-other');fs.mkdirSync(other);fs.symlinkSync(source,alias);
 const fsp=require('node:fs/promises');const original=fsp.open;let changed=false;
 fsp.open=async(...args)=>{const handle=await original(...args);if(!changed && args[0]===path.join(source,'nested','playbook.yml')){changed=true;fs.unlinkSync(alias);fs.symlinkSync(other,alias);}return handle;};
 const target=path.join(root,'retarget-stage');
 try{await assert.rejects(stageRecoveryFiles([{id:'source',path:alias,required:true}],target),/root changed/);}finally{fsp.open=original;}
 assert.equal(changed,true);assert.equal(fs.existsSync(target),false);
});
