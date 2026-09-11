const {test,after}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'workflow-retention-'));process.env.DB_PATH=path.join(root,'test.db');process.env.NODE_ENV='test';const db=require('../db');
after(()=>{db.db.close();fs.rmSync(root,{recursive:true,force:true});});
test('workflow cleanup retains active/unknown runs and 200 terminal runs independently per environment',()=>{
 db.db.transaction(()=>{
  const insert=db.db.prepare('INSERT INTO schedule_history(id,environment_id,schedule_name,playbook,targets,status,started_at,completed_at) VALUES(?,?,?,?,?,?,?,?)');
  for(const env of ['default','stage'])for(let i=0;i<205;i++)insert.run(`${env}-${i}`,env,'Retention','update.yml','host',['success','failed','skipped'][i%3],'2026-01-01 00:00:00',new Date(Date.UTC(2026,0,1,0,i)).toISOString());
  for(let i=0;i<250;i++)insert.run(`active-${i}`,'default','Active','update.yml','host',i%2?'queued':'running','2000-01-01 00:00:00',null);
  insert.run('unknown','default','Unknown','update.yml','host','unknown','1999-01-01 00:00:00',null);
 })();
 const result=db.scheduleHistory.prune();assert.equal(result.changes,10);
 for(const env of ['default','stage']){
  assert.equal(db.db.prepare("SELECT count(*) n FROM schedule_history WHERE environment_id=? AND status IN ('success','failed','skipped')").get(env).n,200);
  assert.equal(db.scheduleHistory.getById(`${env}-0`),undefined);assert.ok(db.scheduleHistory.getById(`${env}-204`));
 }
 assert.equal(db.db.prepare("SELECT count(*) n FROM schedule_history WHERE status IN ('running','queued')").get().n,250);
 assert.ok(db.scheduleHistory.getById('unknown'));assert.equal(db.scheduleHistory.prune().changes,0);
});
