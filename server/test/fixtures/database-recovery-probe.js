'use strict';
// Isolated recovery probe: uses authentication routes only, with no workers or remote clients.
const express = require('express');
const request = require('supertest');
const otplib = require('otplib');
const db = require('../../db');
const auth = require('../../middleware/auth');
const {router} = require('../../routes/auth');
const {verifyWsAuth} = require('../../ws/auth');
const {getSecret} = require('../../utils/crypto');
async function main() {
  const app=express();app.use(express.json());app.use('/auth',router);
  app.get('/protected',auth,(_req,res)=>res.json({ok:true}));
  const oldToken=process.env.RECOVERY_TEST_OLD_TOKEN;
  const oldHttp=await request(app).get('/protected').set('Authorization',`Bearer ${oldToken}`);
  const ws={close(){}};
  const oldWsAccepted=verifyWsAuth(ws,new URL(`http://localhost/?token=${oldToken}`));
  const login=await request(app).post('/auth/login').send({username:'recovery-admin',password:'Recovery-account-password'});
  const code=otplib.generateSync({secret:'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP'});
  const mfa=await request(app).post('/auth/totp/login').send({tempToken:login.body.tempToken,code});
  let newHttpStatus=null;
  if(mfa.body.token)newHttpStatus=(await request(app).get('/protected').set('Authorization',`Bearer ${mfa.body.token}`)).status;
  const result={
    oldHttpStatus:oldHttp.status,oldWsAccepted,requires2FA:login.body.requires2FA===true,mfaStatus:mfa.status,newHttpStatus,
    secretRestored:getSecret(db,'smtp_password')==='synthetic-smtp-password',
    environments:db.db.prepare('SELECT COUNT(*) AS n FROM environments').get().n,
    hosts:db.db.prepare('SELECT COUNT(*) AS n FROM servers').get().n,
    role:db.users.getByUsername('recovery-admin').role,
    pendingEnrollmentCleared:db.users.getPendingTotpSecret(db.users.getByUsername('recovery-admin').id)==='',
  };
  db.db.close();
  process.stdout.write('RECOVERY_RESULT='+JSON.stringify(result)+'\n');
}
main().catch(error=>{process.stderr.write(error.message+'\n');process.exitCode=1;});
