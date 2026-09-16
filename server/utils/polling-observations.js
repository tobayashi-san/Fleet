'use strict';
// Admin-only process-local observations. Reasons are fixed summaries, never command output or credentials.
function createPollingObservations() {
  const states=new Map();
  return {
    begin(id) { const cycle={startedAt:new Date().toISOString(),errors:0,failures:[]}; const previous=states.get(id)||{history:[]};states.set(id,{...previous,current:cycle});return cycle; },
    fail(cycle,server,reason) { cycle.errors++; if(cycle.failures.length < 100) cycle.failures.push({hostId:String(server.id),hostName:server.name,environmentId:server.environment_id || 'default',reason}); },
    finish(id,cycle) { const state=states.get(id);const result={...cycle,completedAt:new Date().toISOString()};states.set(id,{current:null,last:result,history:[result,...state.history].slice(0,10)}); },
    snapshot(id) { const state=states.get(id)||{current:null,last:null,history:[]};return JSON.parse(JSON.stringify(state)); },
  };
}
module.exports={createPollingObservations};
