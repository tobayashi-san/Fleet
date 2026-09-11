import { expect, it } from 'vitest';
import { readSavedViews, savedViewKey, type HostView } from './saved-views';
const view: HostView = {search:'prod',tag:null,status:'online',group:'all',updates:true,attention:false,grouped:false,sort:'ip',columns:{state:true,contact:false,owner:true}};
it('retains a valid saved view and rejects corrupted or incompatible persisted filters',()=>{
 expect(readSavedViews(JSON.stringify([{name:'Production',view}]))).toEqual([{name:'Production',view}]);
 expect(readSavedViews('broken')).toEqual([]);
 expect(readSavedViews(JSON.stringify([{name:'Bad',view:{...view,status:'any'}},{name:'Bad2',view:{...view,updates:'true'}},{name:'Good',view}]))).toEqual([{name:'Good',view}]);
});
it('bounds stored views and keeps account/environment keys collision-free',()=>{
 expect(readSavedViews(JSON.stringify(Array.from({length:30},(_,i)=>({name:String(i),view}))))).toHaveLength(20);
 expect(savedViewKey('a:b','c')).not.toBe(savedViewKey('a','b:c'));
 expect(savedViewKey('alice','prod')).not.toBe(savedViewKey('bob','prod'));
 expect(savedViewKey('alice','prod')).not.toBe(savedViewKey('alice','test'));
});

it('retains severity filters, accepts older views and rejects unknown severity values',()=>{
 const critical={...view,severity:'critical'};
 expect(readSavedViews(JSON.stringify([{name:'Critical',view:critical}]))).toEqual([{name:'Critical',view:critical}]);
 const legacy={...view,columns:{state:true,contact:false}};
 expect(readSavedViews(JSON.stringify([{name:'Legacy',view:legacy}]))[0].view.columns.owner).toBe(false);
 expect(readSavedViews(JSON.stringify([{name:'Bad',view:{...view,severity:'fatal'}}]))).toEqual([]);
});
