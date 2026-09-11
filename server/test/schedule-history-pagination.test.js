const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'shipyard-history-pages-'));
process.env.DB_PATH=path.join(root,'test.db');process.env.NODE_ENV='test';
const db=require('../db');const express=require('express');const request=require('supertest');
const app=express();app.use((req,res,next)=>{req.user={role:req.headers['x-role']||'admin'};next();});app.use('/history',require('../routes/schedule-history'));
after(()=>{db.db.close();fs.rmSync(root,{recursive:true,force:true});});
const role=db.roles.create('Limited',{canViewSchedules:true,servers:'all',playbooks:['allowed.yml']});
const insert=db.db.prepare('INSERT INTO schedule_history(id,environment_id,schedule_name,playbook,status,started_at) VALUES(?,?,?,?,?,?)');
for(let i=0;i<130;i++)insert.run(`allowed-${i}`,'default','Allowed','allowed.yml','skipped','2026-01-01 00:00:00');
for(let i=0;i<30;i++)insert.run(`hidden-${i}`,'default','Hidden','hidden.yml','skipped','2026-01-01 00:00:00');
insert.run('other','other','Other','allowed.yml','skipped','2026-01-01 00:00:00');
insert.run('failed','default','Failed','allowed.yml','failed','2026-01-01 00:00:00');
test('pagination filters permission and status before counting; older rows and tied timestamps remain reachable',async()=>{
 const ids=[];
 for(let page=1;page<=6;page++){
  const response=await request(app).get(`/history?page=${page}&status=skipped`).set('x-role',role.id);
  assert.equal(response.status,200);assert.equal(response.body.total,130);
  assert.equal(response.body.items.length,page===6?5:25);
  ids.push(...response.body.items.map(row=>row.id));
 }
 assert.equal(new Set(ids).size,130);assert.ok(ids.includes('allowed-0'));assert.ok(!ids.includes('other'));
 const failed=await request(app).get('/history?page=1&status=failed').set('x-role',role.id);
 assert.deepEqual(failed.body.items.map(row=>row.id),['failed']);
 const admin=await request(app).get('/history?page=1&status=skipped');assert.equal(admin.body.total,160);
});
test('legacy array API remains compatible and invalid paging/filter values are rejected',async()=>{
 const legacy=await request(app).get('/history?limit=2');assert.equal(legacy.body.length,2);
 for(const query of ['page=0','page=-1','page=1.5','page=no','status=not-real'])assert.equal((await request(app).get(`/history?${query}`)).status,400);
 const denied=await request(app).get('/history?page=1').set('x-role','missing');assert.equal(denied.status,403);
});

test('history filters include deleted schedule identities without exposing inaccessible names',async()=>{
 const id=db.schedules.create('Current name','allowed.yml','all','0 0 1 1 *');
 const historyId=db.scheduleHistory.create(id,'Historical name','allowed.yml','all');
 db.scheduleHistory.complete(historyId,'success','');db.schedules.delete(id);
 const hiddenId=db.scheduleHistory.create('private-schedule','Private schedule name','hidden.yml','all');
 db.scheduleHistory.complete(hiddenId,'success','');
 const response=await request(app).get('/history?page=1&status=skipped').set('x-role',role.id);
 assert.equal(response.status,200);
 assert.deepEqual(response.body.schedules,[{id,name:'Historical name',deleted:true}]);
 assert.ok(!JSON.stringify(response.body).includes('Private schedule name'));
 const filtered=await request(app).get(`/history?page=1&scheduleId=${id}`).set('x-role',role.id);
 assert.equal(filtered.body.total,1);assert.equal(filtered.body.items[0].id,historyId);
 assert.deepEqual(filtered.body.schedules,response.body.schedules);
});
