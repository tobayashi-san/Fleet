'use strict';
const {test,after}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const {spawnSync}=require('node:child_process');const Database=require('better-sqlite3');
const {recoverPendingPlaybookResets}=require('../services/reset-playbooks');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'shipyard-reset-recovery-'));
after(()=>fs.rmSync(root,{recursive:true,force:true}));
function crash(point){
 const base=fs.mkdtempSync(path.join(root,'case-'));const directory=path.join(base,'playbooks');fs.mkdirSync(directory);
 fs.writeFileSync(path.join(directory,'a.yml'),'original-a');fs.writeFileSync(path.join(directory,'b.yaml'),'original-b');
 const databasePath=path.join(base,'test.db');
 const child=spawnSync(process.execPath,[path.join(__dirname,'fixtures/reset-crash-probe.js'),databasePath,directory,point],{encoding:'utf8'});
 assert.equal(child.status,{'before-commit':91,'after-commit':92,'after-journal-cleanup':93}[point],child.stderr);
 return {databasePath,directory};
}
for(const point of ['before-commit','after-commit','after-journal-cleanup'])test(`recover an actual exited reset process at ${point}`,()=>{
 const {databasePath,directory}=crash(point);const database=new Database(databasePath);
 try{
  const results=recoverPendingPlaybookResets(directory,database);assert.equal(results.length,1);
  assert.equal(fs.readdirSync(directory).some(n=>n.startsWith('.shipyard-reset-')),false);
  assert.equal(database.prepare('SELECT COUNT(*) n FROM records').get().n,point==='before-commit'?1:0);
  if(point==='before-commit'){
   assert.equal(fs.readFileSync(path.join(directory,'a.yml'),'utf8'),'original-a');assert.equal(fs.readFileSync(path.join(directory,'b.yaml'),'utf8'),'original-b');
  }else assert.deepEqual(fs.readdirSync(directory),[]);
  assert.equal(database.prepare("SELECT COUNT(*) n FROM app_settings WHERE key LIKE 'reset_commit:%'").get().n,0);
  assert.deepEqual(recoverPendingPlaybookResets(directory,database),[]);
 }finally{database.close();}
});
test('offline recovery preserves conflicting replacement files and succeeds after explicit conflict resolution',()=>{
 const {databasePath,directory}=crash('before-commit');const database=new Database(databasePath);
 try{
  fs.writeFileSync(path.join(directory,'a.yml'),'replacement');
  assert.throws(()=>recoverPendingPlaybookResets(directory,database),/conflicts/);
  assert.equal(fs.readFileSync(path.join(directory,'a.yml'),'utf8'),'replacement');
  const staging=fs.readdirSync(directory).find(n=>n.startsWith('.shipyard-reset-'));
  assert.equal(fs.readFileSync(path.join(directory,staging,'a.yml'),'utf8'),'original-a');
  fs.renameSync(path.join(directory,'a.yml'),path.join(directory,'replacement.txt'));
  recoverPendingPlaybookResets(directory,database);assert.equal(fs.readFileSync(path.join(directory,'a.yml'),'utf8'),'original-a');
 }finally{database.close();}
});
test('changed journals fail closed and CLI requires explicit offline mode',()=>{
 const {databasePath,directory}=crash('after-commit');const database=new Database(databasePath);
 const staging=fs.readdirSync(directory).find(n=>n.startsWith('.shipyard-reset-'));const journalPath=path.join(directory,staging,'journal.json');const raw=fs.readFileSync(journalPath,'utf8');
 try{fs.writeFileSync(journalPath,raw+' ');assert.throws(()=>recoverPendingPlaybookResets(directory,database),/does not match/);}finally{database.close();fs.writeFileSync(journalPath,raw);}
 const cli=path.join(__dirname,'../cli/reset-recovery.js');
 assert.equal(spawnSync(process.execPath,[cli,databasePath,directory],{encoding:'utf8'}).status,1);
 const result=spawnSync(process.execPath,[cli,databasePath,directory,'--offline'],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/cleaned-committed-reset/);
});


test('recovery refuses a different database even when it contains the same tables',()=>{
 const {directory}=crash('before-commit');const wrong=new Database(':memory:');
 wrong.exec('CREATE TABLE app_settings (key TEXT PRIMARY KEY,value TEXT)');
 try{
  assert.throws(()=>recoverPendingPlaybookResets(directory,wrong),/different database/);
  assert.equal(fs.existsSync(path.join(directory,'a.yml')),false);
  assert.ok(fs.readdirSync(directory).some(n=>n.startsWith('.shipyard-reset-')));
 }finally{wrong.close();}
});
