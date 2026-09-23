const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'fleet-compose-route-'));
process.env.DB_PATH=path.join(root,'test.db');process.env.NODE_ENV='test';
process.env.FLEET_KEY_SECRET='compose-test-only';
const db=require('../db');
const runner=require('../services/ansible-runner');
const original=runner.runAdHoc;
let calls=[];let failCopy=false;let copiedPath;
runner.runAdHoc=async (host,module,args,callback,options)=>{
 calls.push({host,module,args,options});
 if(module==='copy') {
   copiedPath=args.match(/src=(\S+)/)[1];
   assert.equal(fs.readFileSync(copiedPath,'utf8'),'services:\n  web:\n    image: nginx:stable\n');
   assert.equal(fs.statSync(copiedPath).mode & 0o777,0o600);
   return {success:!failCopy,stderr:failCopy?'Simulated copy failure':''};
 }
 return {success:true};
};
const express=require('express');const request=require('supertest');
const app=express();app.use(express.json());app.use((req,res,next)=>{req.user={role:req.headers['x-role']||'admin'};next();});
app.use('/servers',require('../routes/server-actions')());
const host=db.servers.create({name:'Compose test',hostname:'compose-test',ip_address:'192.0.2.1'});
const endpoint=`/servers/${host.id}/docker/compose/write`;
const valid='services:\n  web:\n    image: nginx:stable\n';
after(()=>{runner.runAdHoc=original;db.db.close();fs.rmSync(root,{recursive:true,force:true});});
test('invalid content, paths and denied roles cannot start remote operations',async()=>{
 for(const body of [{path:'/opt/demo',content:'services: ['},{path:'/opt/demo',content:'services: []'},{path:['/opt/demo'],content:valid},{path:'relative',content:valid},{path:'/etc/demo',content:valid}]) {
   assert.equal((await request(app).post(endpoint).send(body)).status,400);
 }
 assert.equal((await request(app).post(endpoint).set('x-role','unknown').send({path:'/opt/demo',content:valid})).status,403);
 assert.equal(calls.length,0);assert.equal(db.composeProjects.getByServerAndPath(host.id,'/opt/demo'),undefined);
});
test('valid save only creates directory and copies file, then cleans up temporary content',async()=>{
 calls=[];const response=await request(app).post(endpoint).send({path:'/opt/demo',content:valid});
 assert.equal(response.status,200);assert.deepEqual(calls.map(call=>call.module),['file','copy']);
 assert.ok(calls.every(call=>call.options.environmentId==='default'));
 assert.ok(db.composeProjects.getByServerAndPath(host.id,'/opt/demo'));
 assert.equal(fs.existsSync(copiedPath),false);
});
test('failed copy leaves no project registration or temporary content',async()=>{
 calls=[];failCopy=true;
 const response=await request(app).post(endpoint).send({path:'/opt/failed',content:valid});
 assert.equal(response.status,500);
 assert.equal(db.composeProjects.getByServerAndPath(host.id,'/opt/failed'),undefined);
 assert.equal(fs.existsSync(copiedPath),false);
});

test('explicit validation returns bounded local results and never invokes remote operations',async()=>{
 calls=[];
 const url=`/servers/${host.id}/docker/compose/validate`;
 const good=await request(app).post(url).send({content:valid});
 assert.equal(good.status,200);assert.deepEqual(good.body,{valid:true,scope:'yaml-and-basic-structure'});
 const bad=await request(app).post(url).send({content:'services: [PRIVATE_VALUE'});
 assert.equal(bad.status,400);assert.doesNotMatch(bad.body.error,/PRIVATE_VALUE/);
 assert.equal((await request(app).post(url).set('x-role','unknown').send({content:valid})).status,403);
 assert.equal(calls.length,0);
});
