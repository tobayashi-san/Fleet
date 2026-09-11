const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'shipyard-secret-input-'));
process.env.DB_PATH=path.join(root,'test.db');
process.env.SHIPYARD_KEY_SECRET='isolated-test-encryption-key';
const db=require('../db');
const express=require('express');
const request=require('supertest');
const app=express();app.use(express.json());app.use((req,res,next)=>{req.user={role:req.headers['x-role'] || 'admin',username:'alice'};next();});app.use('/vars',require('../routes/ansible-vars'));
after(()=>{db.db.close();fs.rmSync(root,{recursive:true,force:true});});
test('secret flags cannot silently fall back to plaintext and saved secrets stay masked',async()=>{
  const payload={key:'api_token',value:'test-private-value',environment_id:'default'};
  assert.equal((await request(app).post('/vars').send({...payload,is_secret:'true'})).status,400);
  const created=await request(app).post('/vars').send({...payload,is_secret:true});
  assert.equal(created.status,201);
  assert.ok(!JSON.stringify(created.body).includes(payload.value));
  const listed=await request(app).get('/vars');
  assert.ok(!JSON.stringify(listed.body).includes(payload.value));
  assert.equal((await request(app).put(`/vars/${created.body.id}`).send({...payload,is_secret:1})).status,400);
  const kept=await request(app).put(`/vars/${created.body.id}`).send({key:payload.key,value:'',description:'Updated description',is_secret:true});
  assert.equal(kept.status,200);
  assert.equal(db.ansibleVars.toExtraVars('default').api_token,payload.value);
});

test('change history records metadata only, survives deletion and isolates environments',async()=>{
  const history=await request(app).get('/vars/history');
  assert.equal(history.status,200);
  assert.equal(history.body.items[0].actor,'alice');
  assert.deepEqual(history.body.items[0].fields,['Description']);
  assert.ok(!JSON.stringify(history.body).includes('test-private-value'));
  assert.ok(!JSON.stringify(history.body).includes('Updated description'));
  assert.equal((await request(app).get('/vars/history').set('x-role','unknown-role')).status,403);
  db.db.prepare("INSERT INTO environments (id,name) VALUES ('second','Second')").run();
  assert.equal((await request(app).get('/vars/history?environment_id=second')).body.total,0);
  const variable=(await request(app).get('/vars')).body[0];
  assert.equal((await request(app).delete(`/vars/${variable.id}`)).status,200);
  const deleted=await request(app).get('/vars/history');
  assert.equal(deleted.body.items[0].action,'Deleted');
  assert.equal(deleted.body.items[0].variable_key,'api_token');
});
test('history is bounded per environment and paginated',async()=>{
  const insert=db.db.prepare("INSERT INTO variable_change_events (environment_id,variable_id,variable_key,action,fields) VALUES ('default','test','test_key','Updated','[]')");
  db.db.transaction(()=>{for(let i=0;i<1001;i++) insert.run();})();
  const created=await request(app).post('/vars').send({key:'retention_test',value:'public value',is_secret:false});
  assert.equal(created.status,201);
  const first=await request(app).get('/vars/history');
  const second=await request(app).get('/vars/history?page=2');
  assert.equal(first.body.total,1000);
  assert.equal(first.body.items.length,25);
  assert.equal(second.body.items.length,25);
  assert.ok(first.body.items.at(-1).id>second.body.items[0].id);
});
test('rotation metadata round-trips without changing the last-value timestamp on metadata edits',async()=>{
 const payload={key:'rotation_token',value:'rotation-test-value',is_secret:true,rotation_due:'2027-01-20'};
 assert.equal((await request(app).post('/vars').send({...payload,rotation_due:'2026-02-30'})).status,400);
 const created=await request(app).post('/vars').send(payload);
 assert.equal(created.status,201);
 assert.equal(created.body.rotation_due,'2027-01-20');
 assert.ok(Date.parse(created.body.value_updated_at));
 db.db.prepare("UPDATE ansible_vars SET value_updated_at = '2000-01-01T00:00:00Z' WHERE id = ?").run(created.body.id);
 const metadata=await request(app).put(`/vars/${created.body.id}`).send({key:payload.key,value:'',is_secret:true,rotation_due:'2027-04-20'});
 assert.equal(metadata.body.value_updated_at,'2000-01-01T00:00:00Z');
 assert.equal(metadata.body.rotation_due,'2027-04-20');
 const replaced=await request(app).put(`/vars/${created.body.id}`).send({key:payload.key,value:'replacement-test-value',is_secret:true,rotation_due:null});
 assert.notEqual(replaced.body.value_updated_at,metadata.body.value_updated_at);
 assert.equal(replaced.body.rotation_due,null);
 const history=(await request(app).get('/vars/history')).body;
 assert.ok(history.items[0].fields.includes('Rotation due'));
 assert.ok(!JSON.stringify(history).includes('replacement-test-value'));
});
test('typed variables reach execution as native values while legacy text stays text',async()=>{
 const cases=[['count','number','12.5',12.5],['enabled','boolean','false',false],['structured','json','{"ports":[80,443],"active":true}',{ports:[80,443],active:true}],['legacy_text','string','false','false']];
 for(const [key,value_type,value,expected] of cases){
   const created=await request(app).post('/vars').send({key,value,value_type,is_secret:false});
   assert.equal(created.status,201,JSON.stringify(created.body));
   assert.equal(created.body.value_type,value_type);
   assert.deepEqual(db.ansibleVars.toExtraVars('default')[key],expected);
 }
 for(const [value_type,value] of [['number','NaN'],['number','1e400'],['boolean','yes'],['json','{"n":1e400}'],['json','{bad}']]){
   assert.equal((await request(app).post('/vars').send({key:'invalid_type',value,value_type,is_secret:false})).status,400);
 }
 assert.equal((await request(app).post('/vars').send({key:'typed_secret',value:'true',value_type:'boolean',is_secret:true})).status,400);
 const row=(await request(app).get('/vars')).body.find(v=>v.key==='legacy_text');
 const changed=await request(app).put(`/vars/${row.id}`).send({key:row.key,value:'true',value_type:'boolean',is_secret:false});
 assert.equal(changed.status,200);
 assert.equal(db.ansibleVars.toExtraVars('default').legacy_text,true);
 assert.ok((await request(app).get('/vars/history')).body.items[0].fields.includes('Type'));
});
