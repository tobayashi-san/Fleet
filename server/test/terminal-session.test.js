const {test,after}=require('node:test');const assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'terminal-session-'));
process.env.DB_PATH=path.join(root,'test.db');process.env.JWT_SECRET='terminal-test-only';process.env.NODE_ENV='test';
const db=require('../db');const jwt=require('jsonwebtoken');
db.users.create('operator','unused-hash','admin');const user=db.users.getByUsername('operator');
db.db.prepare("INSERT INTO environments (id,name) VALUES ('terminal-env','Terminal test')").run();
const host=db.servers.create({name:'Terminal host',hostname:'terminal',ip_address:'192.0.2.7',environment_id:'terminal-env'});
const ssh=require('ssh2');const originalClient=ssh.Client;
class Client extends EventEmitter {
 constructor(){super();Client.latest=this;this.ended=false;}
 connect(){} shell(options,callback){this.callback=callback;}
 end(){if(!this.ended){this.ended=true;this.emit('close');}}
}
ssh.Client=Client;
const manager=require('../services/ssh-manager');const oldKey=manager.getPrivateKey;const oldVerifier=manager.makeHostVerifier;
manager.getPrivateKey=()=> 'fixture-key';manager.makeHostVerifier=()=>()=>true;
const {attachSshTerminal}=require('../ws/ssh-terminal');
class Socket extends EventEmitter {
 constructor(){super();this.readyState=1;this.sent=[];}
 send(value){this.sent.push(value);}
 close(){if(this.readyState===1){this.readyState=3;this.emit('close');}}
}
function begin(outputFormat=''){db.db.prepare('DELETE FROM audit_log').run();const wss=new EventEmitter();attachSshTerminal(wss);const ws=new Socket();const token=jwt.sign({userId:user.id},process.env.JWT_SECRET);wss.emit('connection',ws,{url:`/ws/ssh?serverId=${host.id}&environment=terminal-env&token=${token}&output=${outputFormat}`,socket:{remoteAddress:'192.0.2.8'}});return {ws,client:Client.latest};}
function shell(){const sh=new EventEmitter();sh.stderr=new EventEmitter();sh.writes=[];sh.write=value=>sh.writes.push(value);sh.setWindow=()=>{};sh.close=()=>{if(!sh.closed){sh.closed=true;sh.emit('close');}};return sh;}
const events=()=>db.db.prepare('SELECT * FROM audit_log ORDER BY rowid').all();
after(()=>{ssh.Client=originalClient;manager.getPrivateKey=oldKey;manager.makeHostVerifier=oldVerifier;db.db.close();fs.rmSync(root,{recursive:true,force:true});});
test('real terminal handler audits connection and closure in the host environment without command/output data',()=>{
 const {ws,client}=begin();client.emit('ready');const sh=shell();client.callback(null,sh);
 const ready=JSON.parse(ws.sent[0]);assert.equal(ready.sessionAudit,true);assert.equal(ready.outputRecording,false);
 ws.emit('message',Buffer.from(JSON.stringify({type:'input',data:'PRIVATE_COMMAND'})));sh.emit('data',Buffer.from('PRIVATE_OUTPUT'));ws.close();sh.close();
 const rows=events();assert.deepEqual(rows.map(row=>row.action),['terminal.connect','terminal.disconnect']);
 assert.ok(rows.every(row=>row.environment_id==='terminal-env' && row.user==='operator'));
 assert.doesNotMatch(JSON.stringify(rows),/PRIVATE_COMMAND|PRIVATE_OUTPUT/);assert.ok(client.ended);
});
test('browser closure before shell readiness produces one failed connection and disposes late shell',()=>{
 const {ws,client}=begin();client.emit('ready');ws.close();const sh=shell();client.callback(null,sh);
 assert.equal(sh.closed,true);assert.equal(events().length,1);assert.equal(events()[0].action,'terminal.connect_failed');assert.equal(ws.sent.length,0);
});
test('SSH error produces one failure followed by cleanup',()=>{
 const {ws,client}=begin();client.emit('error',new Error('PRIVATE_ERROR'));
 assert.equal(events().length,1);assert.equal(events()[0].success,0);assert.doesNotMatch(events()[0].detail,/PRIVATE_ERROR/);assert.equal(ws.readyState,3);assert.ok(client.ended);
});

test('idle expiry ignores output and resize, then closes transports with one audited reason',t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const {ws,client}=begin();client.emit('ready');const sh=shell();client.callback(null,sh);
 const ready=JSON.parse(ws.sent[0]);assert.deepEqual(ready.limits,{idleSeconds:1800,maxSeconds:28800});
 t.mock.timers.tick(1799000);
 sh.emit('data',Buffer.from('still producing output'));
 ws.emit('message',Buffer.from(JSON.stringify({type:'resize',rows:30,cols:100})));
 ws.emit('message',Buffer.from(JSON.stringify({type:'input',data:''})));
 t.mock.timers.tick(1000);
 assert.equal(ws.readyState,3);assert.ok(sh.closed);assert.ok(client.ended);
 const closure=ws.sent.filter(value=>value.startsWith('{')).map(value=>JSON.parse(value)).find(value=>value.type==='closed');
 assert.equal(closure.reason,'idle_timeout');
 const rows=events();assert.equal(rows.length,2);assert.match(rows[1].detail,/reason=idle_timeout/);
 t.mock.timers.tick(28800000);assert.equal(events().length,2);
});

