const {test}=require('node:test');const assert=require('node:assert/strict');const {createPollingObservations}=require('../utils/polling-observations');
test('observations retain bounded completed history and isolated snapshots',()=>{
 const tracker=createPollingObservations();assert.equal(tracker.snapshot('info').last,null);
 for(let i=0;i<12;i++){const cycle=tracker.begin('info');cycle.errors=i;assert.equal(tracker.snapshot('info').current.errors,i);tracker.finish('info',cycle);}
 const state=tracker.snapshot('info');assert.equal(state.history.length,10);assert.equal(state.last.errors,11);assert.equal(state.current,null);state.history.length=0;assert.equal(tracker.snapshot('info').history.length,10);assert.equal(tracker.snapshot('updates').last,null);
});
test('host failure details are bounded and snapshots cannot mutate retained evidence',()=>{
 const tracker=createPollingObservations();const cycle=tracker.begin('images');
 for(let i=0;i<105;i++)tracker.fail(cycle,{id:i,name:`host-${i}`,environment_id:'lab'},'Registry check failed');
 tracker.finish('images',cycle);const state=tracker.snapshot('images');assert.equal(state.last.errors,105);assert.equal(state.last.failures.length,100);assert.equal(state.last.failures[0].environmentId,'lab');state.last.failures[0].reason='mutated';assert.equal(tracker.snapshot('images').last.failures[0].reason,'Registry check failed');
});
