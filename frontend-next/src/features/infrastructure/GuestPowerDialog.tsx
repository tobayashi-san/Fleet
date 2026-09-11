import {useRef,useState} from 'react';
import {useBlocker} from '@tanstack/react-router';
import {useMutation} from '@tanstack/react-query';
import {ApiError,apiFetch} from '@/lib/api';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Dialog,DialogContent,DialogDescription,DialogFooter,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {GuestTaskProgress} from './GuestTaskProgress';
export type GuestPowerAction='start'|'shutdown'|'reboot'|'stop';
const labels:Record<GuestPowerAction,string>={start:'Start',shutdown:'Shut down',reboot:'Restart',stop:'Force stop'};
const descriptions:Record<GuestPowerAction,string>={start:'Starts the guest. Its configured services may become available on the network.',shutdown:'Requests a graceful shutdown. Services in the guest will become unavailable.',reboot:'Restarts the guest. Services will be interrupted while it restarts.',stop:'Powers off the guest immediately. Unsaved data may be lost. Use graceful shutdown when possible.'};
type Props={action:GuestPowerAction|null;apiRoot:string|null;environmentId:string;guestName:string;onClose:()=>void;onAccepted:()=>void};
export function GuestPowerDialog(props:Props){return props.action?<PowerForm {...props} action={props.action}/>:null;}
function PowerForm(props:Props&{action:GuestPowerAction}){
 const[target]=useState(()=>({...props}));const[typed,setTyped]=useState('');const pending=useRef(false);
 const changed=props.apiRoot!==target.apiRoot||props.environmentId!==target.environmentId||props.action!==target.action||props.guestName!==target.guestName;
 const force=target.action==='stop';const confirmed=!force||typed===`STOP ${target.guestName}`;
 const run=useMutation({mutationFn:()=>{
  if(changed||!target.apiRoot||!confirmed)throw new Error('Confirm the original guest and environment before continuing.');
  return apiFetch<{task?:string}>(`${target.apiRoot}/power`,{method:'POST',environmentId:target.environmentId,body:{action:target.action,confirm_guest_name:force?target.guestName:undefined}});
 },onSuccess:()=>target.onAccepted(),onSettled:()=>{pending.current=false;}});
 const uncertain=run.isError&&!(run.error instanceof ApiError&&[400,403,404,409,422].includes(run.error.status));
 const submitted=run.isSuccess||uncertain;
 useBlocker({disabled:!run.isPending,enableBeforeUnload:run.isPending,shouldBlockFn:()=>pending.current});
 const close=()=>{if(!pending.current)props.onClose();};
 return <Dialog open onOpenChange={open=>{if(!open)close();}}><DialogContent className="max-w-lg">
  <DialogHeader><DialogTitle>{labels[target.action]} guest?</DialogTitle><DialogDescription>{descriptions[target.action]}</DialogDescription></DialogHeader>
  <p className="break-words text-sm"><strong>{target.guestName}</strong> · {target.environmentId}</p>
  {changed&&<p role="alert" className="text-sm text-amber-600">The guest, action or environment changed. Close this dialog and review the current target.</p>}
  {run.isError&&<div role="alert" className="space-y-2 text-sm text-destructive"><p>{run.error instanceof Error?run.error.message:'The action could not be submitted.'}</p>{uncertain&&<p>The request may have reached Proxmox. Check guest state and tasks before another attempt. This dialog will not repeat the request.</p>}</div>}
  {run.isSuccess&&<GuestTaskProgress apiRoot={target.apiRoot} environmentId={target.environmentId} taskId={typeof run.data?.task==='string'?run.data.task:''} changed={changed} operation={labels[target.action]} onTerminal={target.onAccepted}/>}
  {!submitted?<form className="space-y-4" aria-busy={run.isPending} onSubmit={event=>{event.preventDefault();if(pending.current||changed||!confirmed||!target.apiRoot)return;pending.current=true;run.mutate();}}>
   {force&&<div><Label htmlFor="force-stop-confirm">Enter STOP {target.guestName} to confirm</Label><Input id="force-stop-confirm" required autoComplete="off" value={typed} disabled={run.isPending||changed} onChange={e=>setTyped(e.target.value)}/></div>}
   {run.isPending&&<p role="status" className="text-sm">Submitting {labels[target.action].toLowerCase()} request…</p>}
   <DialogFooter><Button type="button" variant="outline" disabled={run.isPending} onClick={close}>Cancel</Button><Button type="submit" variant={force?'destructive':'default'} disabled={run.isPending||changed||!confirmed||!target.apiRoot}>{labels[target.action]}</Button></DialogFooter>
  </form>:<DialogFooter><Button onClick={close}>Close</Button></DialogFooter>}
 </DialogContent></Dialog>;
}
