import {it,expect} from 'vitest';
import {deleteHostBatch} from './delete-host-batch';

it('retains reviewed targets and failures while limiting simultaneous requests',async()=>{
  const targets=Array.from({length:9},(_,index)=>({id:String(index),name:`Host ${index}`,ip_address:`192.0.2.${index+1}`}));
  let active=0;let peak=0;
  const outcomes=await deleteHostBatch(targets,async id=>{
    active++;peak=Math.max(peak,active);
    await new Promise(resolve=>setTimeout(resolve,1));
    active--;
    if(id==='2')throw new Error('Host is busy');
  });
  expect(peak).toBe(4);
  expect(outcomes.map(row=>row.id)).toEqual(targets.map(row=>row.id));
  expect(outcomes.filter(row=>row.deleted)).toHaveLength(8);
  expect(outcomes[2]).toEqual({...targets[2],deleted:false,error:'Host is busy'});
});
