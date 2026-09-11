'use strict';
const {test,after}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');const {pluginDigest}=require('../utils/plugin-digest');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'plugin-digest-'));after(()=>fs.rmSync(root,{recursive:true,force:true}));
test('digest includes installed dependencies and installation metadata',()=>{
 fs.mkdirSync(path.join(root,'node_modules','dependency'),{recursive:true});fs.writeFileSync(path.join(root,'index.js'),'module.exports={}');fs.writeFileSync(path.join(root,'node_modules/dependency/index.js'),'module.exports=1');fs.writeFileSync(path.join(root,'.bundle-version'),'one');
 const first=pluginDigest(root);assert.equal(pluginDigest(root),first);
 fs.writeFileSync(path.join(root,'node_modules/dependency/index.js'),'module.exports=2');const second=pluginDigest(root);assert.notEqual(second,first);
 fs.writeFileSync(path.join(root,'.bundle-version'),'two');assert.notEqual(pluginDigest(root),second);
});
test('symlinked code cannot disappear from the package digest',()=>{
 const link=path.join(root,'linked.js');fs.symlinkSync(path.join(root,'index.js'),link);
 try{assert.throws(()=>pluginDigest(root),/unsupported symbolic link/);}finally{fs.unlinkSync(link);}
 const directoryLink=path.join(root,'node_modules','linked');fs.symlinkSync(root,directoryLink);
 try{assert.throws(()=>pluginDigest(root),/unsupported symbolic link/);}finally{fs.unlinkSync(directoryLink);}
});
test('digest CLI uses the same scheme without executing package code',()=>{
 const {spawnSync}=require('node:child_process');
 fs.writeFileSync(path.join(root,'index.js'),"throw new Error('Package code must never run during digest inspection');");
 const result=spawnSync(process.execPath,[path.join(__dirname,'../cli/plugin-digest.js'),root],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);const info=JSON.parse(result.stdout);assert.equal(info.scheme,'package-files-v2');assert.equal(info.digest,pluginDigest(root));
});
