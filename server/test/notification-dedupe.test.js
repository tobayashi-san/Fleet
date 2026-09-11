'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {createNotificationDeduper}=require('../utils/notification-dedupe');
test('duplicates are suppressed only after acceptance and expire from acceptance time',async()=>{
 let time=0,calls=0;const dedupe=createNotificationDeduper({now:()=>time});const send=async()=>{calls++;time+=5;return {ok:true};};
 await dedupe('a',100,send);time=104;assert.equal((await dedupe('a',100,send)).suppressed,true);assert.equal(calls,1);
 time=105;await dedupe('a',100,send);assert.equal(calls,2);
 await dedupe('b',100,send);assert.equal(calls,3);
});
test('in-flight duplicate waits and suppresses only if the original is accepted',async()=>{
 const dedupe=createNotificationDeduper();let resolve,calls=0;
 const send=()=>{calls++;return new Promise(done=>{resolve=done;});};
 const first=dedupe('key',1000,send);const second=dedupe('key',1000,send);
 await Promise.resolve();assert.equal(calls,1);resolve({ok:true});
 assert.deepEqual(await first,{ok:true});assert.equal((await second).suppressed,true);assert.equal(calls,1);
});
test('failed and partial deliveries do not poison retries; disabled/unknown context bypasses cache',async()=>{
 const dedupe=createNotificationDeduper();let calls=0;
 for(const result of [{ok:false},{ok:false,partial:true}]) {await dedupe('a',1000,async()=>{calls++;return result;});}
 await assert.rejects(dedupe('a',1000,async()=>{calls++;throw new Error('offline');}));
 await dedupe('a',1000,async()=>{calls++;return {ok:true};});assert.equal(calls,4);
 for(let i=0;i<2;i++){await dedupe(null,1000,async()=>{calls++;});await dedupe('a',0,async()=>{calls++;});}
 assert.equal(calls,8);
});
