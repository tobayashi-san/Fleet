'use strict';
const fs=require('node:fs');const path=require('node:path');const os=require('node:os');const {execFileSync}=require('node:child_process');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'shipyard-real-recovery-'));
process.env.DB_PATH=path.join(root,'source.db');process.env.NODE_ENV='test';process.env.JWT_SECRET='recovery-test-jwt';process.env.SHIPYARD_KEY_SECRET='recovery-original-key';
const {test,after}=require('node:test');const assert=require('node:assert/strict');const bcrypt=require('bcryptjs');const jwt=require('jsonwebtoken');
const db=require('../db');const {setSecret}=require('../utils/crypto');const {createSession}=require('../utils/auth-sessions');const {createEncryptedDatabaseBackup,restoreEncryptedDatabaseBackup}=require('../services/database-backup');
const password='Synthetic backup passphrase';const archive=path.join(root,'snapshot.backup');const restored=path.join(root,'restored.db');
let oldToken;
after(()=>{db.db.close();fs.rmSync(root,{recursive:true,force:true});});
function probe(key){
 const stdout=execFileSync(process.execPath,[path.join(__dirname,'fixtures/database-recovery-probe.js')],{encoding:'utf8',env:{...process.env,DB_PATH:restored,SHIPYARD_KEY_SECRET:key,RECOVERY_TEST_OLD_TOKEN:oldToken}});
 const line=stdout.split('\n').find(line=>line.startsWith('RECOVERY_RESULT='));
 assert.ok(line,'Recovery process must report its result');
 return JSON.parse(line.slice('RECOVERY_RESULT='.length));
}
test('real schema recovery preserves encrypted configuration and requires a fresh MFA login',async()=>{
 db.users.create('recovery-admin',null,bcrypt.hashSync('Recovery-account-password',4),'admin');
 const user=db.users.getByUsername('recovery-admin');
 db.users.setTotp(user.id,'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP',true);
 db.users.setPendingTotp(user.id,'ABCDABCDABCDABCDABCDABCDABCDABCD');
 setSecret(db,'smtp_password','synthetic-smtp-password');
 db.db.prepare('INSERT INTO environments (id,name) VALUES (?,?)').run('recovery-env','Recovery environment');
 db.servers.create({name:'Preserved host',hostname:'preserved',ip_address:'192.0.2.99',environment_id:'recovery-env'});
 oldToken=jwt.sign({userId:user.id,tv:user.token_version||0,sid:createSession(user,{})},process.env.JWT_SECRET,{expiresIn:'1h'});
 await createEncryptedDatabaseBackup(db.db,archive,password);
 await restoreEncryptedDatabaseBackup(archive,restored,password);
 const result=probe('recovery-original-key');
 assert.deepEqual(result,{oldHttpStatus:401,oldWsAccepted:false,requires2FA:true,mfaStatus:200,newHttpStatus:200,secretRestored:true,environments:2,hosts:1,role:'admin',pendingEnrollmentCleared:true});
 assert.equal(db.users.getById(user.id).token_version,user.token_version);
});
test('archive passphrase does not replace the original application encryption key',()=>{
 const result=probe('incorrect-application-key');
 assert.equal(result.secretRestored,false);
 assert.equal(result.requires2FA,true);
 assert.equal(result.mfaStatus,400);
 assert.equal(result.newHttpStatus,null);
 assert.equal(result.oldHttpStatus,401);
});
