const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'git-token-transport-'));
process.env.DB_PATH=path.join(root,'test.db');process.env.FLEET_GIT_WORKSPACE_DIR=path.join(root,'workspace');
fs.mkdirSync(path.join(root,'workspace','.git'),{recursive:true});
const calls=[];
let rejectRemote=false;
const childProcess=require('node:child_process');
const originalExec=childProcess.execFile;
const fakeExec=()=>{};
fakeExec[require('node:util').promisify.custom]=async(command,args,options)=>{
 calls.push({command,args,env:options.env});
 if(rejectRemote && args[0]==='remote') throw Object.assign(new Error('synthetic config failure'),{code:128});
 return {stdout:'',stderr:''};
};
childProcess.execFile=fakeExec;
const db=require('../db');const service=require('../services/git-sync');
after(()=>{childProcess.execFile=originalExec;db.db.close();fs.rmSync(root,{recursive:true,force:true});});
test('HTTPS authentication stays out of remote arguments and uses a process-only header',async()=>{
 db.settings.set('git_repo_url','https://example.test/repo.git');db.settings.set('git_branch','main');
 service.updateCredentials({mode:'https',authToken:'private-token'});
 assert.equal((await service.fetchRemote()).success,true);
 const remote=calls.find(call=>call.args[0]==='remote');
 assert.equal(remote.args.at(-1),'https://example.test/repo.git');
 assert.ok(!JSON.stringify(calls.map(call=>call.args)).includes('private-token'));
 const fetch=calls.find(call=>call.args[0]==='fetch');
 assert.equal(fetch.env.GIT_CONFIG_KEY_1,'http.extraHeader');
 assert.equal(fetch.env.GIT_CONFIG_VALUE_1,'Authorization: Basic '+Buffer.from('oauth2:private-token').toString('base64'));
 assert.equal(fetch.env.GIT_CONFIG_VALUE_0,'');
});

test('failed origin update stops before fetch and preserves last successful check time', async()=>{
 calls.length=0;rejectRemote=true;
 db.settings.set('git_last_fetch_at','2026-09-01T00:00:00Z');
 try {
  const result=await service.fetchRemote();
  assert.equal(result.success,false);
  assert.match(result.stderr,/remote configuration/);
  assert.ok(!calls.some(call=>call.args[0]==='fetch'));
  assert.equal(db.settings.get('git_last_fetch_at'),'2026-09-01T00:00:00Z');
 } finally {rejectRemote=false;}
});
