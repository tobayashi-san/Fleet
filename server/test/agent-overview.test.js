const {test,after}=require('node:test');const assert=require('node:assert/strict');const {agentOverview}=require('../utils/agent-overview');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const root=fs.mkdtempSync(path.join(os.tmpdir(),'shipyard-agent-overview-'));process.env.DB_PATH=path.join(root,'test.db');process.env.NODE_ENV='test';const db=require('../db');after(()=>{db.db.close();fs.rmSync(root,{recursive:true,force:true});});
test('agent overview separates configured mode, effective mode and report recency',()=>{
 const servers=Array.from({length:6},(_,i)=>({id:String(i),name:'Host '+i}));const now=Date.parse('2026-09-10T12:00:00Z');
 const configs=[{server_id:'1',mode:'push',interval:30,last_seen:'2026-09-10 11:59:00',token:'private'},{server_id:'2',mode:'pull',interval:30,last_seen:'2026-09-10T11:00:00Z'},{server_id:'3',mode:'push'},{server_id:'4',mode:'pull',last_seen:'invalid'},{server_id:'5',mode:'push',last_seen:'2026-09-11T12:00:00Z'}];
 const result=agentOverview(servers,configs,false,now);assert.deepEqual(result.counts,{ssh:1,push:3,pull:2,recent:1,overdue:1,never:1,invalid:2});assert.ok(result.hosts.every(h=>h.effectiveMode==='ssh'));assert.equal(result.hosts[1].lastSeen,'2026-09-10T11:59:00.000Z');assert.equal(JSON.stringify(result).includes('private'),false);assert.equal(agentOverview(servers,configs,true,now).hosts[1].effectiveMode,'push');
});
test('agent inventory is administrator-only and never exposes credentials',async()=>{
 const host=db.servers.create({name:'overview',hostname:'overview',ip_address:'192.0.2.5'});db.agentConfig.upsert({server_id:host.id,mode:'push',token:'secret-agent-token',shipyard_url:'https://private.example/'});
 const app=require('express')();const request=require('supertest');app.use((req,res,next)=>{req.user={role:req.headers['x-role']||'viewer'};next();});app.use(require('../routes/system'));
 assert.equal((await request(app).get('/agent-overview')).status,403);const response=await request(app).get('/agent-overview').set('x-role','admin');assert.equal(response.status,200);assert.equal(response.headers['cache-control'],'no-store');assert.equal(response.body.total,1);assert.equal(response.body.hosts[0].reportState,'never');assert.equal(response.text.includes('secret-agent-token'),false);assert.equal(response.text.includes('private.example'),false);
});

test('dashboard rejects future agent reports and returns normalized UTC report times',async()=>{
 const host=db.servers.create({name:'future-agent',hostname:'future-agent',ip_address:'192.0.2.6'});db.settings.set('agent_enabled','1');
 db.agentConfig.upsert({server_id:host.id,mode:'push',last_seen:'2099-01-01 12:00:00'});
 const app=require('express')();const request=require('supertest');app.use((req,res,next)=>{req.user={role:'admin'};req.environmentId='default';next();});app.use(require('../routes/dashboard'));
 const result=await request(app).get('/');assert.equal(result.status,200);const row=result.body.servers.find(s=>s.id===host.id);assert.equal(row.agent_state,'failed');assert.equal(row.agent_last_seen,'2099-01-01T12:00:00.000Z');
});
