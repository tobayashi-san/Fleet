const {test,after}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'git-config-transaction-'));process.env.DB_PATH=path.join(root,'test.db');process.env.NODE_ENV='test';
const db=require('../db');const express=require('express');const request=require('supertest');const app=express();app.use(express.json());app.use((req,res,next)=>{req.user={role:'admin',username:'tester'};next();});app.use('/git',require('../routes/git-playbooks'));
after(()=>{db.db.close();fs.rmSync(root,{recursive:true,force:true});});
test('invalid credentials roll back earlier Git configuration changes',async()=>{
 db.settings.set('git_repo_url','https://example.test/repo.git');db.settings.set('git_user_name','Original');db.settings.set('git_read_only','1');db.settings.set('git_auto_pull','1');
 const response=await request(app).put('/git/config').send({userName:'Changed',readOnly:false,autoPull:false,credentialMode:'ssh',sshKey:'incompatible'});
 assert.equal(response.status,400);assert.match(response.body.error,/does not match/);
 assert.equal(db.settings.get('git_user_name'),'Original');assert.equal(db.settings.get('git_read_only'),'1');assert.equal(db.settings.get('git_auto_pull'),'1');
 const valid=await request(app).put('/git/config').send({userName:'Changed',autoPull:false});assert.equal(valid.status,200);assert.equal(db.settings.get('git_user_name'),'Changed');assert.equal(db.settings.get('git_auto_pull'),'0');
});

test('Git policy and credential changes require a secret-free audit entry',async()=>{
 db.settings.set('git_auto_pull','0');
 db.db.exec("CREATE TRIGGER reject_git_audit BEFORE INSERT ON audit_log WHEN NEW.action IN ('git.config_update','git.settings_update') BEGIN SELECT RAISE(ABORT,'synthetic audit failure'); END");
 try {
  for(const method of ['post','put']){
   const endpoint=method==='post'?'/git/settings':'/git/config';
   assert.equal((await request(app)[method](endpoint).send({autoPull:true})).status,500);
   assert.equal(db.settings.get('git_auto_pull'),'0');
  }
 }finally{db.db.exec('DROP TRIGGER reject_git_audit');}
 assert.equal((await request(app).put('/git/config').send({credentialMode:'https',authToken:'never-log-this-token',autoPull:true})).status,200);
 const row=db.db.prepare("SELECT * FROM audit_log WHERE action='git.config_update' ORDER BY rowid DESC LIMIT 1").get();
 assert.ok(row.detail.includes('authToken'));assert.ok(row.detail.includes('autoPull'));assert.ok(!row.detail.includes('never-log-this-token'));assert.equal(row.user,'tester');
});

test('invalid Git identities reject setup and config before settings or remote work', async () => {
 const gitSync = require('../services/git-sync');
 const originalSetup = gitSync.setup;
 let setupCalls = 0;
 gitSync.setup = async () => { setupCalls++; return {success:true}; };
 db.settings.set('git_user_name', 'Original');
 db.settings.set('git_auto_pull', '1');
 try {
  for (const identity of [
   {userName: {}}, {userName: null}, {userName:'a\nb'}, {userName:'a'.repeat(201)},
   {userEmail:42}, {userEmail:'bad'}, {userEmail:'a@b\n'}, {userEmail:'a<b>@localhost'},
   {userEmail:'two words@localhost'}, {userEmail:'a'.repeat(255)},
  ]) {
   for (const method of ['post','put']) {
    const response = await request(app)[method](method === 'post' ? '/git/setup' : '/git/config')
     .send({repoUrl:'https://example.test/repo.git',autoPull:false,...identity});
    assert.equal(response.status,400,JSON.stringify(identity));
    assert.match(response.body.error,/userName|userEmail/);
    assert.equal(db.settings.get('git_user_name'),'Original');
    assert.equal(db.settings.get('git_auto_pull'),'1');
   }
  }
  assert.equal(setupCalls,0);
  const valid = await request(app).put('/git/config').send({userName:'  Jörg Example  ',userEmail:' fleet@localhost '});
  assert.equal(valid.status,200);
  assert.equal(db.settings.get('git_user_name'),'Jörg Example');
  assert.equal(db.settings.get('git_user_email'),'fleet@localhost');
  assert.equal((await request(app).post('/git/setup').send({repoUrl:'https://example.test/repo.git',userName:'',userEmail:''})).status,200);
  assert.equal(setupCalls,1);
 } finally { gitSync.setup = originalSetup; }
});

