import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import {PlatformOperatingState} from './ClusterDetail';
import {DatastoresCard} from './DetailPanels';
import {preferredDatastores,datastoreCapacityState,datastoreStatus,datastoreContent,filterDatastores} from './detail-model';

it('renders mixed datastore backends and identifies an unreported type without inventing ZFS',()=>{
 const stores=[
  {id:'local',node_name:'pve001',type:'dir',used:10,total:100,available:90},
  {id:'local-lvm',node_name:'pve001',type:'lvmthin',used:20,total:200,available:180},
  {id:'local-zfs',node_name:'pve001',type:'zfspool',used:30,total:300,available:270},
  {id:'unknown',node_name:'pve001',used:0,total:100,available:100},
 ];
 const html=renderToStaticMarkup(<DatastoresCard stores={stores} emptyText="No storage reported"/>);
 for(const name of ['local-lvm','local-zfs','unknown','lvmthin','dir','Not reported'])expect(html).toContain(name);
 expect(html).toContain('Stores may share underlying capacity');
 // Summary preference must not sum directory storage with its backing pool.
 expect(preferredDatastores(stores).map(store=>store.id)).toEqual(['local-zfs']);
});

it('does not treat missing or inconsistent capacity as healthy zero usage',()=>{
 const base={id:'store',node_name:'node',used:0,total:100};
 expect(datastoreCapacityState(base)).toBe('normal');
 expect(datastoreCapacityState({...base,used:85})).toBe('high');
 for(const change of [{capacity_reported:false},{used:NaN},{total:0},{used:-1},{used:101}]){
  const store={...base,...change};
  expect(datastoreCapacityState(store)).toBe('unknown');
  expect(preferredDatastores([store])).toEqual([]);
 }
 const html=renderToStaticMarkup(<DatastoresCard stores={[{...base,capacity_reported:false}]} emptyText="None"/>);
 expect(html).toContain('Not reported');
 expect(html).not.toContain('0 %');
});

it('keeps a platform with missing datastore metrics out of the ready state',()=>{
 const cluster={id:'platform',endpoint:'https://example.invalid',status:'online',connections:[],nodes:[{name:'node',status:'online',cpu:0,maxcpu:4,mem:0,maxmem:100,uptime:100}],vms:[],datastores:[{id:'storage',node_name:'node',used:0,total:100,capacity_reported:false}]};
 const html=renderToStaticMarkup(<PlatformOperatingState cluster={cluster} onOpenNodes={()=>{}} onOpenVms={()=>{}} onOpenDatastores={()=>{}}/>);
 expect(html).toContain('Inventory data incomplete');
 expect(html).toContain('1 with unknown capacity');
 expect(html).not.toContain('Ready for operation');
 expect(html).not.toContain('1 healthy');
});

it('explains failed collection separately from an empty successful inventory',()=>{
 const render=(status:'available'|'unavailable')=>renderToStaticMarkup(<DatastoresCard stores={[]} emptyText="No active stores reported" sources={[{name:'pve001',datastores_status:status,datastores_checked_at:'2026-09-10T00:00:00Z'}]}/>);
 expect(render('available')).toContain('Storage inventory loaded');
 expect(render('available')).toContain('No active stores reported');
 expect(render('unavailable')).toContain('Storage inventory is incomplete');
 expect(render('unavailable')).toContain('API storage permissions');
 expect(render('unavailable')).toContain('Europe/Zurich');
 expect(render('unavailable')).not.toContain('No active stores reported');
});

it('shows inactive and disabled stores without counting their capacity as available',()=>{
 const base={id:'offline',node_name:'node',used:10,total:100,available:90};
 for(const [state,label] of [[{active:false},'Inactive'],[{active:true,enabled:false},'Disabled'],[{active:null},'Status not reported']] as const){
  const store={...base,...state};
  expect(datastoreStatus(store)).toBe(label);
  expect(preferredDatastores([store])).toEqual([]);
  const html=renderToStaticMarkup(<DatastoresCard stores={[store]} emptyText="None"/>);
  expect(html).toContain(label);
  expect(html).not.toContain('10 %');
 }
});

it('distinguishes disabled storage from unavailable storage and retains known issues alongside missing data',()=>{
 const normal={id:'normal',node_name:'node',active:true,enabled:true,used:10,total:100};
 const cluster={id:'platform',endpoint:'https://example.invalid',status:'online',connections:[],nodes:[{name:'node',status:'online',cpu:0,maxcpu:4,mem:0,maxmem:100,uptime:100,datastores_status:'available' as const}],vms:[]};
 const render=(stores:typeof normal[])=>renderToStaticMarkup(<PlatformOperatingState cluster={{...cluster,datastores:stores}} onOpenNodes={()=>{}} onOpenVms={()=>{}} onOpenDatastores={()=>{}}/>);
 const disabled=render([normal,{...normal,id:'disabled',active:false,enabled:false}]);
 expect(disabled).toContain('Ready for operation');
 expect(disabled).toContain('1 disabled');
 const inactive=render([normal,{...normal,id:'offline',active:false}]);
 expect(inactive).toContain('1 review required');
 expect(inactive).toContain('1 inactive');
 expect(inactive).not.toContain('Ready for operation');
 const mixed=render([{...normal,used:95},{...normal,id:'unknown',total:0}]);
 expect(mixed).toContain('1 review required · Inventory data incomplete');
 expect(mixed).toContain('1 with high utilization');
 expect(mixed).toContain('1 with unknown capacity');
});

it('explains configured storage content and keeps unknown metadata explicit',()=>{
 const base={id:'archive',node_name:'node',used:10,total:100};
 expect(datastoreContent({...base,content:['images','rootdir','backup','future-type']})).toBe('VM disks, Container filesystems, Backups, future-type');
 const html=renderToStaticMarkup(<DatastoresCard stores={[{...base,content:['iso','backup'],shared:true}, {...base,id:'unknown'}]} emptyText="None"/>);
 expect(html).toContain('ISO images, Backups');
 expect(html).toContain('Shared across nodes');
 expect(html).toContain('Content types not reported');
 expect(html).toContain('Sharing not reported');
});

it('combines text and operational filters without changing the inventory',()=>{
 const base={node_name:'pve001',used:10,total:100};
 const stores=[{...base,id:'alpha',type:'zfspool',active:true,content:['images']},{...base,id:'backup',type:'nfs',active:false},{...base,id:'disabled',active:true,enabled:false}];
 expect(filterDatastores(stores,' VM disks ','Active')).toEqual([stores[0]]);
 expect(filterDatastores(stores,'PVE001','Inactive')).toEqual([stores[1]]);
 expect(filterDatastores(stores,'nfs','Active')).toEqual([]);
 expect(filterDatastores(stores,'','Disabled')).toEqual([stores[2]]);
 expect(filterDatastores(stores,'')).toEqual(stores);
 expect(stores).toHaveLength(3);
});
