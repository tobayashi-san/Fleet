const {test}=require('node:test');const assert=require('node:assert/strict');const {createPollingObservations}=require('../utils/polling-observations');
test('observations retain bounded completed history and isolated snapshots',()=>{
 const tracker=createPollingObservations();assert.equal(tracker.snapshot('info').last,null);
 for(let i=0;i<12;i++){const cycle=tracker.begin('info');cycle.errors=i;assert.equal(tracker.snapshot('info').current.errors,i);tracker.finish('info',cycle);}
 const state=tracker.snapshot('info');assert.equal(state.history.length,10);assert.equal(state.last.errors,11);assert.equal(state.current,null);state.history.length=0;assert.equal(tracker.snapshot('info').history.length,10);assert.equal(tracker.snapshot('updates').last,null);
});
