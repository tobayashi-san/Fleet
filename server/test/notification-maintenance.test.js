'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const Database=require('better-sqlite3');
const {coveredByMaintenance}=require('../utils/notification-maintenance');
test('maintenance covers all recorded hosts, respects scope/environment and excludes end boundary',()=>{
 const db=new Database(':memory:');db.exec('CREATE TABLE servers(id TEXT,environment_id TEXT);CREATE TABLE maintenance_windows(environment_id TEXT,starts_at TEXT,ends_at TEXT,resource_ids TEXT);');
 try {
 db.prepare('INSERT INTO servers VALUES (?,?)').run('a','prod');db.prepare('INSERT INTO servers VALUES (?,?)').run('b','prod');db.prepare('INSERT INTO servers VALUES (?,?)').run('foreign','stage');
 const start='2026-09-10T10:00:00Z',end='2026-09-10T11:00:00Z',now=Date.parse(start);
 const add=ids=>db.prepare('INSERT INTO maintenance_windows VALUES (?,?,?,?)').run('prod',start,end,JSON.stringify(ids));
 add(['a']);assert.equal(coveredByMaintenance(db,'prod',['a'],now),true);assert.equal(coveredByMaintenance(db,'prod',['a','b'],now),false);
 add(['b']);assert.equal(coveredByMaintenance(db,'prod',['a','b'],now),true);
 assert.equal(coveredByMaintenance(db,'prod',['a'],now-1),false);assert.equal(coveredByMaintenance(db,'prod',['a'],Date.parse(end)),false);
 for(const ids of [[],null,['missing'],['a','foreign']])assert.equal(coveredByMaintenance(db,'prod',ids,now),false);
 assert.equal(coveredByMaintenance(db,'stage',['foreign'],now),false);
 db.exec('DELETE FROM maintenance_windows');add([]);assert.equal(coveredByMaintenance(db,'prod',['a','b'],now),true);
 db.exec("DELETE FROM servers WHERE id='a'; INSERT INTO servers VALUES ('replacement','prod');");assert.equal(coveredByMaintenance(db,'prod',['a'],now),false);
 db.exec("UPDATE maintenance_windows SET resource_ids='invalid';");assert.equal(coveredByMaintenance(db,'prod',['b'],now),false);
 } finally {db.close();}
});
