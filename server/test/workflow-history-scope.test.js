const {test}=require('node:test');const assert=require('node:assert/strict');
const {captureWorkflowHostIds,canAccessWorkflowHistory}=require('../utils/workflow-history-scope');
const original={id:'original',name:'database',environment_id:'default'};
const replacement={id:'replacement',name:'database',environment_id:'default'};
const role={servers:{servers:['original'],groups:[]},playbooks:'all'};

test('workflow IDs survive rename and cannot be inherited by a replacement hostname',()=>{
 const row={playbook:'update.yml',target_server_ids:captureWorkflowHostIds('database',[original])};
 assert.equal(canAccessWorkflowHistory(role,row,[{...original,name:'renamed'}]),true);
 assert.equal(canAccessWorkflowHistory({servers:{servers:['replacement'],groups:[]},playbooks:'all'},row,[replacement]),false);
 assert.equal(canAccessWorkflowHistory(role,row,[]),false);
});
test('legacy, malformed and ambiguous target identities fail closed for restricted roles',()=>{
 for(const target_server_ids of [null,'bad','[]','[42]'])assert.equal(canAccessWorkflowHistory(role,{playbook:'update.yml',target_server_ids},[original]),false);
 assert.equal(captureWorkflowHostIds('database',[original,replacement]),null);
 assert.equal(captureWorkflowHostIds('missing',[original]),null);
 assert.equal(canAccessWorkflowHistory({servers:'all',playbooks:'all'},{playbook:'update.yml'},[]),true);
});
