const {test,after}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'folder-edit-'));process.env.DB_PATH=path.join(root,'test.db');process.env.NODE_ENV='test';
const db=require('../db');const {auditRowVisibleToServers}=require('../utils/audit-scope');
const {getPermissions}=require('../utils/permissions');const express=require('express');const request=require('supertest');
const app=express();app.use(express.json());app.use((req,res,next)=>{req.environmentId=req.headers['x-environment']||'default';req.user={role:req.headers['x-role']||'admin',username:'operator'};next();});app.use('/servers',require('../routes/servers'));

db.db.prepare('INSERT INTO environments (id,name) VALUES (?,?)').run('stage','Stage');
const parent=db.serverGroups.create('Parent','#111111',null,'default');
const current=db.serverGroups.create('Original','#222222',parent.id,'default');
const child=db.serverGroups.create('Child',null,current.id,'default');
const target=db.serverGroups.create('Target',null,null,'default');
const foreign=db.serverGroups.create('Foreign',null,null,'stage');
const role=db.roles.create('Folder editor',{canEditServers:true,servers:{groups:[current.id],servers:[]}});
after(()=>{db.db.close();fs.rmSync(root,{recursive:true,force:true});});
const row=()=>db.db.prepare('SELECT * FROM server_groups WHERE id=?').get(current.id);
const edit=(body,roleId='admin')=>request(app).put(`/servers/groups/${current.id}`).set('x-role',roleId).send(body);
test('invalid moves do not partially save metadata',async()=>{
 for(const [parentId,roleId,status] of [[current.id,'admin',400],[child.id,'admin',400],[foreign.id,'admin',400],['missing','admin',400],[target.id,role.id,403],[42,'admin',400]]) {
  const before=row();const result=await edit({name:'Changed',color:'#abcdef',parent_id:parentId},roleId);
  assert.equal(result.status,status,result.text);assert.deepEqual(row(),before);
 }
});
test('metadata-only callers retain hierarchy and restricted editors may retain an inaccessible ancestor',async()=>{
 let result=await edit({name:'Renamed',color:'#333333'},role.id);assert.equal(result.status,200,result.text);assert.equal(row().parent_id,parent.id);
 result=await edit({name:'Retained',color:'#444444',parent_id:parent.id},role.id);assert.equal(result.status,200,result.text);assert.equal(row().name,'Retained');
});
test('metadata and parent commit together, including explicit root placement',async()=>{
 let result=await edit({name:'Moved',color:'#555555',parent_id:target.id});assert.equal(result.status,200,result.text);
 assert.equal(row().name,'Moved');assert.equal(row().color,'#555555');assert.equal(row().parent_id,target.id);
 result=await edit({name:'Root',color:'#666666',parent_id:null});assert.equal(result.status,200);assert.equal(row().parent_id,null);
});
test('a database failure on hierarchy rolls back the metadata write',async()=>{
 const before=row();
 db.db.exec("CREATE TRIGGER fail_folder_move BEFORE UPDATE OF parent_id ON server_groups BEGIN SELECT RAISE(ABORT, 'fixture failure'); END");
 try {const result=await edit({name:'Must roll back',color:'#777777',parent_id:parent.id});assert.equal(result.status,500);assert.deepEqual(row(),before);}
 finally {db.db.exec('DROP TRIGGER fail_folder_move');}
});
