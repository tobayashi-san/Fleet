'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { CollectionQueue } = require('../services/collection-queue');
const tick = () => new Promise(resolve => setImmediate(resolve));
test('bounds parallel work, deduplicates requests and serializes each host', async () => {
  const q = new CollectionQueue({ concurrency:3,heavyConcurrency:1 });
  const releases = []; let active=0, peak=0;
  const work = () => new Promise(resolve => { active++;peak=Math.max(peak,active);releases.push(() => {active--;resolve({ok:true});}); });
  const one=q.run('info',{id:'a'},work);
  assert.equal(q.run('info',{id:'a'},work,{priority:2}),one);
  const jobs=[one,q.run('updates',{id:'a'},work),q.run('updates',{id:'b'},work),q.run('updates',{id:'c'},work),q.run('info',{id:'d'},work)];
  await tick(); assert.equal(q.snapshot().running,3);assert.equal(q.snapshot().heavyRunning,1);
  while(q.jobs.size){ for(const release of releases.splice(0))release(); await tick(); }
  await Promise.all(jobs);assert.equal(peak,3);assert.equal(q.snapshot().queued,0);
});
test('interactive checks jump the pending queue and failures release capacity', async()=>{
 const q=new CollectionQueue({concurrency:1});let release;const order=[];
 const first=q.run('info',{id:'a'},()=>new Promise(resolve=>{release=resolve;}));
 const background=q.run('info',{id:'b'},async()=>{order.push('background');});
 const interactive=q.run('info',{id:'c'},async()=>{order.push('interactive');throw Error('offline');},{priority:2});
 const failed=assert.rejects(interactive,/offline/);await tick();release({});await Promise.all([first,background,failed]);assert.deepEqual(order,['interactive','background']);
});
test('stable inventory slows down, changed inventory resets, offline hosts back off and active views refresh sooner', async()=>{
 let now=1000;const q=new CollectionQueue({now:()=>now,random:()=>0});const host={id:'a'};
 for(let i=0;i<3;i++){await q.run('info',host,async()=>({os:'linux',cpu_usage_pct:i}),{baseMs:300000});await tick();now=q.states.get('a:info').nextAt;}
 assert.equal(q.states.get('a:info').stable,2);
 await q.run('info',host,async()=>({os:'new-linux'}),{baseMs:300000});await tick();
 assert.equal(q.states.get('a:info').nextAt,now+300000);now+=60000;assert.equal(q.due('info',host),false);assert.equal(q.due('info',host,{active:true}),true);
 await assert.rejects(q.run('info',host,async()=>{throw Error('offline');},{baseMs:300000}));await tick();assert.equal(q.due('updates',host),false);assert.equal(q.due('info',host,{active:true}),false);
 // A manual run bypasses the scheduling decision and recovers immediately.
 await q.run('info',host,async()=>({os:'linux'}),{priority:2,baseMs:300000});await tick();assert.equal(q.states.get('a:info').failures,0);
 q.prune([]);assert.equal(q.states.size,0);
});
test('nested utilisation does not postpone inventory changes and pending changes retain baseline', async()=>{
 const q=new CollectionQueue({random:()=>0,now:()=>1000});
 for (let i=0;i<3;i++) {await q.run('info',{id:'a'},async()=>({storage:[{mount:'/',used_bytes:i,total_bytes:100}]}));await tick();}
 assert.equal(q.states.get('a:info').stable,2);
 for (let i=0;i<3;i++) {await q.run('customUpdates',{id:'a'},async()=>[{has_update:true,current_version:'1',last_version:'2'}]);await tick();}
 assert.equal(q.states.get('a:customUpdates').stable,0);
 q.resetSchedule();assert.equal(q.due('info',{id:'a'}),true);
});
test('queue overflow rejects excess work without running it',async()=>{
 const q=new CollectionQueue({concurrency:1,maxPending:1});let release;
 const first=q.run('info',{id:'a'},()=>new Promise(resolve=>{release=resolve;}));
 const second=q.run('info',{id:'b'},async()=>true);
 await assert.rejects(q.run('info',{id:'c'},()=>assert.fail('must not run')),{code:'COLLECTION_QUEUE_FULL'});
 release();await Promise.all([first,second]);
});
