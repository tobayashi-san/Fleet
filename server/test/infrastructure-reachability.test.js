const {test}=require('node:test');
const assert=require('node:assert/strict');
const {platformReachability}=require('../features/opentofu/infrastructure-summary');
test('platform reachability distinguishes missing observations from confirmed offline nodes',()=>{
 const nodes=(...statuses)=>statuses.map(status=>({status}));
 assert.equal(platformReachability([]),'unknown');
 assert.equal(platformReachability(nodes('unknown')),'unknown');
 assert.equal(platformReachability(nodes('offline','unknown')),'unknown');
 assert.equal(platformReachability(nodes('offline','offline')),'offline');
 assert.equal(platformReachability(nodes('online','unknown')),'online');
 assert.equal(platformReachability(nodes('online','offline')),'online');
});

test('partial-refresh warnings survive summary serialization and cache responses',async()=>{
 const {createInfrastructureSummary}=require('../features/opentofu/infrastructure-summary');
 const values=new Map([['tofu.infrastructure.summary.test',JSON.stringify({clusters:[],updated_at:'2020-01-01T00:00:00Z',source_version:'old'})]]);
 const getSummary=createInfrastructureSummary({
  db:{db:{prepare:()=>({all:()=>[]})},settings:{get:key=>values.get(key),set:(key,value)=>values.set(key,value)}},
  log:{warn:()=>{}},removeOrphanedServerMappings:()=>{},
  collectProxmoxInfrastructureGroups:()=>({grouped:new Map(),warnings:['Connection unavailable; retained data may be stale.']}),
  requestProxmoxApi:async()=>{throw Error('Unexpected request');},
 });
 const result=await getSummary('test');
 assert.deepEqual(result.warnings,['Connection unavailable; retained data may be stale.']);
 assert.deepEqual((await getSummary('test')).warnings,result.warnings);
});

test('failed platform refresh retains its original collection timestamp and marks stale data',async()=>{
 const {createInfrastructureSummary}=require('../features/opentofu/infrastructure-summary');
 const collected='2026-08-01T12:00:00Z';
 const values=new Map([['tofu.infrastructure.summary.test',JSON.stringify({clusters:[{id:'platform',collected_at:collected,stale:false,nodes:[],vms:[],datastores:[]}],updated_at:collected,source_version:'old'})]]);
 const getSummary=createInfrastructureSummary({
  db:{db:{prepare:()=>({all:()=>[]})},settings:{get:key=>values.get(key),set:(key,value)=>values.set(key,value)}},
  log:{warn:()=>{}},removeOrphanedServerMappings:()=>{},
  collectProxmoxInfrastructureGroups:()=>({grouped:new Map([['platform',{key:'platform',connection:{}}]]),warnings:[]}),
  requestProxmoxApi:async()=>{throw Error('Platform unavailable');},
 });
 const result=await getSummary('test');
 assert.equal(result.clusters[0].collected_at,collected);
 assert.equal(result.clusters[0].stale,true);
 assert.deepEqual(result.warnings,['Platform unavailable']);
});


test('summary and cache preserve the exact adoption source among equivalent connections', async () => {
 const {createInfrastructureSummary}=require('../features/opentofu/infrastructure-summary');
 const values=new Map();
 const mapping={server_id:'host-b',connection_id:'second',node_name:'pve',vm_id:101,guest_type:'qemu'};
 const getSummary=createInfrastructureSummary({
  db:{db:{prepare:sql=>({all:()=>sql.includes('FROM proxmox_inventory_servers')?[mapping]:[]})},servers:{getAll:()=>[]},settings:{get:key=>values.get(key),set:(key,value)=>values.set(key,value)}},
  log:{warn:()=>{}},removeOrphanedServerMappings:()=>{},
  collectProxmoxInfrastructureGroups:()=>({grouped:new Map([['platform',{key:'platform',environmentId:'test',connection:{base:{host:'https://pve'}},connections:[{id:'first'},{id:'second'}]}]]),warnings:[]}),
  requestProxmoxApi:async(_connection,path)=>path==='/nodes'?[{node:'pve',status:'online'}]:path.startsWith('/cluster/resources')?[{node:'pve',vmid:101,type:'qemu',name:'Application',status:'running'},{node:'pve',vmid:102,type:'lxc',name:'Unadopted',status:'stopped'}]:[],
 });
 const first=await getSummary('test');
 const cached=await getSummary('test');
 for(const result of [first,cached]) {
  assert.equal(result.clusters[0].vms[0].fleet_server_id,'host-b');
  assert.equal(result.clusters[0].vms[0].fleet_connection_id,'second');
  assert.equal(result.clusters[0].vms[1].fleet_connection_id,null);
 }
 assert.equal(cached.cached,true);
});
