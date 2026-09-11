const {test,after}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'audit-search-'));
process.env.DB_PATH=path.join(root,'test.db');process.env.NODE_ENV='test';
const db=require('../db');const scheduler=require('../services/scheduler');const express=require('express');const request=require('supertest');
const visible=db.servers.create({name:'search-visible',hostname:'search-visible',ip_address:'192.0.2.1'});
const hidden=db.servers.create({name:'search-hidden',hostname:'search-hidden',ip_address:'192.0.2.2'});
const role=db.roles.create('Search reader',{canViewAudit:true,servers:{servers:[visible.id],groups:[]}});
for(let i=0;i<30;i++)db.auditLog.write('server.update',`server=search-visible needle-match item=${i}`,'192.0.2.10',true,'reader');
db.auditLog.write('server.update','server=search-hidden needle-match PRIVATE-HOST','192.0.2.11',true,'hidden-actor');
db.auditLog.write('server.update','server=search-visible needle-match OTHER-ENV','192.0.2.12',true,'other-actor','other');
const app=express();app.use((req,res,next)=>{req.user={role:req.headers['x-role']||role.id,username:'reader'};req.environmentId='default';next();});app.use('/system',require('../routes/system'));
after(()=>{scheduler.shutdown();db.db.close();fs.rmSync(root,{recursive:true,force:true});});
test('list, count and export use the same full-text scope before pagination and hide inaccessible matches',async()=>{
 const list=await request(app).get('/system/audit').query({q:'needle-match',limit:25});assert.equal(list.status,200);assert.equal(list.body.length,25);
 const second=await request(app).get('/system/audit').query({q:'needle-match',limit:25,offset:25});assert.equal(second.body.length,5);
 const meta=await request(app).get('/system/audit/meta').query({q:'needle-match'});assert.equal(meta.status,200);assert.equal(meta.body.count,30);assert.ok(!meta.body.users.includes('hidden-actor'));
 const exported=await request(app).get('/system/audit/export').query({q:'needle-match'});assert.equal(exported.status,200);assert.equal(exported.text.trim().split('\n').length,31);
 for(const content of [JSON.stringify(list.body),JSON.stringify(second.body),JSON.stringify(meta.body),exported.text])assert.doesNotMatch(content,/PRIVATE-HOST|OTHER-ENV|hidden-actor/);
 const none=await request(app).get('/system/audit/meta').query({q:'PRIVATE-HOST'});assert.equal(none.body.count,0);
});
test('all search endpoints reject malformed/oversized search and denied capabilities',async()=>{
 for(const endpoint of ['/system/audit','/system/audit/meta','/system/audit/export']) {
  assert.equal((await request(app).get(endpoint).query({q:'x'.repeat(201)})).status,400);
  assert.equal((await request(app).get(`${endpoint}?q=a&q=b`)).status,400);
  assert.equal((await request(app).get(endpoint).set('x-role','missing-role').query({q:'needle-match'})).status,403);
 }
});

test('terminal audit visibility follows stable host ID after a rename and denies hidden IDs',async()=>{
 db.auditLog.write('terminal.connect',`session_id=one server_id="${visible.id}" server="Previous visible name" terminal-probe`,'192.0.2.10',true,'reader');
 db.auditLog.write('terminal.connect',`session_id=two server_id="${hidden.id}" server="search-visible" terminal-probe`,'192.0.2.10',true,'reader');
 const result=await request(app).get('/system/audit').query({q:'terminal-probe'});
 assert.equal(result.status,200);assert.equal(result.body.length,1);assert.match(result.body[0].detail,/session_id=one/);
 assert.deepEqual(result.body[0].object_links,[{kind:'server',id:visible.id,label:visible.name,href:`/servers/${visible.id}`}]);
});

test('custom task events link only their stable host, independent of task deletion or names',async()=>{
 for(const action of ['create','update','delete','check','preview']) {
  db.auditLog.write(`custom_update.${action}`,`server_id="${visible.id}" task_id="deleted-task" name="Historical server=search-hidden" custom-link-probe`,'192.0.2.10',true,'reader');
 }
 const result=await request(app).get('/system/audit').query({q:'custom-link-probe'});
 assert.equal(result.status,200);assert.equal(result.body.length,5);
 for(const row of result.body) assert.deepEqual(row.object_links,[{kind:'server',id:visible.id,label:visible.name,href:`/servers/${visible.id}`}]);
 for(const id of ['deleted-host',hidden.id]) {
  db.auditLog.write('custom_update.delete',`server_id="${id}" name="server=search-visible" missing-link-probe`,'192.0.2.10',true,'reader',id===hidden.id?'other':'default');
 }
 const missing=await request(app).get('/system/audit').set('x-role','admin').query({q:'missing-link-probe'});
 assert.equal(missing.status,200);assert.equal(missing.body.length,1);assert.deepEqual(missing.body[0].object_links,[]);
});

