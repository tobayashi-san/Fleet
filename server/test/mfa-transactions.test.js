'use strict';
const {test,after}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const os=require('node:os');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'shipyard-mfa-'));
process.env.DB_PATH=path.join(root,'test.db');process.env.NODE_ENV='test';process.env.JWT_SECRET='synthetic-mfa-test';
const db=require('../db');const express=require('express');const request=require('supertest');const bcrypt=require('bcryptjs');const jwt=require('jsonwebtoken');const otp=require('otplib');const qr=require('qrcode');
const {createSession}=require('../utils/auth-sessions');
const app=express();app.use(express.json());app.use('/auth',require('../routes/auth').router);
const password='Synthetic-password-123';
function account(name){const user=db.users.create(name,'',bcrypt.hashSync(password,4),'admin');return {user,token:sign(user.id)};}
function sign(id){const user=db.users.getById(id);return jwt.sign({userId:id,tv:user.token_version||0,sid:createSession(user,{})},process.env.JWT_SECRET);}
const send=(method,endpoint,token,body={})=>request(app)[method]('/auth/totp'+endpoint).set('Authorization',`Bearer ${token}`).send(body);
const snapshot=id=>db.db.prepare('SELECT * FROM users WHERE id=?').get(id);
function rejectAudit(){db.db.exec("CREATE TRIGGER reject_mfa BEFORE INSERT ON audit_log WHEN NEW.action='auth.totp' BEGIN SELECT RAISE(ABORT,'synthetic audit failure'); END");}
after(()=>{db.db.close();fs.rmSync(root,{recursive:true,force:true});});
test('setup refuses active MFA and QR failure preserves the previous pending factor',async()=>{
 const {user,token}=account('mfa-setup');const secret=otp.generateSecret();db.users.setPendingTotp(user.id,secret);
 const original=qr.toDataURL;qr.toDataURL=async()=>{throw Error('synthetic render failure');};
 try{assert.equal((await send('post','/setup',token)).status,500);assert.equal(db.users.getPendingTotpSecret(user.id),secret);}finally{qr.toDataURL=original;}
 db.users.setTotp(user.id,secret,true);
 assert.equal((await send('post','/setup',token)).status,409);
 assert.equal((await send('post','/confirm',token,{code:otp.generateSync({secret})})).status,409);
 assert.equal(db.users.getTotpSecret(user.id),secret);
});
test('enabling MFA rolls back account, pending factor and sessions when audit fails',async()=>{
 const {user,token}=account('mfa-confirm');const setup=await send('post','/setup',token);assert.equal(setup.status,200);assert.equal(setup.headers['cache-control'],'no-store');
 const before=snapshot(user.id);const sessions=db.db.prepare('SELECT COUNT(*) n FROM auth_sessions').get().n;
 rejectAudit();
 try{assert.equal((await send('post','/confirm',token,{code:otp.generateSync({secret:setup.body.secret})})).status,500);assert.deepEqual(snapshot(user.id),before);assert.equal(db.db.prepare('SELECT COUNT(*) n FROM auth_sessions').get().n,sessions);}finally{db.db.exec('DROP TRIGGER reject_mfa');}
 const confirmed=await send('post','/confirm',token,{code:otp.generateSync({secret:setup.body.secret})});assert.equal(confirmed.status,200);assert.equal(db.users.getById(user.id).totp_enabled,1);assert.equal(db.users.getPendingTotpSecret(user.id),'');
 assert.equal((await send('get','/status',token)).status,401);assert.equal((await send('get','/status',confirmed.body.token)).status,200);
});
test('disabling MFA is atomic and rejects a session revoked during password verification',async()=>{
 const {user,token}=account('mfa-disable');const secret=otp.generateSecret();db.users.setTotp(user.id,secret,true);const before=snapshot(user.id);
 rejectAudit();try{assert.equal((await send('delete','',token,{password})).status,500);assert.deepEqual(snapshot(user.id),before);}finally{db.db.exec('DROP TRIGGER reject_mfa');}
 const original=bcrypt.compare;bcrypt.compare=async(...args)=>{const result=await original(...args);db.users.incrementTokenVersion(user.id);return result;};
 try{assert.equal((await send('delete','',token,{password})).status,401);assert.equal(db.users.getTotpSecret(user.id),secret);assert.equal(db.users.getById(user.id).totp_enabled,1);}finally{bcrypt.compare=original;}
 const result=await send('delete','',sign(user.id),{password});assert.equal(result.status,200);assert.equal(db.users.getById(user.id).totp_enabled,0);
});
test('setup rejects stale authorization after asynchronous QR rendering',async()=>{
 const {user,token}=account('mfa-race');const original=qr.toDataURL;
 qr.toDataURL=async(...args)=>{const image=await original(...args);db.users.incrementTokenVersion(user.id);return image;};
 try{const response=await send('post','/setup',token);assert.equal(response.status,401);assert.equal(response.body.secret,undefined);assert.equal(db.users.getPendingTotpSecret(user.id),'');}finally{qr.toDataURL=original;}
});
test('password login does not issue access from a stale account snapshot',async()=>{
 const {user}=account('mfa-login-race');const original=bcrypt.compare;
 bcrypt.compare=async(...args)=>{const valid=await original(...args);db.users.incrementTokenVersion(user.id);return valid;};
 try{const response=await request(app).post('/auth/login').send({username:'mfa-login-race',password});assert.equal(response.status,401);assert.equal(response.body.token,undefined);}finally{bcrypt.compare=original;}
 bcrypt.compare=async(...args)=>{const valid=await original(...args);db.users.setTotp(user.id,otp.generateSecret(),true);return valid;};
 try{const response=await request(app).post('/auth/login').send({username:'mfa-login-race',password});assert.equal(response.status,200);assert.equal(response.body.requires2FA,true);assert.equal(response.body.token,undefined);}finally{bcrypt.compare=original;}
});
test('reopening unfinished setup retains the scanned secret and does not duplicate setup audit',async()=>{
 const {user,token}=account('mfa-resume');
 const first=await send('post','/setup',token);assert.equal(first.status,200);
 const before=db.db.prepare("SELECT COUNT(*) n FROM audit_log WHERE action='auth.totp' AND user=?").get('mfa-resume').n;
 const resumed=await send('post','/setup',token);assert.equal(resumed.status,200);assert.equal(resumed.body.secret,first.body.secret);assert.equal(resumed.body.otpauthUrl,first.body.otpauthUrl);
 assert.equal(db.db.prepare("SELECT COUNT(*) n FROM audit_log WHERE action='auth.totp' AND user=?").get('mfa-resume').n,before);
 assert.equal((await send('post','/confirm',token,{code:otp.generateSync({secret:first.body.secret})})).status,200);
 assert.equal(db.users.getTotpSecret(user.id),first.body.secret);
});
