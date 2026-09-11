'use strict';
const {test,after}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'shipyard-key-export-'));process.env.DB_PATH=path.join(root,'test.db');process.env.NODE_ENV='test';process.env.SHIPYARD_KEY_SECRET='fixture-secret';
const db=require('../db');const bcrypt=require('bcryptjs');const otplib=require('otplib');const express=require('express');const request=require('supertest');const ssh=require('../services/ssh-manager');const scheduler=require('../services/scheduler');
const password='Synthetic-account-password';const user=db.users.create('export-admin','',bcrypt.hashSync(password,4),'admin');
let exportCalls=0;const original=ssh.getPrivateKeyExport;ssh.getPrivateKeyExport=pass=>{exportCalls++;assert.equal(pass,'Fixture-file-passphrase');return 'SYNTHETIC PRIVATE KEY';};
const app=express();app.use(express.json());app.use((req,res,next)=>{req.user=db.users.getById(user.id);next();});app.use('/system',require('../routes/system'));
const send=body=>request(app).post('/system/key/export').send({passphrase:'Fixture-file-passphrase',...body});
after(()=>{ssh.getPrivateKeyExport=original;scheduler.shutdown();db.db.close();fs.rmSync(root,{recursive:true,force:true});});
test('private key export requires current password and enabled MFA before accessing key material',async()=>{
 assert.equal((await send({})).status,400);assert.equal((await send({password:'wrong'})).status,403);assert.equal(exportCalls,0);
 const secret='JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';db.users.setTotp(user.id,secret,true);
 assert.equal((await send({password})).status,403);assert.equal((await send({password,code:'invalid'})).status,403);assert.equal(exportCalls,0);
 const result=await send({password,code:otplib.generateSync({secret})});assert.equal(result.status,200);assert.equal(result.body.privateKey,'SYNTHETIC PRIVATE KEY');assert.equal(result.headers['cache-control'],'no-store');assert.equal(exportCalls,1);
 const audit=JSON.stringify(db.db.prepare('SELECT * FROM audit_log').all());for(const sensitive of [password,secret,'Fixture-file-passphrase','SYNTHETIC PRIVATE KEY'])assert.equal(audit.includes(sensitive),false);
});
test('authorization changes during password verification prevent export',async()=>{
 const compare=bcrypt.compare;bcrypt.compare=async()=>{db.users.update(user.id,{disabled:1});return true;};
 try{assert.equal((await send({password})).status,403);assert.equal(exportCalls,1);}finally{bcrypt.compare=compare;db.users.update(user.id,{disabled:0});}
});
