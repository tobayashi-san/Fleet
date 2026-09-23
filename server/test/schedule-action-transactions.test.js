'use strict';
const {test,after}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'fleet-schedule-transactions-'));
process.env.DB_PATH=path.join(root,'test.db');process.env.NODE_ENV='test';
const db=require('../db');const scheduler=require('../services/scheduler');
const express=require('express');const request=require('supertest');
const app=express();app.use(express.json());app.use((req,res,next)=>{req.user={role:'admin',username:'administrator'};req.environmentId='default';next();});app.use('/schedules',require('../routes/schedules'));app.use((error,req,res,next)=>res.status(500).json({error:error.message}));
after(()=>{scheduler.shutdown();db.db.close();fs.rmSync(root,{recursive:true,force:true});});
const payload={name:'Synthetic schedule',playbook:'synthetic.yml',targets:'all',cronExpression:'0 0 1 1 *'};
const rejectAudit=()=>db.db.exec("CREATE TRIGGER reject_schedule_audit BEFORE INSERT ON audit_log BEGIN SELECT RAISE(ABORT,'synthetic audit failure'); END");
const allowAudit=()=>db.db.exec('DROP TRIGGER reject_schedule_audit');
test('failed creation audit leaves no schedule or runtime registration',async()=>{
 const original=scheduler.reload;let calls=0;scheduler.reload=()=>{calls++;};
 rejectAudit();try{assert.equal((await request(app).post('/schedules').send(payload)).status,500);assert.equal(db.schedules.getAll().length,0);assert.equal(calls,0);}finally{allowAudit();scheduler.reload=original;}
});
test('failed update, toggle and deletion audit preserve stored schedule and real cron registration',async()=>{
 const response=await request(app).post('/schedules').send(payload);assert.equal(response.status,200);const id=response.body.id;
 const original=db.schedules.getById(id);const next=scheduler.getNextRun(id);assert.ok(next);
 for(const action of ['update','toggle','delete']){
  rejectAudit();try{
   const response=action==='update'?await request(app).put(`/schedules/${id}`).send({name:'Changed',cronExpression:'0 1 1 1 *'}):action==='toggle'?await request(app).post(`/schedules/${id}/toggle`):await request(app).delete(`/schedules/${id}`);
   assert.equal(response.status,500);assert.deepEqual(db.schedules.getById(id),original);assert.equal(scheduler.getNextRun(id),next);
   assert.equal(db.db.prepare("SELECT COUNT(*) n FROM audit_log WHERE action=?").get(`schedule.${action}`).n,0);
  }finally{allowAudit();}
 }
 assert.equal((await request(app).post(`/schedules/${id}/toggle`)).status,200);assert.equal(scheduler.getNextRun(id),null);
 assert.equal((await request(app).delete(`/schedules/${id}`)).status,200);assert.equal(db.schedules.getById(id),undefined);
 assert.equal(db.db.prepare("SELECT COUNT(*) n FROM audit_log WHERE action LIKE 'schedule.%'").get().n,3);
});

test('registration failure remains saved and visible; scoped retry recovers without duplicate schedules',async()=>{
 const cron=require('node-cron');const createTask=cron.createTask;
 cron.createTask=(...args)=>{const task=createTask(...args);task.start=()=>{throw new Error('synthetic registration failure');};return task;};
 let id;
 try{
  const created=await request(app).post('/schedules').send(payload);
  assert.equal(created.status,200);assert.equal(created.body.registration_status,'unregistered');id=created.body.id;
  assert.ok(db.schedules.getById(id));
  const list=await request(app).get('/schedules');assert.equal(list.body.find(row=>row.id===id).registration_status,'unregistered');
  assert.equal((await request(app).post(`/schedules/${id}/retry-registration`)).status,503);
  assert.equal(db.schedules.getAll().length,1);
 }finally{cron.createTask=createTask;}
 const recovered=await request(app).post(`/schedules/${id}/retry-registration`);
 assert.equal(recovered.status,200);assert.equal(recovered.body.registration_status,'registered');assert.ok(scheduler.getNextRun(id));
 const next=scheduler.getNextRun(id);
 assert.equal((await request(app).post(`/schedules/${id}/retry-registration`)).status,200);assert.equal(scheduler.getNextRun(id),next);
 await request(app).post(`/schedules/${id}/toggle`);
 assert.equal((await request(app).post(`/schedules/${id}/retry-registration`)).status,409);
 await request(app).delete(`/schedules/${id}`);
});

test('invalid parallelism and extra variable shapes are rejected without silently rewriting settings',async()=>{
 const response=await request(app).post('/schedules').send({...payload,forks:2});const id=response.body.id;
 for(const invalid of [0,51,1.5,'2',null,false]){
  assert.equal((await request(app).post('/schedules').send({...payload,forks:invalid})).status,400);
  assert.equal((await request(app).put(`/schedules/${id}`).send({forks:invalid})).status,400);
 }
 for(const invalid of [null,false,0,'',[],{nested:{enabled:true}}]){
  assert.equal((await request(app).post('/schedules').send({...payload,extraVars:invalid})).status,400);
  assert.equal((await request(app).put(`/schedules/${id}`).send({extraVars:invalid})).status,400);
 }
 assert.equal(db.schedules.getById(id).forks,2);
 assert.equal((await request(app).put(`/schedules/${id}`).send({forks:50,extraVars:{enabled:false,count:2,label:'test'}})).status,200);
 assert.equal(db.schedules.getById(id).forks,50);
 await request(app).delete(`/schedules/${id}`);
});