test('input extends idle deadline but cannot extend maximum session duration',t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const {ws,client}=begin();client.emit('ready');const sh=shell();client.callback(null,sh);
 for(let minute=1;minute<=480;minute++){
   t.mock.timers.tick(60000);
   if(ws.readyState===1)ws.emit('message',Buffer.from(JSON.stringify({type:'input',data:'x'})));
 }
 assert.equal(ws.readyState,3);assert.ok(sh.closed);assert.ok(client.ended);
 assert.match(events()[1].detail,/reason=duration_limit/);
 assert.equal(events().length,2);
});

test('terminal input stops immediately when account access is disabled',()=>{
 const {ws,client}=begin();client.emit('ready');const sh=shell();client.callback(null,sh);
 db.db.prepare('UPDATE users SET disabled=1 WHERE id=?').run(user.id);
 try {
  ws.emit('message',Buffer.from(JSON.stringify({type:'input',data:'must-not-run'})));
  assert.deepEqual(sh.writes,[]);assert.ok(sh.closed);assert.ok(client.ended);assert.equal(ws.readyState,3);
  assert.match(events()[1].detail,/reason=access_revoked/);
 } finally {db.db.prepare('UPDATE users SET disabled=0 WHERE id=?').run(user.id);}
});
test('terminal rechecks resource scope before late shell readiness',()=>{
 const {ws,client}=begin();client.emit('ready');
 db.db.prepare("UPDATE servers SET environment_id='default' WHERE id=?").run(host.id);
 const sh=shell();
 try {client.callback(null,sh);assert.ok(sh.closed);assert.ok(client.ended);assert.equal(ws.sent.length,0);assert.equal(ws.readyState,3);}
 finally {db.db.prepare("UPDATE servers SET environment_id='terminal-env' WHERE id=?").run(host.id);}
});
test('idle terminal closes after resource access changes without waiting for user input',t=>{
 t.mock.timers.enable({apis:['setInterval']});
 const {ws,client}=begin();client.emit('ready');const sh=shell();client.callback(null,sh);
 db.db.prepare("UPDATE servers SET environment_id='default' WHERE id=?").run(host.id);
 try {t.mock.timers.tick(30000);assert.equal(ws.readyState,3);assert.ok(sh.closed);assert.ok(client.ended);}
 finally {db.db.prepare("UPDATE servers SET environment_id='terminal-env' WHERE id=?").run(host.id);ws.close();}
});
test('changing a shared role stops terminal input without changing the user token version',()=>{
 const role=db.roles.create('Terminal operator',{servers:'all',canUseTerminal:true});
 db.db.prepare('UPDATE users SET role=? WHERE id=?').run(role.id,user.id);
 try {
  const {ws,client}=begin();client.emit('ready');const sh=shell();client.callback(null,sh);
  const version=db.users.getById(user.id).token_version;
  db.roles.update(role.id,'Terminal operator',{servers:'all',canUseTerminal:false});
  assert.equal(db.users.getById(user.id).token_version,version);
  ws.emit('message',Buffer.from(JSON.stringify({type:'input',data:'must-not-run'})));
  assert.deepEqual(sh.writes,[]);assert.ok(sh.closed);assert.ok(client.ended);assert.equal(ws.readyState,3);
 } finally {db.db.prepare("UPDATE users SET role='admin' WHERE id=?").run(user.id);}
});


test('negotiated output frames preserve JSON that resembles terminal control messages',()=>{
 const {ws,client}=begin('json-v1');client.emit('ready');const sh=shell();client.callback(null,sh);
 const text='{"type":"error","message":"application output"}';
 sh.emit('data',Buffer.from(text));sh.stderr.emit('data',Buffer.from(text));
 assert.deepEqual(ws.sent.slice(1).map(value=>JSON.parse(value)),[{type:'output',data:text},{type:'output',data:text}]);
 assert.equal(ws.readyState,1);ws.close();
});

test('terminal output preserves UTF-8 characters split across SSH chunks',()=>{
 const {ws,client}=begin('json-v1');client.emit('ready');const sh=shell();client.callback(null,sh);
 const out=Buffer.from('Grüße 🌍');const err=Buffer.from('Zürich');
 // Interleave the independent streams while both have partial UTF-8 characters.
 sh.emit('data',out.subarray(0,3));sh.stderr.emit('data',err.subarray(0,2));
 sh.emit('data',out.subarray(3,8));sh.stderr.emit('data',err.subarray(2));sh.emit('data',out.subarray(8,10));sh.emit('data',out.subarray(10));
 const output=ws.sent.slice(1).map(value=>JSON.parse(value)).filter(value=>value.type==='output').map(value=>value.data).join('');
 assert.equal(output,'GrZüße ürich🌍');
 ws.close();
});
