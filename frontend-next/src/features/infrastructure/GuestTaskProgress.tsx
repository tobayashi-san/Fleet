import {useEffect} from 'react';
import {useQuery} from '@tanstack/react-query';
import {apiFetch} from '@/lib/api';
import {Button} from '@/components/ui/button';

type Props={apiRoot:string|null;environmentId:string;taskId:string;changed:boolean;operation:string;onTerminal:()=>void};
export function GuestTaskProgress({apiRoot,environmentId,taskId,changed,operation,onTerminal}:Props){
 const task=useQuery({queryKey:['proxmox-snapshot-task',environmentId,apiRoot,taskId],queryFn:()=>apiFetch<{status:string;exit_status?:string|null}>(`${apiRoot}/tasks/${encodeURIComponent(taskId)}/status`,{environmentId}),enabled:Boolean(taskId&&apiRoot)&&!changed,retry:false,refetchInterval:query=>query.state.data?.status==='running'?3000:false});
 useEffect(()=>{if(task.data?.status==='succeeded'||task.data?.status==='failed')onTerminal();},[task.data?.status,onTerminal]);
 return <div role="status" className="space-y-2 text-sm">
  <p>{task.isError?'Request accepted, but its current status could not be checked.':task.data?.status==='succeeded'?`${operation} succeeded according to Proxmox.`:task.data?.status==='failed'?`${operation} failed according to Proxmox.`:task.data?.status==='running'?`${operation} is running in Proxmox.`:task.isFetching?'Checking the accepted Proxmox task…':'Request accepted. Completion is not yet confirmed.'}</p>
  {task.data?.status==='failed'&&<p className="break-words text-destructive">{task.data.exit_status}</p>}
  {taskId&&<p className="break-all font-mono">Task: {taskId}</p>}
  {taskId&&(task.isError||task.data?.status==='unknown')&&<Button variant="outline" disabled={task.isFetching||changed} onClick={()=>void task.refetch()}>Check task status</Button>}
  <p className="text-xs text-muted-foreground">Closing this dialog does not cancel the Proxmox task.</p>
 </div>;
}
