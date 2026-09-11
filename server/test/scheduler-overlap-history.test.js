'use strict';
const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'shipyard-overlap-'));
process.env.DB_PATH=path.join(root,'test.db');
process.env.NODE_ENV='test';
const db=require('../db');
const scheduler=require('../services/scheduler');
const cron=require('node-cron');
const runner=require('../services/ansible-runner');
const git=require('../services/git-sync');
after(()=>{scheduler.shutdown();db.db.close();fs.rmSync(root,{recursive:true,force:true});});

test('overlapping occurrences are durable skipped entries without changing the active execution',async()=>{
 const originalCreate=cron.createTask,originalRun=runner.runPlaybook,originalPull=git.autoPull;
 let callback,release,started;
 const entered=new Promise(resolve=>{started=resolve;});
 const completion=new Promise(resolve=>{release=resolve;});
 let calls=0;
 cron.createTask=(_expression,run)=>{callback=run;return{timeMatcher:{},start(){},destroy(){}};};
 git.autoPull=async()=>{};
 runner.runPlaybook=async()=>{calls++;started();await completion;return{success:true};};
 const id=db.schedules.create('Overlap test','synthetic.yml','all','0 0 1 1 *');
 let first;
 try{
  scheduler.register(db.schedules.getById(id));
  first=callback();await entered;
  await callback();
  let rows=db.scheduleHistory.getAll(100,id,'default');
  assert.equal(rows.length,2);
  const active=rows.find(row=>row.status==='running');
  const skipped=rows.find(row=>row.status==='skipped');
  assert.ok(active);assert.ok(skipped);assert.ok(skipped.completed_at);
  assert.match(db.scheduleHistory.getById(skipped.id).output,/previous execution.*still running/);
  assert.equal(db.schedules.getById(id).last_run,null);
  assert.equal(calls,1);
  // Recording failure rolls back the complete skip entry; it cannot poison the active run.
  db.db.exec("CREATE TRIGGER reject_skip BEFORE UPDATE ON schedule_history WHEN NEW.status='skipped' BEGIN SELECT RAISE(ABORT,'synthetic journal failure'); END");
  await assert.rejects(callback(),/synthetic journal failure/);
  db.db.exec('DROP TRIGGER reject_skip');
  assert.equal(db.scheduleHistory.getAll(100,id).length,2);
  release();await first;
  assert.equal(db.scheduleHistory.getById(active.id).status,'success');
  assert.equal(db.scheduleHistory.getById(skipped.id).status,'skipped');
  assert.equal(db.schedules.getById(id).last_status,'success');
 }finally{
  release();if(first)await first;
  scheduler.unregister(id);cron.createTask=originalCreate;runner.runPlaybook=originalRun;git.autoPull=originalPull;
 }
});
