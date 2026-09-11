'use strict';
const {test,after}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'plugin-admin-'));process.env.DB_PATH=path.join(root,'test.db');process.env.PLUGINS_DIR=path.join(root,'plugins');process.env.NODE_ENV='test';
const db=require('../db');const loader=require('../services/plugin-loader');const express=require('express'),request=require('supertest');
fs.mkdirSync(path.join(process.env.PLUGINS_DIR,'good'),{recursive:true});fs.writeFileSync(path.join(process.env.PLUGINS_DIR,'good','manifest.json'),JSON.stringify({id:'good',name:'Good plugin',version:'1.0.0'}));
loader.loadAll({});const app=express();app.use(express.json());app.use((req,res,next)=>{req.user={role:'admin',username:'test-admin'};next();});app.use('/plugins',require('../routes/plugins-admin'));
after(()=>{db.db.close();fs.rmSync(root,{recursive:true,force:true});});
test('plugin access changes and audit commit or roll back together',async()=>{
 db.db.exec("CREATE TRIGGER reject_plugin_audit BEFORE INSERT ON audit_log WHEN NEW.action IN ('plugin.enable','plugin.disable') BEGIN SELECT RAISE(ABORT,'synthetic audit failure'); END");
 assert.equal((await request(app).post('/plugins/good/enable').send(loader.list().find(plugin=>plugin.id==='good').trust)).status,500);assert.equal(loader.isEnabled('good'),false);
 db.settings.set('plugin_good_enabled','1');assert.equal((await request(app).post('/plugins/good/disable')).status,500);assert.equal(loader.isEnabled('good'),true);
 db.db.exec('DROP TRIGGER reject_plugin_audit');assert.equal((await request(app).post('/plugins/good/disable')).status,200);assert.equal(loader.isEnabled('good'),false);
 assert.equal((await request(app).post('/plugins/good/enable').send(loader.list().find(plugin=>plugin.id==='good').trust)).status,200);assert.equal(loader.isEnabled('good'),true);
});
test('reload reports partial failures and records failure rather than an unconditional success',async()=>{
 fs.mkdirSync(path.join(process.env.PLUGINS_DIR,'broken'));fs.writeFileSync(path.join(process.env.PLUGINS_DIR,'broken','manifest.json'),JSON.stringify({id:'broken',name:'Broken plugin'}));fs.writeFileSync(path.join(process.env.PLUGINS_DIR,'broken','index.js'),"throw new Error('Synthetic registration failure');");
 const response=await request(app).post('/plugins/reload');assert.equal(response.status,200);assert.equal(response.body.success,false);assert.equal(response.body.summary.loaded,1);assert.deepEqual(response.body.summary.failed,[{id:'broken',error:'Synthetic registration failure'}]);assert.equal(typeof response.body.summary.checkedAt,'number');
 const audit=db.db.prepare("SELECT * FROM audit_log WHERE action='plugin.reload' ORDER BY rowid DESC LIMIT 1").get();assert.equal(audit.success,0);assert.match(audit.detail,/1 loaded, 1 failed/);
 fs.rmSync(path.join(process.env.PLUGINS_DIR,'broken'),{recursive:true});
 const retry=await request(app).post('/plugins/reload');assert.equal(retry.body.success,true);assert.deepEqual(retry.body.summary.failed,[]);assert.equal(retry.body.summary.loaded,1);
});
test('declared incompatible plugin is blocked before server code executes',()=>{
 const dir=path.join(process.env.PLUGINS_DIR,'incompatible');fs.mkdirSync(dir);
 fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify({id:'incompatible',name:'Incompatible',engines:{node:'<0.0.1'}}));
 fs.writeFileSync(path.join(dir,'index.js'),"global.__incompatiblePluginExecuted=true;");
 loader.reloadAll();const plugin=loader.list().find(item=>item.id==='incompatible');
 assert.equal(global.__incompatiblePluginExecuted,undefined);assert.equal(plugin.loaded,false);assert.equal(plugin.compatibility.status,'incompatible');assert.match(plugin.error,/Runtime requirements not met/);
});
test('reload refreshes nested JavaScript and JSON modules without evicting a neighboring plugin',()=>{
 function writePackage(id,version){
  const dir=path.join(process.env.PLUGINS_DIR,id);fs.mkdirSync(path.join(dir,'lib'),{recursive:true});
  fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify({id,name:id,version}));
  fs.writeFileSync(path.join(dir,'index.js'),"const helper=require('./lib/helper');const config=require('./config.json');exports.register=({capture})=>capture("+JSON.stringify(id)+",helper.value,config.value);");
  fs.writeFileSync(path.join(dir,'lib/helper.js'),`exports.value=${JSON.stringify(version)};`);
  fs.writeFileSync(path.join(dir,'config.json'),JSON.stringify({value:version}));
  return dir;
 }
 const first=writePackage('multi','1.0.0');const neighbor=writePackage('multi-extra','1.0.0');
 const observations=[];loader.loadAll({capture:(...values)=>observations.push(values)});
 const neighborCache=require.cache[require.resolve(path.join(neighbor,'lib/helper.js'))];
 writePackage('multi','2.0.0');loader.reload('multi');
 assert.deepEqual(observations.at(-1),['multi','2.0.0','2.0.0']);
 assert.equal(loader.list().find(plugin=>plugin.id==='multi').version,'2.0.0');
 const manifestPath=path.join(first,'manifest.json');
 const loadedManifest=fs.readFileSync(manifestPath,'utf8');
 fs.writeFileSync(manifestPath,JSON.stringify({id:'multi',name:'multi',version:'3.0.0'}));
 const pending=loader.list().find(plugin=>plugin.id==='multi');
 assert.equal(pending.version,'2.0.0');
 assert.equal(pending.packageStatus.installedVersion,'3.0.0');
 assert.equal(pending.packageStatus.loadedVersion,'2.0.0');
 assert.equal(pending.packageStatus.state,'reload-required');
 fs.writeFileSync(manifestPath,'invalid JSON');
 assert.equal(loader.list().find(plugin=>plugin.id==='multi').packageStatus.state,'unreadable');
 fs.writeFileSync(manifestPath,loadedManifest);
 assert.equal(loader.list().find(plugin=>plugin.id==='multi').packageStatus.state,'same-version');
 assert.equal(require.cache[require.resolve(path.join(neighbor,'lib/helper.js'))],neighborCache);
 assert.ok(require.cache[require.resolve(path.join(first,'lib/helper.js'))]);
 const helperPath=require.resolve(path.join(first,'lib/helper.js'));
 fs.unlinkSync(path.join(first,'index.js'));loader.reload('multi');
 assert.equal(require.cache[helperPath],undefined);
});
test('failed single-package reload blocks existing API access until a successful retry',()=>{
 loader.setEnabled('multi',true);assert.ok(loader.getRouter('multi'));
 const manifest=path.join(process.env.PLUGINS_DIR,'multi','manifest.json');const original=fs.readFileSync(manifest,'utf8');
 fs.writeFileSync(manifest,JSON.stringify({id:'multi',name:'multi',engines:{node:'<0.0.1'}}));
 assert.throws(()=>loader.reload('multi'),/Runtime requirements not met/);
 assert.equal(loader.getRouter('multi'),null);const failed=loader.list().find(plugin=>plugin.id==='multi');assert.equal(failed.loaded,false);assert.equal(failed.enabled,false);assert.match(failed.error,/Runtime requirements/);
 assert.throws(()=>loader.setEnabled('multi',true),/not loaded/);
 fs.writeFileSync(manifest,original);loader.reload('multi');assert.ok(loader.getRouter('multi'));
});
test('enabling access binds the reviewed digest to both loaded and on-disk package',async()=>{
 loader.setEnabled('good',false);const review=loader.list().find(plugin=>plugin.id==='good').trust;
 assert.equal((await request(app).post('/plugins/good/enable')).status,428);
 assert.equal((await request(app).post('/plugins/good/enable').send({...review,digest:'0'.repeat(64)})).status,409);
 const manifest=path.join(process.env.PLUGINS_DIR,'good','manifest.json');const original=fs.readFileSync(manifest,'utf8');
 fs.writeFileSync(manifest,JSON.stringify({id:'good',name:'Changed package'}));
 assert.equal((await request(app).post('/plugins/good/enable').send(review)).status,409);assert.equal(loader.isEnabled('good'),false);
 loader.reload('good');assert.equal((await request(app).post('/plugins/good/enable').send(review)).status,409);
 const updated=loader.list().find(plugin=>plugin.id==='good').trust;
 assert.equal((await request(app).post('/plugins/good/enable').send(updated)).status,200);
 const audit=db.db.prepare("SELECT detail FROM audit_log WHERE action='plugin.enable' ORDER BY rowid DESC LIMIT 1").get();assert.ok(audit.detail.includes(updated.digest));
 fs.writeFileSync(manifest,original);
});
