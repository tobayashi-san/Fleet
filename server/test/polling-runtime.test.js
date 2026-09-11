'use strict';
const {test,after}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'shipyard-poll-runtime-'));process.env.DB_PATH=path.join(root,'test.db');process.env.NODE_ENV='test';
const db=require('../db');const scheduler=require('../services/scheduler');
after(()=>{scheduler.shutdown();db.db.close();fs.rmSync(root,{recursive:true,force:true});});
test('runtime distinguishes configured polling from scheduled timers without running collectors',()=>{
 let status=scheduler.getRuntimeStatus();assert.equal(status.scope,'current-process');assert.ok(Date.parse(status.checkedAt));assert.equal(status.pollers.length,5);assert.ok(status.pollers.every(p=>!p.running&&!p.scheduled));
 db.settings.set('poll_updates_enabled','0');scheduler.restartPolling();assert.equal(scheduler.getRuntimeStatus().restartPending,true);scheduler.flushRestartPolling();
 status=scheduler.getRuntimeStatus();assert.equal(status.restartPending,false);assert.equal(status.pollers.find(p=>p.id==='updates').scheduled,false);assert.equal(status.pollers.find(p=>p.id==='info').scheduled,true);assert.ok(status.pollers.every(p=>!p.running));
 scheduler.stopPolling();assert.ok(scheduler.getRuntimeStatus().pollers.every(p=>!p.scheduled));
});
test('runtime endpoint requires administrator and prevents caching',async()=>{
 const app=require('express')();const request=require('supertest');app.use((req,res,next)=>{req.user={role:req.headers['x-role']||'viewer'};next();});app.use(require('../routes/system'));
 assert.equal((await request(app).get('/polling-status')).status,403);
 const response=await request(app).get('/polling-status').set('x-role','admin');assert.equal(response.status,200);assert.equal(response.headers['cache-control'],'no-store');assert.equal(response.body.scope,'current-process');
});

test('IPAM cycle completion and aggregate failure remain observable',async()=>{
 await scheduler.pollIpamSources();
 let observations=scheduler.getRuntimeStatus().pollers.find(p=>p.id==='ipamSources').observations;
 assert.equal(observations.current,null);assert.equal(observations.last.errors,0);assert.ok(Date.parse(observations.last.completedAt));
 db.db.exec('DROP TABLE ipam_sync_sources');
 await scheduler.pollIpamSources();
 observations=scheduler.getRuntimeStatus().pollers.find(p=>p.id==='ipamSources').observations;
 assert.equal(observations.last.errors,1);assert.equal(observations.history.length,2);assert.equal(observations.history[1].errors,0);
});
