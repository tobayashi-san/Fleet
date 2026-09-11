export interface DeleteHostTarget { id:string; name:string; ip_address:string }
export interface DeleteHostOutcome extends DeleteHostTarget { deleted:boolean; error?:string }

/** Bounded requests with one outcome for every reviewed target, in input order. */
export async function deleteHostBatch(targets: DeleteHostTarget[], remove: (id:string)=>Promise<unknown>): Promise<DeleteHostOutcome[]> {
  const outcomes: DeleteHostOutcome[] = new Array(targets.length);
  let cursor=0;
  await Promise.all(Array.from({length:Math.min(4,targets.length)},async()=>{
    while (cursor < targets.length) {
      const index=cursor++;
      const target=targets[index];
      try {
        await remove(target.id);
        outcomes[index]={...target,deleted:true};
      } catch(error) {
        outcomes[index]={...target,deleted:false,error:error instanceof Error ? error.message : 'Deletion failed. Retry after checking the host.'};
      }
    }
  }));
  return outcomes;
}
