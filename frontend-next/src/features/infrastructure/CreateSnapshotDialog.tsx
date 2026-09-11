import {GuestTaskProgress} from './GuestTaskProgress';
import {useRef,useState} from 'react';
import {useBlocker} from '@tanstack/react-router';
import {useMutation} from '@tanstack/react-query';
import {ApiError,apiFetch} from '@/lib/api';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Dialog,DialogContent,DialogDescription,DialogFooter,DialogHeader,DialogTitle} from '@/components/ui/dialog';

type Props={open:boolean;onOpenChange:(open:boolean)=>void;apiRoot:string|null;environmentId:string;guestName:string;guestType?:'qemu'|'lxc';onAccepted:()=>void};
export function CreateSnapshotDialog(props:Props){return props.open?<SnapshotForm {...props}/>:null;}
function SnapshotForm(props:Props){
 const[target]=useState(()=>({...props}));
 const[name,setName]=useState('');const[description,setDescription]=useState('');const[memory,setMemory]=useState(true);
 const pending=useRef(false);
 const changed=props.environmentId!==target.environmentId||props.apiRoot!==target.apiRoot||props.guestType!==target.guestType;
 const container=target.guestType==='lxc';
 const create=useMutation({mutationFn:()=>{
   if(changed||!target.apiRoot)throw new Error('Return to the original guest and environment before creating the snapshot.');
   return apiFetch<{task?:string}>(`${target.apiRoot}/snapshots`,{method:'POST',environmentId:target.environmentId,body:{name:name.trim(),description:description.trim(),include_memory:!container&&memory}});
 },onSuccess:()=>target.onAccepted(),onSettled:()=>{pending.current=false;}});
 const taskId=typeof create.data?.task==='string'?create.data.task:'';
 const uncertain=create.isError&&!(create.error instanceof ApiError&&[400,403,404,409,422].includes(create.error.status));
 const complete=create.isSuccess||uncertain;
 const dirty=!complete&&Boolean(name||description);
 useBlocker({disabled:!dirty&&!create.isPending,enableBeforeUnload:dirty||create.isPending,shouldBlockFn:()=>pending.current||(dirty&&!globalThis.confirm('Discard the snapshot draft and leave?'))});
 const close=()=>{if(pending.current)return;if(!dirty||globalThis.confirm('Discard the snapshot draft?'))props.onOpenChange(false);};
 return <Dialog open onOpenChange={next=>{if(!next)close();}}><DialogContent className="max-w-lg">
  <DialogHeader><DialogTitle>Create {container?'container':'VM'} snapshot</DialogTitle><DialogDescription>{container?'The LXC snapshot does not include running memory. Snapshot support depends on the guest storage.':'Choose whether to include VM memory. Including memory can take longer and requires additional storage.'} A snapshot does not replace an independent backup.</DialogDescription></DialogHeader>
  <p className="text-sm"><strong>{target.guestName}</strong> · {target.environmentId}</p>
  {changed&&<p role="alert" className="text-sm text-amber-600">The guest or environment changed. Return to the original context before submitting.</p>}
  {create.isSuccess&&<GuestTaskProgress apiRoot={target.apiRoot} environmentId={target.environmentId} taskId={taskId} changed={changed} operation="Snapshot creation" onTerminal={target.onAccepted}/>}
  {create.isError&&<div role="alert" className="space-y-2 text-sm text-destructive"><p>{create.error instanceof Error?create.error.message:'Snapshot request failed.'}</p>{uncertain&&<p>The request may have reached Proxmox. Check its tasks and snapshot list before submitting again. This dialog will not repeat an uncertain request.</p>}</div>}
  {!complete&&<form className="space-y-4" aria-busy={create.isPending} onSubmit={event=>{event.preventDefault();if(pending.current||changed||!target.apiRoot)return;pending.current=true;create.mutate();}}>
   <fieldset disabled={create.isPending||changed} className="space-y-3">
    <div><Label htmlFor="snapshot-name">Name</Label><Input id="snapshot-name" required maxLength={40} pattern="[A-Za-z0-9][A-Za-z0-9._\-]{0,39}" value={name} onChange={e=>setName(e.target.value)} placeholder="before-update"/><p className="text-xs text-muted-foreground">1–40 letters, digits, periods, underscores or hyphens. The name “current” is reserved.</p></div>
    <div><Label htmlFor="snapshot-description">Description (optional)</Label><Input id="snapshot-description" maxLength={512} value={description} onChange={e=>setDescription(e.target.value)}/></div>
    {!container&&<label className="flex gap-2 text-sm"><input type="checkbox" checked={memory} onChange={e=>setMemory(e.target.checked)}/>Include VM memory</label>}
   </fieldset>
   {create.isPending&&<p role="status" className="text-sm">Submitting snapshot request…</p>}
   <DialogFooter><Button type="button" variant="outline" disabled={create.isPending} onClick={close}>Cancel</Button><Button disabled={create.isPending||changed||!target.apiRoot||name.trim()==='current'} type="submit">Create snapshot</Button></DialogFooter>
  </form>}
  {complete&&<DialogFooter><Button onClick={close}>Close</Button></DialogFooter>}
 </DialogContent></Dialog>;
}
