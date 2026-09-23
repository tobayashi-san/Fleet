'use strict';
const {test,after}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const {execFileSync}=require('node:child_process');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'fleet-import-review-'));process.env.DB_PATH=path.join(root,'db');process.env.FLEET_SSH_DIR=path.join(root,'ssh');process.env.NODE_ENV='test';
const db=require('../db');const manager=require('../services/ssh-manager');const scheduler=require('../services/scheduler');const express=require('express');const request=require('supertest');
const app=express();app.use(express.json());app.use((req,res,next)=>{req.user={role:'admin',username:'review-admin'};next();});app.use('/system',require('../routes/system'));
manager.generateKey('initial');const source=path.join(root,'candidate');execFileSync('ssh-keygen',['-t','ed25519','-f',source,'-N','','-C','fixture'],{stdio:'pipe'});const privateKey=fs.readFileSync(source,'utf8');
after(()=>{manager.closeAll();scheduler.shutdown();db.db.close();fs.rmSync(root,{recursive:true,force:true});});
test('preview exposes fingerprints without activation and import binds both reviewed identities',async()=>{
 const original=manager.getKeyInfo();const files=fs.readdirSync(process.env.FLEET_SSH_DIR).sort();
 assert.equal((await request(app).post('/system/key/import').send({privateKey})).status,428);
 const preview=await request(app).post('/system/key/import-preview').send({privateKey});assert.equal(preview.status,200);assert.equal(preview.body.current.id,original.id);assert.match(preview.body.candidate.fingerprint,/^SHA256:/);assert.equal(preview.headers['cache-control'],'no-store');
 assert.equal(preview.body.candidate.publicKey.split(/\s+/).slice(0,2).join(' '),fs.readFileSync(source+'.pub','utf8').trim().split(/\s+/).slice(0,2).join(' '));assert.equal(manager.getKeyInfo().id,original.id);assert.deepEqual(fs.readdirSync(process.env.FLEET_SSH_DIR).sort(),files);assert.ok(!JSON.stringify(preview.body).includes('PRIVATE KEY'));
 const binding={expectedKeyId:original.id,expectedFingerprint:preview.body.candidate.fingerprint};
 for(const override of [{expectedKeyId:'stale'},{expectedFingerprint:'SHA256:wrong'}]){
  const result=await request(app).post('/system/key/import').send({privateKey,...binding,...override});assert.equal(result.status,409);assert.equal(manager.getKeyInfo().id,original.id);assert.deepEqual(fs.readdirSync(process.env.FLEET_SSH_DIR).sort(),files);
 }
 assert.equal((await request(app).post('/system/key/import').send({privateKey,...binding})).status,200);assert.equal(manager.getKeyInfo().fingerprint,preview.body.candidate.fingerprint);
 const audit=JSON.parse(db.db.prepare("SELECT detail FROM audit_log WHERE action='ssh.import' AND success=1 ORDER BY rowid DESC LIMIT 1").get().detail);
 assert.equal(audit.kind,'ssh-key-change');assert.ok(audit.changes.some(c=>c.label==='Fingerprint'&&c.before===original.fingerprint&&c.after===preview.body.candidate.fingerprint));
 assert.ok(audit.changes.some(c=>c.label==='Key ID'&&c.before===original.id&&c.after===manager.getKeyInfo().id));
 assert.ok(!JSON.stringify(audit).includes('PRIVATE KEY'));assert.ok(!JSON.stringify(audit).includes(source));
 assert.equal((await request(app).post('/system/key/import').send({privateKey,...binding})).status,409);
});