test('legacy credential requests obey transport and type checks atomically', async () => {
 const gitSync = require('../services/git-sync');
 db.settings.set('git_repo_url','deploy@example.test:repo.git');
 gitSync.updateCredentials({mode:'ssh',sshKey:'retained-key'});
 db.settings.set('git_auto_pull','1');
 for (const credentials of [
  {authToken:'wrong-transport'}, {sshKey:{}}, {sshKey:null},
  {credentialMode:'ssh',sshKey:'replacement',authToken:'ambiguous'},
 ]) {
  const response = await request(app).put('/git/config').send({autoPull:false,...credentials});
  assert.equal(response.status,400);
  assert.equal(gitSync.getConfig().sshKey,'retained-key');
  assert.equal(gitSync.getConfig().authToken,'');
  assert.equal(db.settings.get('git_auto_pull'),'1');
 }
 assert.equal((await request(app).put('/git/config').send({sshKey:'replacement-key'})).status,200);
 assert.equal(gitSync.getConfig().sshKey,'replacement-key');
 db.settings.set('git_repo_url','https://example.test/repo.git');
 assert.equal((await request(app).put('/git/config').send({authToken:'replacement-token'})).status,200);
 assert.equal(gitSync.getConfig().authToken,'replacement-token');
 assert.equal(gitSync.getConfig().sshKey,'');
});

test('disconnect rolls back every setting if a later credential write fails', async () => {
 db.settings.set('git_repo_url','https://preserved.test/repo');
 db.settings.set('git_auth_token','preserved-token');
 db.db.exec("CREATE TRIGGER reject_disconnect BEFORE INSERT ON app_settings WHEN NEW.key='git_ssh_key' AND NEW.value='' BEGIN SELECT RAISE(ABORT,'synthetic disconnect failure'); END");
 try {
  assert.equal((await request(app).post('/git/disconnect')).status,500);
  assert.equal(db.settings.get('git_repo_url'),'https://preserved.test/repo');
  assert.equal(db.settings.get('git_auth_token'),'preserved-token');
 } finally { db.db.exec('DROP TRIGGER reject_disconnect'); }
 assert.equal((await request(app).post('/git/disconnect')).status,200);
 assert.equal(db.settings.get('git_repo_url'),'');
 assert.equal(db.settings.get('git_auth_token'),'');
});

test('disconnect requires an audit entry and excludes credential values', async () => {
 db.settings.set('git_repo_url','https://audit.test/repo');
 db.settings.set('git_auth_token','private-disconnect-token');
 db.db.exec("CREATE TRIGGER reject_disconnect_audit BEFORE INSERT ON audit_log WHEN NEW.action='git.disconnect' BEGIN SELECT RAISE(ABORT,'audit failed'); END");
 try {
  assert.equal((await request(app).post('/git/disconnect')).status,500);
  assert.equal(db.settings.get('git_repo_url'),'https://audit.test/repo');
  assert.equal(db.settings.get('git_auth_token'),'private-disconnect-token');
 } finally { db.db.exec('DROP TRIGGER reject_disconnect_audit'); }
 assert.equal((await request(app).post('/git/disconnect')).status,200);
 const row=db.db.prepare("SELECT * FROM audit_log WHERE action='git.disconnect' ORDER BY rowid DESC LIMIT 1").get();
 assert.equal(row.user,'tester');
 assert.ok(!row.detail.includes('private-disconnect-token'));
 assert.match(row.detail,/local workspace retained/);
});
