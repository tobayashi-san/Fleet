'use strict';
const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'shipyard-polling-'));
process.env.DB_PATH=path.join(root,'test.db');process.env.NODE_ENV='test';
const db=require('../db');const scheduler=require('../services/scheduler');
let restarts=0;scheduler.restartPolling=()=>{restarts++;};
const express=require('express');const request=require('supertest');
const app=express();app.use(express.json());app.use((req,res,next)=>{req.user={username:'review',role:req.headers['x-role']||'admin'};next();});app.use(require('../routes/system'));
after(()=>{db.db.close();fs.rmSync(root,{recursive:true,force:true});});
test('polling rejects malformed sections without writes or restarts',async()=>{
 for(const body of [{info:{enabled:true,intervalMin:1.5}},{info:{enabled:true,intervalMin:'2x'}},{info:{enabled:true,intervalMin:0}},{info:{enabled:true,intervalMin:10000}},{info:{enabled:true}},{info:null},{info:[]},{info:{enabled:'false',intervalMin:5}},{unknown:{}},{info:{enabled:true,intervalMin:5,extra:true}},{}]){
  const before=db.settings.get('poll_info_interval_min');const count=restarts;
  assert.equal((await request(app).put('/polling-config').send(body)).status,400,JSON.stringify(body));
  assert.equal(db.settings.get('poll_info_interval_min'),before);assert.equal(restarts,count);
 }
});
test('polling changes and audit commit together and only admins can save',async()=>{
 const body={info:{enabled:false,intervalMin:75},updates:{enabled:true,intervalMin:120}};
 assert.equal((await request(app).put('/polling-config').set('x-role','viewer').send(body)).status,403);
 assert.equal((await request(app).put('/polling-config').send(body)).status,200);
 assert.equal(restarts,1);assert.equal(db.settings.get('poll_info_enabled'),'0');assert.equal(db.settings.get('poll_info_interval_min'),'75');
 db.db.exec("CREATE TRIGGER reject_poll_audit BEFORE INSERT ON audit_log BEGIN SELECT RAISE(ABORT, 'synthetic audit error'); END");
 assert.equal((await request(app).put('/polling-config').send({info:{enabled:true,intervalMin:25}})).status,500);
 assert.equal(db.settings.get('poll_info_enabled'),'0');assert.equal(db.settings.get('poll_info_interval_min'),'75');assert.equal(restarts,1);
 db.db.exec('DROP TRIGGER reject_poll_audit');
});

test('interval boundaries persist exactly and omitted sections remain unchanged',async()=>{
 const previous=db.settings.get('poll_updates_interval_min');
 for(const intervalMin of [1,9999]){
  const result=await request(app).put('/polling-config').send({info:{enabled:true,intervalMin}});
  assert.equal(result.status,200);
  const current=await request(app).get('/polling-config');
  assert.equal(current.body.info.intervalMin,intervalMin);
  assert.equal(db.settings.get('poll_updates_interval_min'),previous);
 }
});
