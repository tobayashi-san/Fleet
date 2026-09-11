'use strict';
const {test,after}=require('node:test');const assert=require('node:assert/strict');
const fs=require('fs'),os=require('os'),path=require('path');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'shipyard-execution-notifications-'));process.env.DB_PATH=path.join(dir,'test.db');process.env.NODE_ENV='test';
const db=require('../db');
const notifications=[];require('../services/notifier').notify=async(...args)=>{notifications.push(args);};
let outcome={success:false,stdout:'PRIVATE OUTPUT',stderr:''};
const runner=require('../services/ansible-runner');runner.prepareRun=()=>{};runner.clearRun=()=>{};runner.runPlaybook=async()=>{if(outcome instanceof Error)throw outcome;return outcome;};
require('../services/git-sync').autoPull=async()=>{};
require('../services/system-info').getSystemInfo=async()=>({});
const express=require('express'),request=require('supertest');const app=express();app.use(express.json());
app.use((req,res,next)=>{req.user={id:'fixture-admin',role:'admin',username:'operator'};next();});app.use(require('../middleware/environment-context'));
const events=[];app.use('/ansible',require('../routes/ansible')({broadcast:event=>events.push(event)}));app.use('/servers',require('../routes/server-actions')({broadcast:event=>events.push(event)}));
const env='notification-fixture';db.db.prepare('INSERT INTO environments (id,name) VALUES (?,?)').run(env,'Notification test');
const host=db.servers.create({name:'notification-host',hostname:'notification-host',ip_address:'192.0.2.20',environment_id:env});
const cron=require('node-cron');let scheduled;const originalCreateTask=cron.createTask;
cron.createTask=(_expression,callback)=>{scheduled=callback;return {timeMatcher:{},start(){},stop(){},destroy(){}};};
const scheduler=require('../services/scheduler');
const id=db.schedules.create('Nightly update','update.yml',host.name,'0 3 * * *',{environmentId:env});scheduler.register(db.schedules.getById(id));
after(()=>{scheduler.shutdown();cron.createTask=originalCreateTask;db.db.close();fs.rmSync(dir,{recursive:true,force:true});});
const actions=[
 ['manual playbook',()=>request(app).post('/ansible/run').set('X-Shipyard-Environment',env).send({playbook:'update.yml',targets:host.name})],
 ['host update',()=>request(app).post(`/servers/${host.id}/update`).set('X-Shipyard-Environment',env).send({})],
 ['bulk update',()=>request(app).post('/servers/update-all').set('X-Shipyard-Environment',env).send({server_ids:[host.id]})],
 ['scheduled playbook',()=>scheduled()],
];
for(const [name,run] of actions) test(`${name} reports failed results/exceptions in its exact environment but not success, cancellation or disabled events`,async()=>{
 for(const kind of ['failed','exception','success','cancelled','disabled']) {
  notifications.length=0;events.length=0;
  outcome=kind==='exception'?new Error('Fixture transport failure'):{success:kind==='success',cancelled:kind==='cancelled',stdout:'PRIVATE OUTPUT',stderr:''};
  db.settings.set('notify_playbook_failed',kind==='disabled'?'0':'1');db.settings.set('notify_update_failed',kind==='disabled'?'0':'1');
  const response=await run();if(response)assert.equal(response.status,200);
  await new Promise(resolve=>setImmediate(resolve));
  if(kind==='cancelled' && name !== 'scheduled playbook')assert.equal(events.find(event=>event.type.endsWith('_complete'))?.status,'cancelled');
  const shouldNotify=['failed','exception'].includes(kind);assert.equal(notifications.length,shouldNotify?1:0,kind);
  if(shouldNotify){assert.equal(notifications[0][2],false);assert.equal(notifications[0][3].environmentId,env);assert.deepEqual(notifications[0][3].serverIds,[host.id]);assert.equal(JSON.stringify(notifications).includes('PRIVATE OUTPUT'),false);}
 }
});