test('oversized audit export rejects instead of silently returning a partial CSV',async()=>{
 const insert=db.db.prepare("INSERT INTO audit_log (id,environment_id,action,detail) VALUES (?, 'default', 'large.export', 'oversized-export-probe')");
 db.db.transaction(()=>{for(let i=0;i<10001;i++)insert.run(`export-limit-${i}`);})();
 try {
  const result=await request(app).get('/system/audit/export').set('x-role','admin').query({q:'oversized-export-probe'});
  assert.equal(result.status,400);assert.equal(result.body.matching,10001);assert.equal(result.body.limit,10000);assert.match(result.body.error,/Narrow the filters/);
 } finally {db.db.prepare("DELETE FROM audit_log WHERE action='large.export'").run();}
});
test('audit export does not deliver an unrecorded download when its audit write fails',async()=>{
 db.db.exec("CREATE TRIGGER fail_export_audit BEFORE INSERT ON audit_log WHEN NEW.action='system.audit_export' BEGIN SELECT RAISE(ABORT,'synthetic export audit failure'); END");
 try {
  const result=await request(app).get('/system/audit/export').set('x-role','admin').query({q:'needle-match'});
  assert.equal(result.status,500);assert.equal(result.headers['content-disposition'],undefined);assert.ok(result.body.error);
 } finally {db.db.exec('DROP TRIGGER fail_export_audit');}
});
test('maintenance audit scopes both previous and next resources without trusting text',async()=>{
 const {maintenanceAuditDetail}=require('../utils/maintenance-audit');
 const base={id:'historical-window',name:'scope-maintenance-probe',environment_id:'default',resource_ids:JSON.stringify([visible.id]),starts_at:'2035-01-01T10:00:00Z',ends_at:'2035-01-01T11:00:00Z',timezone:'UTC'};
 const own=maintenanceAuditDetail(null,base);
 assert.deepEqual(JSON.parse(own).scope,{environmentId:'default',allHosts:false,hostIds:[visible.id]});
 db.auditLog.write('maintenance_window.create',own,'',true,'allowed-actor');
 const hiddenBefore={...base,resource_ids:JSON.stringify([hidden.id])};
 for(const detail of [maintenanceAuditDetail(hiddenBefore,base),maintenanceAuditDetail({...base,resource_ids:'[]'},base),maintenanceAuditDetail(null,{...base,environment_id:'other'}),JSON.stringify({kind:'maintenance-change',version:1,changes:[],resource:{id:'x',name:'scope-maintenance-probe server=search-visible '}})]) db.auditLog.write('maintenance_window.update',detail,'',true,'denied-actor');
 for(const action of ['users.update','roles.update'])db.auditLog.write(action,JSON.stringify({kind:'user-change',version:1,resource:{id:'x',name:'scope-maintenance-probe server=search-visible '}}),'',true,'denied-actor');
 const list=await request(app).get('/system/audit').query({q:'scope-maintenance-probe'});assert.equal(list.status,200);assert.equal(list.body.length,1);assert.equal(list.body[0].user,'allowed-actor');
 const meta=await request(app).get('/system/audit/meta').query({q:'scope-maintenance-probe'});assert.equal(meta.body.count,1);assert.ok(meta.body.users.includes('allowed-actor'));assert.ok(!meta.body.users.includes('denied-actor'));
 const exported=await request(app).get('/system/audit/export').query({q:'scope-maintenance-probe'});assert.equal(exported.status,200);assert.ok(exported.text.includes('allowed-actor'));assert.ok(!exported.text.includes('denied-actor'));
 db.db.prepare('UPDATE servers SET name=? WHERE id=?').run('renamed-visible',visible.id);
 const renamed=await request(app).get('/system/audit').query({q:'scope-maintenance-probe'});assert.equal(renamed.body.length,1);
});

test('default change focus includes SSH import and export',()=>{
 const rows=[{action:'ssh.import'},{action:'ssh.export'}];
 assert.deepEqual(require('../utils/audit-scope').filterAuditFocus(rows,'changes'),rows);
});


test('note audit uses stable host scope, change focus and direct notes links', async () => {
 const marker='notes-scope-probe';
 for(const host of [visible,hidden])db.auditLog.write('server.notes_update',`server_id="${host.id}" server="${marker}" from_revision=1 to_revision=2`,'',true,'notes-editor');
 const result=await request(app).get('/system/audit').query({q:marker,focus:'changes'});
 assert.equal(result.status,200);assert.equal(result.body.length,1);
 assert.equal(result.body[0].object_links[0].id,visible.id);
 assert.equal(result.body[0].object_links[0].href,`/servers/${visible.id}#tab=notes`);
 const meta=await request(app).get('/system/audit/meta').query({q:marker,focus:'changes'});
 assert.equal(meta.body.count,1);
 const exported=await request(app).get('/system/audit/export').query({q:marker,focus:'changes'});
 assert.equal(exported.status,200);assert.ok(exported.text.includes(visible.id));assert.ok(!exported.text.includes(hidden.id));
});

