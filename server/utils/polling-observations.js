'use strict';
// Process-local observations. No host identifiers, command output or credentials.
function createPollingObservations() {
  const states=new Map();
  return {
    begin(id) { const cycle={startedAt:new Date().toISOString(),errors:0}; const previous=states.get(id)||{history:[]};states.set(id,{...previous,current:cycle});return cycle; },
    finish(id,cycle) { const state=states.get(id);const result={...cycle,completedAt:new Date().toISOString()};states.set(id,{current:null,last:result,history:[result,...state.history].slice(0,10)}); },
    snapshot(id) { const state=states.get(id)||{current:null,last:null,history:[]};return JSON.parse(JSON.stringify(state)); },
  };
}
module.exports={createPollingObservations};
