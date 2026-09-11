const {test}=require('node:test');
const assert=require('node:assert/strict');
const {operationName}=require('../utils/operation-display');
test('operation labels describe known tasks and make unknown codes readable',()=>{
 assert.equal(operationName('check-drift','Deployment'),'Check infrastructure drift');
 assert.equal(operationName('import','Deployment'),'Import existing infrastructure');
 assert.equal(operationName('verify_network.routes','Host'),'Verify network routes');
 assert.equal(operationName('refreshInventory','Host'),'Refresh Inventory');
 assert.equal(operationName('compose_pull_media_stack','Host'),'Pull container images · media_stack');
 assert.equal(operationName(null,'Host'),'Operation');
});
