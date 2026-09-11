const {test,after}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'bulk-move-'));process.env.DB_PATH=path.join(root,'test.db');process.env.NODE_ENV='test';
const db=require('../db');const {auditRowVisibleToServers}=require('../utils/audit-scope');
const {getPermissions}=require('../utils/permissions');const express=require('express');const request=require('supertest');
const app=express();app.use(express.json());app.use((req,res,next)=>{req.environmentId=req.headers['x-environment']||'default';req.user={role:req.headers['x-role']||'admin',username:'operator'};next();});app.use('/servers',require('../routes/servers'));
db.db.prepare('INSERT INTO environments (id,name) VALUES (?,?)').run('stage','Stage');
const a=db.servers.create({name:'move-a',hostname:'move-a',ip_address:'192.0.2.1'});const b=db.servers.create({name:'move-b',hostname:'move-b',ip_address:'192.0.2.2'});
const stage=db.servers.create({name:'stage-move',hostname:'stage-move',ip_address:'192.0.2.3',environment_id:'stage'});
const folder=db.serverGroups.create('Target',null,null,'default');const stageFolder=db.serverGroups.create('Stage target',null,null,'stage');
const restricted=db.roles.create('Restricted mover',{canEditServers:true,canViewAudit:true,servers:{servers:[a.id],groups:[]}});
after(()=>{db.db.close();fs.rmSync(root,{recursive:true,force:true});});
const move=(ids,group,role='admin',env='default')=>request(app).put('/servers/group/bulk').set('x-role',role).set('x-environment',env).send({server_ids:ids,group_id:group});

test('bulk move validates every host and destination before changing any assignment',async()=>{
 for(const [ids,group,role,expected] of [
  [[a.id,b.id],folder.id,restricted.id,403],
  [[a.id],folder.id,restricted.id,403],
  [[a.id,'missing'],folder.id,'admin',404],
  [[a.id,stage.id],folder.id,'admin',404],
  [[a.id,b.id],stageFolder.id,'admin',400],
  [[a.id,b.id],'missing','admin',400],
  [[a.id],folder.id,'missing-role',403],
 ]) {
  const result=await move(ids,group,role);assert.equal(result.status,expected,result.text);
  assert.equal(db.servers.getById(a.id).group_id,null);assert.equal(db.servers.getById(b.id).group_id,null);
 }
});
test('successful move and removal use the exact set and write a scoped audit event',async()=>{
 const result=await move([a.id,b.id],folder.id);assert.equal(result.status,200);assert.equal(result.body.moved,2);
 assert.equal(db.servers.getById(a.id).group_id,folder.id);assert.equal(db.servers.getById(b.id).group_id,folder.id);assert.equal(db.servers.getById(stage.id).group_id,null);
 const remove=await move([a.id],null,restricted.id);assert.equal(remove.status,200);
 assert.equal(db.servers.getById(a.id).group_id,null);assert.equal(db.servers.getById(b.id).group_id,folder.id);
 const row=db.db.prepare("SELECT * FROM audit_log WHERE action='servers.group_bulk_move' AND detail LIKE '%targets=move-a' ORDER BY rowid DESC LIMIT 1").get();
 assert.equal(auditRowVisibleToServers(row,getPermissions({role:restricted.id}),'default'),true);
});
test('stage moves preserve their audit environment',async()=>{
 const result=await move([stage.id],stageFolder.id,'admin','stage');assert.equal(result.status,200);
 const row=db.db.prepare("SELECT * FROM audit_log WHERE action='servers.group_bulk_move' AND environment_id='stage'").get();
 assert.ok(row);assert.match(row.detail,/targets=stage-move$/);
});
