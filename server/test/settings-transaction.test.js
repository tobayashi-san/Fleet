'use strict';
const {test,after}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'fleet-settings-'));process.env.DB_PATH=path.join(root,'test.db');process.env.NODE_ENV='test';
const db=require('../db');const scheduler=require('../services/scheduler');let reloads=0;scheduler.reloadAllSchedules=()=>{reloads++;};
const app=require('express')();const request=require('supertest');app.use(require('express').json());app.use((req,res,next)=>{req.user={role:'admin',username:'settings-review'};next();});app.use(require('../routes/system'));
after(()=>{db.db.close();fs.rmSync(root,{recursive:true,force:true});});
test('invalid later settings never persist earlier branding changes',async()=>{
 db.settings.set('wl_app_name','Original');
 for(const invalid of [{agentEnabled:'true'},{schedulerTimezone:'Invalid/Zone'},{logoImage:7},{notifResourceAlerts:'true'},{accentColor:'invalid'},{appName:7}]){
  assert.equal((await request(app).put('/settings').send({appName:'Changed',...invalid})).status,400);
  assert.equal(db.settings.get('wl_app_name'),'Original');assert.equal(reloads,0);
 }
});
test('settings and audit roll back together before scheduler reload',async()=>{
 db.settings.set('scheduler_timezone','UTC');
 db.db.exec("CREATE TRIGGER reject_settings_audit BEFORE INSERT ON audit_log BEGIN SELECT RAISE(ABORT, 'test audit failure'); END");
 try {assert.equal((await request(app).put('/settings').send({appName:'Changed',schedulerTimezone:'Europe/Zurich',agentEnabled:false})).status,500);assert.equal(db.settings.get('wl_app_name'),'Original');assert.equal(db.settings.get('scheduler_timezone'),'UTC');assert.equal(reloads,0);}finally{db.db.exec('DROP TRIGGER reject_settings_audit');}
 const response=await request(app).put('/settings').send({appName:'',schedulerTimezone:'Europe/Zurich'});assert.equal(response.status,200);assert.equal(db.settings.get('wl_app_name'),'');assert.equal(db.settings.get('scheduler_timezone'),'Europe/Zurich');assert.equal(reloads,1);
 const audit=db.db.prepare("SELECT * FROM audit_log WHERE action='system.settings' ORDER BY rowid DESC LIMIT 1").get();assert.ok(audit);assert.ok(audit.detail.includes('schedulerTimezone'));
});

test('settings audit lists field names without recording secret values',async()=>{
 const result=await request(app).put('/settings').send({webhookSecret:'private-hook-secret',smtpPass:'private-mail-password'});assert.equal(result.status,200);
 const audit=db.db.prepare("SELECT detail FROM audit_log WHERE action='system.settings' ORDER BY rowid DESC LIMIT 1").get();assert.ok(audit.detail.includes('webhookSecret'));assert.ok(audit.detail.includes('smtpPass'));assert.equal(audit.detail.includes('private-'),false);
});

test('notification connection inputs are validated without truncating ports or saving partial changes',async()=>{
 db.settings.set('smtp_port','587');db.settings.set('wl_app_name','Preserved');
 for(const smtpPort of [0,-1,65536,25.5,'25x','',null]){const result=await request(app).put('/settings').send({appName:'Changed',smtpPort});assert.equal(result.status,400);assert.equal(result.body.field,'smtpPort');assert.equal(db.settings.get('smtp_port'),'587');assert.equal(db.settings.get('wl_app_name'),'Preserved');}
 for(const webhookUrl of ['ftp://example.com/hook','https://user:pass@example.com/hook','not-a-url'])assert.equal((await request(app).put('/settings').send({webhookUrl})).status,400);
 for(const smtpPort of ['465',65535,1]){assert.equal((await request(app).put('/settings').send({smtpPort})).status,200);assert.equal(db.settings.get('smtp_port'),String(smtpPort));}
 assert.equal((await request(app).put('/settings').send({webhookUrl:' https://example.com/hook '})).status,200);assert.equal(db.settings.get('webhook_url'),'https://example.com/hook');assert.equal((await request(app).put('/settings').send({webhookUrl:''})).status,200);
});

test('changing a webhook URL preserves its secret unless explicitly replaced or cleared',async()=>{
 const {getSecret}=require('../utils/crypto');
 await request(app).put('/settings').send({webhookSecret:'original-webhook-secret'});
 const encrypted=db.settings.get('webhook_secret');
 for(const body of [{webhookUrl:'https://example.com/new'},{webhookUrl:'https://example.com/legacy',webhookSecret:'••••••••'}]){assert.equal((await request(app).put('/settings').send(body)).status,200);assert.equal(db.settings.get('webhook_secret'),encrypted);}
 assert.equal((await request(app).put('/settings').send({webhookSecret:'replacement'})).status,200);assert.equal(getSecret(db,'webhook_secret'),'replacement');
 assert.equal((await request(app).put('/settings').send({webhookSecret:''})).status,200);assert.equal(getSecret(db,'webhook_secret'),null);
});

test('SMTP password presence is exposed without secret and omission preserves the password',async()=>{
 const {getSecret}=require('../utils/crypto');await request(app).put('/settings').send({smtpPass:'smtp-original-secret'});
 const response=await request(app).get('/settings');assert.equal(response.body.hasSmtpPassword,true);assert.equal(response.text.includes('smtp-original-secret'),false);
 await request(app).put('/settings').send({smtpHost:'smtp.example.com'});assert.equal(getSecret(db,'smtp_pass'),'smtp-original-secret');
 await request(app).put('/settings').send({smtpPass:''});assert.equal(getSecret(db,'smtp_pass'),null);assert.equal((await request(app).get('/settings')).body.hasSmtpPassword,false);
});
