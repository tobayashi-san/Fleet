'use strict';
const {test,after}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'plugin-trust-'));process.env.DB_PATH=path.join(root,'test.db');process.env.PLUGINS_DIR=path.join(root,'plugins');process.env.NODE_ENV='test';process.env.SHIPYARD_PLUGIN_TRUST_POLICY='enforce';
const dir=path.join(process.env.PLUGINS_DIR,'approved');fs.mkdirSync(path.join(dir,'node_modules','local-dependency'),{recursive:true});
fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify({id:'approved',name:'Approved fixture'}));fs.writeFileSync(path.join(dir,'index.js'),"const value=require('local-dependency');exports.register=({capture})=>capture(value);");
const dependency=path.join(dir,'node_modules/local-dependency/index.js');fs.writeFileSync(dependency,'module.exports=1;');
const {pluginDigest}=require('../utils/plugin-digest');const approved=pluginDigest(dir);process.env.SHIPYARD_TRUSTED_PLUGIN_SHA256=`approved:${approved}`;
const loader=require('../services/plugin-loader');const db=require('../db');after(()=>{db.db.close();fs.rmSync(root,{recursive:true,force:true});});
test('dependency modification invalidates an enforced package approval before registration',()=>{
 const calls=[];loader.loadAll({capture:value=>calls.push(value)});assert.deepEqual(calls,[1]);
 const initial=loader.list()[0];assert.equal(initial.trust.trusted,true);assert.equal(initial.trust.scheme,'package-files-v2');
 fs.writeFileSync(dependency,'module.exports=2;');loader.reloadAll();
 assert.deepEqual(calls,[1]);assert.equal(loader.list()[0].loaded,false);assert.match(loader.list()[0].error,/not trusted/);
 process.env.SHIPYARD_TRUSTED_PLUGIN_SHA256=`approved:${pluginDigest(dir)}`;loader.reloadAll();assert.deepEqual(calls,[1,2]);
 const review=loader.list()[0].trust;process.env.SHIPYARD_TRUSTED_PLUGIN_SHA256='';
 assert.throws(()=>loader.validateEnableReview('approved',review),/no longer matches/);
});
