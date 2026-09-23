'use strict';
const {test,after}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'fleet-settings-review-'));process.env.DB_PATH=path.join(root,'test.db');process.env.NODE_ENV='test';
const db=require('../db');const scheduler=require('../services/scheduler');const app=require('express')();const request=require('supertest');app.use(require('express').json());app.use((req,res,next)=>{req.user={role:req.headers['x-role']||'viewer',username:'review-admin'};next();});app.use(require('../routes/system'));
after(()=>{scheduler.shutdown();db.db.close();fs.rmSync(root,{recursive:true,force:true});});
test('SMTP transport mode validates input and preserves existing legacy delivery until explicitly changed',async()=>{
 let response=await request(app).get('/settings').set('x-role','admin');assert.equal(response.body.smtpSecurity,'starttls');
 db.settings.set('smtp_host','existing.example.invalid');db.settings.set('smtp_port','587');
 response=await request(app).get('/settings').set('x-role','admin');assert.equal(response.body.smtpSecurity,'legacy');
 assert.equal((await request(app).put('/settings').set('x-role','admin').send({smtpSecurity:'invalid',smtpHost:'changed.invalid'})).status,400);assert.equal(db.settings.get('smtp_host'),'existing.example.invalid');
 assert.equal((await request(app).put('/settings').send({smtpSecurity:'plain'})).status,403);
 for(const mode of ['starttls','tls','plain']){response=await request(app).put('/settings').set('x-role','admin').send({smtpSecurity:mode});assert.equal(response.status,200);assert.equal(db.settings.get('smtp_security'),mode);}
 assert.equal((await request(app).put('/settings').set('x-role','admin').send({smtpSecurity:'legacy'})).status,400);
});
