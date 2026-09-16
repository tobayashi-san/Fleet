'use strict';
const fs=require('node:fs');const path=require('node:path');const os=require('node:os');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'shipyard-backup-route-'));
process.env.DB_PATH=path.join(root,'db.sqlite');process.env.JWT_SECRET='backup-route-test';process.env.NODE_ENV='test';
const {test,after}=require('node:test');const assert=require('node:assert/strict');const express=require('express');const request=require('supertest');const bcrypt=require('bcryptjs');const jwt=require('jsonwebtoken');
const db=require('../db');const auth=require('../middleware/auth');const {getJwtSecret}=require('../utils/jwt-secret');const {verifyEncryptedDatabaseBackup}=require('../services/database-backup');
const app=express();app.use(express.json());app.use(auth);app.use('/backup',require('../routes/database-backup'));
db.users.create('backup-admin',null,bcrypt.hashSync('Account-password-123',4),'admin');db.users.create('backup-viewer',null,bcrypt.hashSync('Account-password-123',4),'viewer');
const admin=db.users.getByUsername('backup-admin');const viewer=db.users.getByUsername('backup-viewer');
const token=user=>`Bearer ${jwt.sign({userId:user.id,tv:user.token_version||0},getJwtSecret(),{expiresIn:'1h'})}`;
const body={password:'Account-password-123',passphrase:'Archive-password-12345',scope:'all-environments-database'};
after(()=>{db.db.close();fs.rmSync(root,{recursive:true,force:true});});
test('export requires administrator, current password and explicit global scope',async()=>{
 assert.equal((await request(app).post('/backup').set('Authorization',token(viewer)).send(body)).status,403);
 assert.equal((await request(app).post('/backup').set('Authorization',token(admin)).send({...body,password:'incorrect'})).status,403);
 assert.equal((await request(app).post('/backup').set('Authorization',token(admin)).send({...body,scope:'default'})).status,400);
 assert.equal((await request(app).post('/backup').set('Authorization',token(admin)).send({...body,passphrase:'short'})).status,400);
});
test('successful export is encrypted, independently verifiable and audited without secrets',async()=>{
 const response=await request(app).post('/backup').set('Authorization',token(admin)).send(body);
 assert.equal(response.status,200);
 assert.equal(response.headers['cache-control'],'no-store');
 assert.equal(response.headers['x-shipyard-backup-verification'],'authenticated-decryption-and-sqlite-integrity');
 assert.match(response.headers['content-disposition'],/attachment/);
 assert.ok(Buffer.isBuffer(response.body));
 const file=path.join(root,'download.backup');fs.writeFileSync(file,response.body);
 assert.equal((await verifyEncryptedDatabaseBackup(file,body.passphrase)).integrity,'ok');
 const event=db.db.prepare("SELECT detail FROM audit_log WHERE action='backup.database_export'").get();
 assert.ok(event);assert.equal(event.detail.includes(body.passphrase),false);assert.equal(event.detail.includes(body.password),false);
});
test('enabled MFA cannot be omitted from backup export',async()=>{
 db.users.setTotp(admin.id,'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP',true);
 const response=await request(app).post('/backup').set('Authorization',token(admin)).send(body);
 assert.equal(response.status,403);assert.equal(response.body.field,'code');
});
test('enabled MFA accepts a current authenticator code with the account password',async()=>{
 const code=require('otplib').generateSync({secret:'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP'});
 const response=await request(app).post('/backup').set('Authorization',token(admin)).send({...body,code});
 assert.equal(response.status,200);assert.ok(Buffer.isBuffer(response.body));
});

test('failed archive verification prevents download and success audit and removes temporary archive',async()=>{
 const service=require('../services/database-backup');const verify=service.verifyEncryptedDatabaseBackup;
 let archive;
 const count=db.db.prepare("SELECT COUNT(*) n FROM audit_log WHERE action='backup.database_export'").get().n;
 service.verifyEncryptedDatabaseBackup=async filename=>{archive=filename;throw new Error('Synthetic verification failure');};
 try{
  const code=require('otplib').generateSync({secret:'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP'});
  let response;
  for(let i=0;i<50;i++){
   response=await request(app).post('/backup').set('Authorization',token(admin)).send({...body,code});
   if(response.status!==409)break;
   await new Promise(resolve=>setTimeout(resolve,10));
  }
  assert.equal(response.status,500);assert.equal(response.headers['content-disposition'],undefined);
  assert.equal(response.headers['x-shipyard-backup-verification'],undefined);
  assert.equal(db.db.prepare("SELECT COUNT(*) n FROM audit_log WHERE action='backup.database_export'").get().n,count);
  assert.ok(archive);
  // HTTP error can arrive before the handler's asynchronous finally cleanup finishes.
  for(let i=0;i<50&&fs.existsSync(path.dirname(archive));i++)await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(fs.existsSync(path.dirname(archive)),false);
 }finally{service.verifyEncryptedDatabaseBackup=verify;}
});

test('recovery records are admin-only, validated, persistent and explicitly manual',async()=>{
  const record={occurredAt:'2026-01-01T00:00:00Z',scope:'Isolated database and application files',version:'test-version',result:'passed',notes:'Recovered in an isolated environment'};
  assert.equal((await request(app).get('/backup/status').set('Authorization',token(viewer))).status,403);
  assert.equal((await request(app).put('/backup/records/recovery').set('Authorization',token(viewer)).send(record)).status,403);
  assert.equal((await request(app).put('/backup/records/recovery').set('Authorization',token(admin)).send({...record,occurredAt:'2099-01-01'})).status,400);
  assert.equal((await request(app).put('/backup/records/recovery').set('Authorization',token(admin)).send({...record,result:'unknown'})).status,400);
  assert.equal((await request(app).put('/backup/records/toString').set('Authorization',token(admin)).send(record)).status,404);
  const saved=await request(app).put('/backup/records/recovery').set('Authorization',token(admin)).send(record);assert.equal(saved.status,200);assert.equal(saved.body.source,'manual');
  const status=await request(app).get('/backup/status').set('Authorization',token(admin));assert.equal(status.status,200);assert.equal(status.body.recoveryTest.recordedBy,'backup-admin');assert.equal(status.body.recoveryTest.version,'test-version');assert.equal(status.body.externalBackup,null);assert.equal(status.body.databaseExport.source,'shipyard');
});

test('a failed external backup does not erase the last recorded success',async()=>{
 const record={occurredAt:'2026-01-01T00:00:00Z',scope:'Application archive',version:'test-version',result:'passed',notes:''};
 assert.equal((await request(app).put('/backup/records/external').set('Authorization',token(admin)).send(record)).status,200);
 assert.equal((await request(app).put('/backup/records/external').set('Authorization',token(admin)).send({...record,occurredAt:'2026-01-02T00:00:00Z',result:'failed'})).status,200);
 const response=await request(app).get('/backup/status').set('Authorization',token(admin));assert.equal(response.body.externalBackup.result,'failed');assert.equal(response.body.externalLastSuccess.result,'passed');assert.equal(response.body.externalLastSuccess.occurredAt,'2026-01-01T00:00:00.000Z');
});
