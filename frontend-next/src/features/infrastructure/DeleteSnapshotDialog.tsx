import {useRef,useState} from 'react';
import {useBlocker} from '@tanstack/react-router';
import {useMutation} from '@tanstack/react-query';
import {ApiError,apiFetch} from '@/lib/api';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Dialog,DialogContent,DialogDescription,DialogFooter,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {GuestTaskProgress} from './GuestTaskProgress';

type Props={snapshotName:string|null;apiRoot:string|null;environmentId:string;guestName:string;onClose:()=>void;onAccepted:()=>void};
export function DeleteSnapshotDialog(props:Props){return props.snapshotName!==null?<Deletion {...props} snapshotName={props.snapshotName}/>:null;}
function Deletion(props:Props&{snapshotName:string}){
 const[target]=useState(()=>({...props}));const[typed,setTyped]=useState('');const pending=useRef(false);
 const changed=props.apiRoot!==target.apiRoot||props.environmentId!==target.environmentId||props.snapshotName!==target.snapshotName;
 const removal=useMutation({mutationFn:()=>{
   if(changed||!target.apiRoot||typed!==target.snapshotName)throw new Error('Verify the original guest, environment and snapshot name.');
   return apiFetch<{task?:string}>(`${target.apiRoot}/snapshots/${encodeURIComponent(target.snapshotName)}`,{method:'DELETE',environmentId:target.environmentId});
 },onSuccess:()=>target.onAccepted(),onSettled:()=>{pending.current=false;}});
 const uncertain=removal.isError&&!(removal.error instanceof ApiError&&[400,403,404,409,422].includes(removal.error.status));
 const submitted=removal.isSuccess||uncertain;
 useBlocker({disabled:!removal.isPending,enableBeforeUnload:removal.isPending,shouldBlockFn:()=>pending.current});
 const close=()=>{if(!pending.current)props.onClose();};
 return <Dialog open onOpenChange={open=>{if(!open)close();}}><DialogContent className="max-w-lg">
  <DialogHeader><DialogTitle>Delete snapshot?</DialogTitle><DialogDescription>Deleting this snapshot removes this recovery point from Proxmox. The snapshot cannot be restored after deletion. The guest itself is not deleted.</DialogDescription></DialogHeader>
  <p className="break-words text-sm"><strong>{target.snapshotName}</strong> · {target.guestName} · {target.environmentId}</p>
  {changed&&<p role="alert" className="text-sm text-amber-600">The selected snapshot or environment changed. Return to the original target before submitting.</p>}
  {removal.isError&&<div role="alert" className="space-y-2 text-sm text-destructive"><p>{removal.error instanceof Error?removal.error.message:'Deletion failed.'}</p>{uncertain&&<p>The request may have reached Proxmox. Check its task and snapshot list before another attempt. This dialog will not repeat an uncertain request.</p>}</div>}
  {removal.isSuccess&&<GuestTaskProgress apiRoot={target.apiRoot} environmentId={target.environmentId} taskId={typeof removal.data?.task==='string'?removal.data.task:''} changed={changed} operation="Snapshot deletion" onTerminal={target.onAccepted}/>}
  {!submitted?<form className="space-y-4" aria-busy={removal.isPending} onSubmit={event=>{event.preventDefault();if(pending.current||changed||typed!==target.snapshotName||!target.apiRoot)return;pending.current=true;removal.mutate();}}>
   <div><Label htmlFor="delete-snapshot-name">Enter the snapshot name to confirm</Label><Input id="delete-snapshot-name" required autoComplete="off" value={typed} disabled={removal.isPending||changed} onChange={e=>setTyped(e.target.value)}/></div>
   {removal.isPending&&<p role="status" className="text-sm">Submitting deletion request…</p>}
   <DialogFooter><Button type="button" variant="outline" disabled={removal.isPending} onClick={close}>Cancel</Button><Button type="submit" variant="destructive" disabled={removal.isPending||changed||typed!==target.snapshotName||!target.apiRoot}>Delete snapshot</Button></DialogFooter>
  </form>:<DialogFooter><Button onClick={close}>Close</Button></DialogFooter>}
 </DialogContent></Dialog>;
}
