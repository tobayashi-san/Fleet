'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {inventoryGuestName}=require('../features/opentofu/inventory-name');
const mapping={connection_id:'a',node_name:'pve',vm_id:101,guest_type:'qemu'};
const vm={node_name:'pve',vm_id:101,guest_type:'qemu',name:'Inventory name'};
const cluster={connections:[{id:'a'}],vms:[vm]};
test('uses connection, node, identifier and guest type for the inventory name',()=>{
 assert.equal(inventoryGuestName(JSON.stringify({clusters:[cluster]}),mapping),'Inventory name');
 for(const changed of [{connection_id:'b'},{node_name:'other'},{vm_id:102},{guest_type:'lxc'}])
  assert.equal(inventoryGuestName(JSON.stringify({clusters:[cluster]}),{...mapping,...changed}),null);
});
test('missing, malformed or ambiguous inventory never invents a name',()=>{
 for(const value of [null,'invalid','{}',JSON.stringify({clusters:[cluster,cluster]})])
  assert.equal(inventoryGuestName(value,mapping),null);
});
