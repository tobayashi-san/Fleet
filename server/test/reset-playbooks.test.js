'use strict';
const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'fleet-reset-files-'));
process.env.DB_PATH=path.join(root,'test.db');
process.env.FLEET_PLAYBOOKS_DIR=path.join(root,'playbooks');
process.env.NODE_ENV='test';
fs.mkdirSync(process.env.FLEET_PLAYBOOKS_DIR);
const db=require('../db');const resetPassword='Synthetic-reset-password';const resetHash=require('bcryptjs').hashSync(resetPassword,4);
db.users.create('synthetic-admin',null,resetHash,'admin');const scheduler=require('../services/scheduler');
const {withRemovedPlaybooks}=require('../services/reset-playbooks');
const express=require('express');const request=require('supertest');
const app=express();app.use(express.json());app.use((req,_res,next)=>{req.user=db.users.getByUsername('synthetic-admin');next();});app.use('/reset',require('../routes/reset'));
after(()=>{scheduler.shutdown();db.db.close();fs.rmSync(root,{recursive:true,force:true});});
const dir=process.env.FLEET_PLAYBOOKS_DIR;
const put=()=>{fs.writeFileSync(path.join(dir,'a.yml'),'first');fs.writeFileSync(path.join(dir,'b.yaml'),'second');fs.writeFileSync(path.join(dir,'keep.txt'),'preserved');};
const reset=async (action,approval)=>{
 const backupApproval=approval || await require('./fixtures/reset-approval')({app,database:db.db,action,scope:'all-environments',password:resetPassword});
 return request(app).delete(`/reset/${action}`).send({scope:'all-environments',password:resetPassword,backupApproval,confirmation:action==='all'?'RESET HOSTS SCHEDULES AND ACCOUNTS':'DELETE PLAYBOOKS'});
};
function originals(){assert.equal(fs.readFileSync(path.join(dir,'a.yml'),'utf8'),'first');assert.equal(fs.readFileSync(path.join(dir,'b.yaml'),'utf8'),'second');assert.equal(fs.readdirSync(dir).some(n=>n.startsWith('.fleet-reset-')),false);}

test('file staging failure restores earlier files without invoking the database callback',()=>{
 put();const rename=fs.renameSync;let calls=0,committed=false;
 fs.renameSync=(...args)=>{if(++calls===2)throw Error('synthetic rename failure');return rename(...args);};
 try{assert.throws(()=>withRemovedPlaybooks(dir,()=>{committed=true;},db.db),/synthetic/);}finally{fs.renameSync=rename;}
 assert.equal(committed,false);originals();
});

test('configured playbook reset rolls back files on audit failure and preserves unrelated files on retry',async()=>{
 put();db.db.exec("CREATE TRIGGER fail_reset BEFORE INSERT ON audit_log BEGIN SELECT RAISE(ABORT,'synthetic audit failure'); END");
 try{assert.equal((await reset('playbooks')).status,500);originals();}finally{db.db.exec('DROP TRIGGER fail_reset');}
 assert.equal((await reset('playbooks')).status,200);
 assert.deepEqual(fs.readdirSync(dir),['keep.txt']);
});

test('combined reset rolls back late DB failure, then clears schedules and cancels cron tasks across environments',async()=>{
 put();
 db.settings.set('onboarding_done','1');db.settings.set('wl_app_name','Keep until committed');
 db.db.prepare('INSERT INTO environments (id,name) VALUES (?,?)').run('other','Other');
 const hosts=['default','other'].map(environment_id=>db.servers.create({name:environment_id,hostname:environment_id,ip_address:'192.0.2.1',environment_id}));
 const ids=['default','other'].map(environmentId=>{
  const id=db.schedules.create('Never run','a.yml','all','0 0 1 1 *',{environmentId});
  scheduler.register(db.schedules.getById(id));
  db.db.prepare('INSERT INTO schedule_history (id,schedule_id,environment_id,schedule_name,playbook) VALUES (?,?,?,?,?)').run(id,id,environmentId,'Never run','a.yml');return id;
 });
 db.db.exec("CREATE TRIGGER fail_reset BEFORE INSERT ON audit_log WHEN NEW.action='reset.all' BEGIN SELECT RAISE(ABORT,'synthetic audit failure'); END");
 try{
  assert.equal((await reset('all')).status,500);originals();
  assert.equal(db.users.count(),1);assert.equal(db.settings.get('wl_app_name'),'Keep until committed');
  for(const host of hosts)assert.ok(db.servers.getById(host.id));
  for(const id of ids){assert.ok(db.schedules.getById(id));assert.ok(scheduler.getNextRun(id));}
  assert.equal(db.db.prepare('SELECT COUNT(*) n FROM schedule_history').get().n,2);
 }finally{db.db.exec('DROP TRIGGER fail_reset');}
 assert.equal((await reset('all')).status,200);
 assert.equal(db.users.count(),0);assert.equal(db.settings.get('onboarding_done'),'');
 assert.equal(db.db.prepare('SELECT COUNT(*) n FROM schedule_history').get().n,0);
 for(const host of hosts)assert.equal(db.servers.getById(host.id),undefined);
 for(const id of ids)assert.equal(scheduler.getNextRun(id),null);
 assert.deepEqual(fs.readdirSync(dir),['keep.txt']);
 assert.match(db.db.prepare("SELECT detail FROM audit_log WHERE action='reset.all'").get().detail,/Combined reset/);
});