test('global Git configuration audit never inherits host scope from detail text',async()=>{
 const current=db.servers.getById(visible.id);
 db.auditLog.write('git.config_update',`global-git-scope-probe server=${current.name} type=server target=${visible.id}`,'',true,'git-admin');
 const scoped=await request(app).get('/system/audit').query({q:'global-git-scope-probe'});
 assert.equal(scoped.status,200);assert.deepEqual(scoped.body,[]);
 const meta=await request(app).get('/system/audit/meta').query({q:'global-git-scope-probe'});assert.equal(meta.body.count,0);
 const exported=await request(app).get('/system/audit/export').query({q:'global-git-scope-probe'});assert.ok(!exported.text.includes('git-admin'));
 const admin=await request(app).get('/system/audit').set('x-role','admin').query({q:'global-git-scope-probe',focus:'changes'});
 assert.equal(admin.body.length,1);assert.deepEqual(admin.body[0].object_links,[]);
});

test('deleted host audit names never link to a replacement with the same name',async()=>{
 db.auditLog.write('server.delete',`Server "${visible.name}" (192.0.2.99) deleted historical-deletion-probe`,'192.0.2.10',true,'admin');
 db.auditLog.write('server.deleted',`server=${visible.name} historical-deletion-probe`,'192.0.2.10',true,'admin');
 const response=await request(app).get('/system/audit').set('x-role','admin').query({q:'historical-deletion-probe'});
 assert.equal(response.status,200);assert.equal(response.body.length,2);
 for(const row of response.body){assert.match(row.detail,new RegExp(visible.name));assert.deepEqual(row.object_links,[]);}
 const restricted=await request(app).get('/system/audit').query({q:'historical-deletion-probe'});
 assert.equal(restricted.status,200);assert.deepEqual(restricted.body,[]);
 const meta=await request(app).get('/system/audit/meta').query({q:'historical-deletion-probe'});
 assert.equal(meta.body.count,0);
 const exported=await request(app).get('/system/audit/export').query({q:'historical-deletion-probe'});
 assert.equal(exported.status,200);assert.doesNotMatch(exported.text,/historical-deletion-probe/);
});

test('structured host changes retain exact host scope after rename',async()=>{
 for(const host of [visible,hidden])db.auditLog.write('server.update',JSON.stringify({kind:'host-change',version:1,resource:{id:host.id,name:'Historical name'},changes:[{label:'Name',before:'Before',after:'structured-host-change-probe'}]}),'192.0.2.10',true,'reader');
 const response=await request(app).get('/system/audit').query({q:'structured-host-change-probe'});
 assert.equal(response.status,200);assert.equal(response.body.length,1);assert.equal(response.body[0].object_links[0].id,visible.id);
});

test('new host creation audits follow IDs instead of historical or reused names',async()=>{
 db.auditLog.write('server.create',`Server "Former host name" created; server_id="${visible.id}" creation-id-probe`,'192.0.2.10',true,'reader');
 db.auditLog.write('server.create',`Server "${visible.name}" created; server_id="${hidden.id}" creation-id-probe`,'192.0.2.10',true,'reader');
 db.auditLog.write('server.create',`Server "${visible.name}" created; server_id="deleted-id" creation-id-probe`,'192.0.2.10',true,'reader');
 const response=await request(app).get('/system/audit').query({q:'creation-id-probe'});
 assert.equal(response.status,200);assert.equal(response.body.length,1);assert.equal(response.body[0].object_links[0].id,visible.id);
 const admin=await request(app).get('/system/audit').set('x-role','admin').query({q:'creation-id-probe'});
 const deleted=admin.body.find(row=>row.detail.includes('deleted-id'));
 assert.deepEqual(deleted.object_links,[]);
});

test('audit list, count and export share Zurich calendar boundaries',async()=>{
 for(const [index,time] of ['2026-09-10 21:59:59','2026-09-10 22:00:00','2026-09-11T21:59:59Z','2026-09-11T22:00:00Z'].entries()){
  db.db.prepare("INSERT INTO audit_log(id,environment_id,action,detail,created_at) VALUES (?,'default','server.update',?,?)").run(`audit-day-${index}`,`server=${db.servers.getById(visible.id).name} audit-day-probe item-${index}`,time);
 }
 const query={q:'audit-day-probe',from:'2026-09-11',to:'2026-09-11'};
 const list=await request(app).get('/system/audit').query(query);
 assert.equal(list.status,200);assert.deepEqual(list.body.map(row=>row.id).sort(),['audit-day-1','audit-day-2']);
 assert.equal((await request(app).get('/system/audit/meta').query(query)).body.count,2);
 const exported=await request(app).get('/system/audit/export').query(query);
 assert.equal(exported.status,200);assert.match(exported.text,/item-1/);assert.match(exported.text,/item-2/);assert.doesNotMatch(exported.text,/item-0|item-3/);
 for(const endpoint of ['/system/audit','/system/audit/meta','/system/audit/export'])assert.equal((await request(app).get(endpoint).query({from:'2026-02-30'})).status,400);
});
