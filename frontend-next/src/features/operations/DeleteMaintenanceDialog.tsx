import {useRef,useState} from 'react';
import {useBlocker} from '@tanstack/react-router';
import {useQueryClient} from '@tanstack/react-query';
import {ApiError,apiFetch} from '@/lib/api';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogDescription,DialogFooter,DialogHeader,DialogTitle} from '@/components/ui/dialog';
type WindowTarget={id:string;name:string;revision?:string};
type Props={mode?:'delete'|'cancel';windows:WindowTarget[];environmentId:string;onClose:()=>void;onDeleted?:(id:string)=>void};
export function DeleteMaintenanceDialog(props:Props){return props.windows.length?<Deletion {...props}/>:null;}
function Deletion(props:Props){
 const[target]=useState(()=>({windows:props.windows.map(row=>({...row})),environmentId:props.environmentId,mode:props.mode||'delete'}));
 const cancelling=target.mode==='cancel';const[reason,setReason]=useState('');
 const[result,setResult]=useState<Record<string,string>>({});const[running,setRunning]=useState(false);const[started,setStarted]=useState(false);const busy=useRef(false);const currentEnvironment=useRef(props.environmentId);currentEnvironment.current=props.environmentId;
 const client=useQueryClient();const changed=props.environmentId!==target.environmentId;
 useBlocker({disabled:!running,enableBeforeUnload:running,shouldBlockFn:()=>busy.current});
 const close=()=>{if(!busy.current)props.onClose();};
 const run=async()=>{
  if(busy.current||started||changed||(cancelling&&!reason.trim()))return;busy.current=true;setRunning(true);setStarted(true);
  try{for(const row of target.windows){
   if(currentEnvironment.current!==target.environmentId){setResult(previous=>({...previous,[row.id]:'Not submitted: environment changed.'}));continue;}
   setResult(previous=>({...previous,[row.id]:cancelling?'Cancelling…':'Removing…'}));
   try{await apiFetch(`/maintenance-windows/${encodeURIComponent(row.id)}${cancelling?'/cancel':''}`,{method:cancelling?'POST':'DELETE',environmentId:target.environmentId,body:{revision:row.revision,...(cancelling?{reason}:{})}});setResult(previous=>({...previous,[row.id]:cancelling?'Cancelled':'Removed'}));props.onDeleted?.(row.id);}
   catch(error){const known=error instanceof ApiError&&[400,403,404,409,422].includes(error.status);setResult(previous=>({...previous,[row.id]:`${known?(cancelling?'Not cancelled':'Not removed'):'Outcome unknown; refresh before another attempt'}. ${error instanceof Error?error.message:'Request failed.'}`}));}
  }}finally{busy.current=false;setRunning(false);void client.invalidateQueries({queryKey:['maintenance-windows',target.environmentId]});void client.invalidateQueries({queryKey:['audit-log']});}
 };
 return <Dialog open onOpenChange={open=>{if(!open)close();}}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>{cancelling?'Cancel maintenance windows?':'Delete maintenance windows?'}</DialogTitle><DialogDescription>{cancelling?'Keeps these windows in history with a cancellation reason and ends their maintenance suppression. Running jobs are not stopped.':'Removes these scheduled windows and their maintenance suppression. Running jobs are not cancelled. This cannot be undone.'}</DialogDescription></DialogHeader>
 <p className="text-sm">Environment: <strong>{target.environmentId}</strong> · {target.windows.length} selected</p>
 {changed&&<p role="alert" className="text-sm text-destructive">Environment changed. Close and review the current selection.</p>}
 {cancelling&&!started&&<div><Label htmlFor="maintenance-cancel-reason">Cancellation reason</Label><Input id="maintenance-cancel-reason" required maxLength={500} value={reason} onChange={event=>setReason(event.target.value)}/></div>}
 <ul aria-live="polite" className="max-h-72 space-y-2 overflow-auto">{target.windows.map(row=><li key={row.id} className="rounded border p-3 text-sm"><strong className="break-words">{row.name}</strong>{result[row.id]&&<p className="mt-1 break-words">{result[row.id]}</p>}</li>)}</ul>
 {started&&!running&&<p className="text-sm text-muted-foreground">Review the results before closing. Refresh and review changed windows before trying them again.</p>}
 <DialogFooter><Button variant="outline" disabled={running} onClick={close}>{started?'Close':cancelling?'Back':'Cancel'}</Button>{!started&&<Button variant="destructive" disabled={changed||(cancelling&&!reason.trim())} onClick={()=>void run()}>{cancelling?'Cancel selected windows':'Delete'}</Button>}</DialogFooter></DialogContent></Dialog>;
}
