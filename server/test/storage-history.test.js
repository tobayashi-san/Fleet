'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const Database=require('better-sqlite3');
const {setupStorageHistory,observeStorage,BUCKET_MS,RETENTION_MS}=require('../features/opentofu/storage-history');
test('storage history isolates targets, replaces a bucket, excludes invalid samples and expires old data',()=>{
 const db=new Database(':memory:');setupStorageHistory(db);
 const store={id:'local',node_name:'pve001',active:true,capacity_reported:true,used:10,total:100};
 const now=100*RETENTION_MS;
 try{
  observeStorage(db,'a','endpoint',[store],now);
  let result=observeStorage(db,'a','endpoint',[{...store,used:20}],now+1);
  assert.equal(result[0].capacity_history.length,1);assert.equal(result[0].capacity_history[0].used,20);
  result=observeStorage(db,'a','endpoint',[{...store,used:30}],now+BUCKET_MS);
  assert.equal(result[0].capacity_history.length,2);
  for(const [env,endpoint,node] of [['b','endpoint','pve001'],['a','other','pve001'],['a','endpoint','other']]){
   const isolated=observeStorage(db,env,endpoint,[{...store,node_name:node,active:false}],now+BUCKET_MS);
   assert.deepEqual(isolated[0].capacity_history,[]);
  }
  result=observeStorage(db,'a','endpoint',[{...store,capacity_reported:false}],now+2*BUCKET_MS);
  assert.equal(result[0].capacity_history.length,2);
  result=observeStorage(db,'a','endpoint',[store],now+RETENTION_MS+2*BUCKET_MS);
  assert.equal(result[0].capacity_history.length,1);
  for(let i=0;i<60;i++)result=observeStorage(db,'a','endpoint',[store],now+RETENTION_MS+(i+3)*BUCKET_MS);
  assert.equal(result[0].capacity_history.length,48);
 }finally{db.close();}
});

test('seven-day history averages observed percentages per hour rather than averaging capacities',()=>{
 const db=new Database(':memory:');setupStorageHistory(db);
 const now=100*RETENTION_MS;
 const store={id:'local',node_name:'pve001',active:true,capacity_reported:true,used:10,total:100};
 try {
  observeStorage(db,'env','endpoint',[store],now);
  const result=observeStorage(db,'env','endpoint',[{...store,used:180,total:200}],now+BUCKET_MS);
  const hours=result[0].capacity_history_hourly;
  assert.equal(hours.length,1);assert.equal(hours[0].used,50);assert.equal(hours[0].total,100);assert.equal(hours[0].observations,2);
  const later=observeStorage(db,'env','endpoint',[store],now+3*3600000);
  assert.equal(later[0].capacity_history_hourly.length,2,'Missing hours must remain gaps');
 } finally {db.close();}
});
