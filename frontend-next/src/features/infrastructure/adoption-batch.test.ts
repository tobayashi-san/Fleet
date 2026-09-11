import {describe,it,expect,vi} from 'vitest';
import {ApiError} from '@/lib/api';
import {adoptBatch,type AdoptionResult,type AdoptionGuest} from './adoption-batch';
const row=(id:number,status:AdoptionResult['status']='pending'):AdoptionResult=>({guest:{name:`Guest ${id}`,node_name:'node',vm_id:id},status});
describe('adoption batch',()=>{
  it('preserves individual outcomes and retries only rejected or pending targets',async()=>{
    let rows=[row(1),row(2),row(3),row(4)];
    const run=vi.fn(async (guest:AdoptionGuest)=>{if(guest.vm_id===2)throw new ApiError('No address',400);if(guest.vm_id===3)throw new ApiError('Timed out',408);if(guest.vm_id===4)throw new TypeError('Network failed');return {server:{id:'host-1'}};});
    const update=(next:AdoptionResult)=>{rows=rows.map(r=>r.guest.vm_id===next.guest.vm_id?next:r);};
    await adoptBatch(rows,run,update);
    expect(rows.map(r=>r.status)).toEqual(['succeeded','failed','unknown','unknown']);
    const retry=vi.fn(async (guest:AdoptionGuest)=>({server:{id:`host-${guest.vm_id}`}}));
    await adoptBatch(rows,retry,update);
    expect(retry).toHaveBeenCalledTimes(1);expect(retry.mock.calls[0][0].vm_id).toBe(2);
    expect(rows.map(r=>r.status)).toEqual(['succeeded','succeeded','unknown','unknown']);
  });
  it('does not submit remaining targets after context changes',async()=>{
    let allowed=true;const run=vi.fn(async()=>{allowed=false;return {server:{id:'host'}};});
    const updates:AdoptionResult[]=[];
    await adoptBatch([row(1),row(2)],run,r=>updates.push(r),()=>allowed);
    expect(run).toHaveBeenCalledTimes(1);expect(updates.map(r=>r.status)).toEqual(['running','succeeded']);
  });
  it('treats malformed success and server failures as uncertain',async()=>{
    const updates:AdoptionResult[]=[];
    await adoptBatch([row(1),row(2)],async guest=>{if(guest.vm_id===2)throw new ApiError('Internal error',500);return {server:{id:''}};},r=>updates.push(r));
    expect(updates.filter(r=>r.status==='unknown')).toHaveLength(2);
  });
});