test('post-commit cleanup failure returns success with warning and preserves private staging for cleanup',async()=>{
 put();db.users.create('synthetic-admin',null,resetHash,'admin');const rm=fs.rmdirSync;
 fs.rmdirSync=(target,...args)=>{if(String(target).includes('.fleet-reset-'))throw Error('synthetic cleanup failure');return rm(target,...args);};
 let response;
 try{response=await reset('playbooks');}finally{fs.rmdirSync=rm;}
 assert.equal(response.status,200);assert.equal(response.body.success,true);assert.match(response.body.warning,/cleanup|clean up/);
 const stage=fs.readdirSync(dir).find(n=>n.startsWith('.fleet-reset-'));assert.ok(stage);
 assert.equal(fs.statSync(path.join(dir,stage)).mode&0o777,0o700);
 assert.equal(fs.readdirSync(path.join(dir,stage)).length,0);
 fs.rmSync(path.join(dir,stage),{recursive:true});
});

test('linked playbooks are refused before files or DB are changed',()=>{
 put();fs.symlinkSync(path.join(dir,'keep.txt'),path.join(dir,'linked.yml'));let called=false;
 try{assert.throws(()=>withRemovedPlaybooks(dir,()=>{called=true;},db.db),/regular/);assert.equal(called,false);originals();}finally{fs.unlinkSync(path.join(dir,'linked.yml'));}
});

test('pending recovery returns actionable conflict for both file-reset endpoints without changing data',async()=>{
 put();const approvals={};
 for(const action of ['playbooks','all']) approvals[action]=await require('./fixtures/reset-approval')({app,database:db.db,action,scope:'all-environments',password:resetPassword});
 const pending=path.join(dir,'.fleet-reset-incomplete');fs.mkdirSync(pending);
 const before=db.db.prepare('SELECT * FROM users ORDER BY id').all();
 const auditCount=db.db.prepare('SELECT COUNT(*) n FROM audit_log').get().n;
 try{
  for(const action of ['playbooks','all']){
   const result=await reset(action,approvals[action]);assert.equal(result.status,409);assert.equal(result.body.field,'recovery');assert.match(result.body.error,/offline recovery/);assert.match(result.body.error,/Preserve/);
   assert.equal(result.body.error.includes(root),false);
  }
  assert.deepEqual(db.db.prepare('SELECT * FROM users ORDER BY id').all(),before);
  assert.equal(db.db.prepare('SELECT COUNT(*) n FROM audit_log').get().n,auditCount);
  assert.equal(fs.readFileSync(path.join(dir,'a.yml'),'utf8'),'first');
 }finally{fs.rmdirSync(pending);}
});

test('incomplete rollback returns recovery guidance and preserves files for the offline procedure',async()=>{
 put();const link=fs.linkSync;
 db.db.exec("CREATE TRIGGER fail_reset BEFORE INSERT ON audit_log BEGIN SELECT RAISE(ABORT,'synthetic failure'); END");
 fs.linkSync=()=>{throw Error('synthetic rollback failure');};
 let result;
 try{result=await reset('playbooks');}finally{fs.linkSync=link;db.db.exec('DROP TRIGGER fail_reset');}
 assert.equal(result.status,409);assert.equal(result.body.field,'recovery');
 const staging=fs.readdirSync(dir).find(name=>name.startsWith('.fleet-reset-'));assert.ok(staging);
 assert.equal(fs.readFileSync(path.join(dir,staging,'a.yml'),'utf8'),'first');
 require('../services/reset-playbooks').recoverPendingPlaybookResets(dir,db.db);
 originals();
});

test('combined reset retains both post-commit cleanup warnings and continues scheduler cleanup',async()=>{
 put();
 const ids=[0,1].map(()=>db.schedules.create('Never run','a.yml','all','0 0 1 1 *'));
 const unregister=scheduler.unregister,rm=fs.rmdirSync;const attempted=[];
 scheduler.unregister=id=>{attempted.push(id);if(id===ids[0])throw Error('synthetic scheduler cleanup failure');return unregister(id);};
 fs.rmdirSync=(target,...args)=>{if(String(target).includes('.fleet-reset-'))throw Error('synthetic staging cleanup failure');return rm(target,...args);};
 let result;
 try{result=await reset('all');}finally{scheduler.unregister=unregister;fs.rmdirSync=rm;}
 assert.equal(result.status,200);assert.equal(result.body.success,true);
 assert.match(result.body.warning,/private playbook staging/);
 assert.match(result.body.warning,/scheduler registrations/);
 assert.ok(ids.every(id=>attempted.includes(id)));
 assert.equal(db.users.count(),0);
 assert.equal(db.db.prepare('SELECT COUNT(*) n FROM schedules').get().n,0);
 require('../services/reset-playbooks').recoverPendingPlaybookResets(dir,db.db);
});
