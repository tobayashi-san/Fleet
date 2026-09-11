import {useRef,useState} from 'react';
import {useBlocker} from '@tanstack/react-router';
import {useMutation} from '@tanstack/react-query';
import {ApiError,apiFetch} from '@/lib/api';
import {formatDateTime} from '@/lib/utils';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Dialog,DialogContent,DialogDescription,DialogFooter,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {GuestTaskProgress} from './GuestTaskProgress';

type Props={snapshotName:string|null;apiRoot:string|null;environmentId:string;guestName:string;snapshotTime:number|null;onClose:()=>void;onAccepted:()=>void};
export function RestoreSnapshotDialog(props:Props){return props.snapshotName!==null?<Restoration {...props} snapshotName={props.snapshotName}/>:null;}
function Restoration(props:Props&{snapshotName:string}){
 const[target]=useState(()=>({...props}));const[typed,setTyped]=useState('');const pending=useRef(false);
 const changed=props.apiRoot!==target.apiRoot||props.environmentId!==target.environmentId||props.snapshotName!==target.snapshotName||props.snapshotTime!==target.snapshotTime||props.guestName!==target.guestName;
 const restoration=useMutation({mutationFn:()=>{
   if(changed||!target.apiRoot||typed!==target.snapshotName)throw new Error('Verify the original guest, environment and snapshot name.');
   return apiFetch<{task?:string}>(`${target.apiRoot}/snapshots/${encodeURIComponent(target.snapshotName)}/restore`,{method:'POST',environmentId:target.environmentId,body:{confirm_guest_name:target.guestName,confirm_snaptime:target.snapshotTime}});
 },onSuccess:()=>target.onAccepted(),onSettled:()=>{pending.current=false;}});
 const uncertain=restoration.isError&&!(restoration.error instanceof ApiError&&[400,403,404,409,422].includes(restoration.error.status));
 const submitted=restoration.isSuccess||uncertain;
 useBlocker({disabled:!restoration.isPending,enableBeforeUnload:restoration.isPending,shouldBlockFn:()=>pending.current});
 const close=()=>{if(!pending.current)props.onClose();};
 return <Dialog open onOpenChange={open=>{if(!open)close();}}><DialogContent className="max-w-lg">
  <DialogHeader><DialogTitle>Restore snapshot?</DialogTitle><DialogDescription>Restoring replaces the guest state with this snapshot. Changes made since it was taken will be lost and services may be interrupted. Save a separate recovery point first if you need the current state. Check the guest and its services after restoration.</DialogDescription></DialogHeader>
  <p className="break-words text-sm"><strong>{target.snapshotName}</strong> · {target.guestName} · {target.environmentId}</p><p className="text-sm text-muted-foreground">Recovery point: {target.snapshotTime ? formatDateTime(target.snapshotTime*1000) : 'Time unavailable'}. No additional start request is sent.</p>
  {changed&&<p role="alert" className="text-sm text-amber-600">The selected snapshot or environment changed. Return to the original target before submitting.</p>}
  {restoration.isError&&<div role="alert" className="space-y-2 text-sm text-destructive"><p>{restoration.error instanceof Error?restoration.error.message:'Restoration failed.'}</p>{uncertain&&<p>The request may have reached Proxmox. Check its task and snapshot list before another attempt. This dialog will not repeat an uncertain request.</p>}</div>}
  {restoration.isSuccess&&<GuestTaskProgress apiRoot={target.apiRoot} environmentId={target.environmentId} taskId={typeof restoration.data?.task==='string'?restoration.data.task:''} changed={changed} operation="Snapshot restoration" onTerminal={target.onAccepted}/>}
  {!submitted?<form className="space-y-4" aria-busy={restoration.isPending} onSubmit={event=>{event.preventDefault();if(pending.current||changed||typed!==target.snapshotName||!target.apiRoot)return;pending.current=true;restoration.mutate();}}>
   <div><Label htmlFor="restore-snapshot-name">Enter the snapshot name to confirm</Label><Input id="restore-snapshot-name" required autoComplete="off" value={typed} disabled={restoration.isPending||changed} onChange={e=>setTyped(e.target.value)}/></div>
   {restoration.isPending&&<p role="status" className="text-sm">Submitting restoration request…</p>}
   <DialogFooter><Button type="button" variant="outline" disabled={restoration.isPending} onClick={close}>Cancel</Button><Button type="submit" variant="destructive" disabled={restoration.isPending||changed||typed!==target.snapshotName||!target.apiRoot}>Restore snapshot</Button></DialogFooter>
  </form>:<DialogFooter><Button onClick={close}>Close</Button></DialogFooter>}
 </DialogContent></Dialog>;
}
