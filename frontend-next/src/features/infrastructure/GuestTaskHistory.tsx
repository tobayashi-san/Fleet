import {useState} from 'react';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {apiFetch} from '@/lib/api';
import {Timestamp} from '@/components/ui/timestamp';
import {Card,CardContent,CardHeader,CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {QueryErrorState} from '@/components/ui/query-error-state';
import {StatusBadge} from '@/components/ui/status-badge';

type Task={task_id:string;action:string;resource_name:string;status:string;exit_status?:string|null;created_at:string;checked_at?:string|null};
type Page={tasks:Task[];total:number;offset:number;limit:number};
type Props={apiRoot:string;environmentId:string};
export function GuestTaskHistory(props:Props){return <History key={`${props.environmentId}:${props.apiRoot}`} {...props}/>;}
function History({apiRoot,environmentId}:Props){
 const[offset,setOffset]=useState(0);const client=useQueryClient();
 const key=['proxmox-guest-tasks',environmentId,apiRoot];
 const tasks=useQuery({queryKey:[...key,offset],queryFn:()=>apiFetch<Page>(`${apiRoot}/tasks?offset=${offset}`,{environmentId})});
 const check=useMutation({mutationFn:(taskId:string)=>apiFetch(`${apiRoot}/tasks/${encodeURIComponent(taskId)}/status`,{environmentId}),onSuccess:()=>{void client.invalidateQueries({queryKey:key});}});
 return <Card><CardHeader><CardTitle>Guest requests</CardTitle><p className="text-sm text-muted-foreground">Snapshot and power requests recorded by Fleet remain available after closing their dialogs. Status shows the last check; use Check status to read the current Proxmox result.</p></CardHeader><CardContent className="space-y-3">
  {tasks.isPending?<p>Loading recorded requests…</p>:tasks.isError?<QueryErrorState error={tasks.error} onRetry={()=>void tasks.refetch()}/>:<>
   {tasks.data.tasks.length===0?<p className="text-sm text-muted-foreground">No guest requests recorded on this page.</p>:<ul aria-label="Recorded guest requests" className="max-h-96 space-y-3 overflow-auto">{tasks.data.tasks.map(task=><li key={task.task_id} className="space-y-2 rounded-md border p-3">
    <div className="flex flex-wrap items-start justify-between gap-2"><strong className="break-all text-sm">{({snapshot_restore:'Restore snapshot',snapshot_delete:'Delete snapshot',snapshot_create:'Create snapshot',power_start:'Start',power_shutdown:'Shut down',power_reboot:'Restart',power_stop:'Force stop'} as Record<string,string>)[task.action]||task.action}: {task.resource_name}</strong><StatusBadge tone={task.status==='succeeded'?'success':task.status==='failed'?'danger':task.status==='running'?'info':'neutral'}>{{succeeded:'Succeeded',failed:'Failed',running:'Running',unknown:'Unknown'}[task.status]||'Unknown'}</StatusBadge></div>
    <p className="text-xs text-muted-foreground">Requested <Timestamp value={task.created_at}/> · {task.checked_at?<span>Last checked <Timestamp value={task.checked_at}/></span>:'Not checked yet'}</p>
    {task.status==='failed'&&task.exit_status&&<p className="break-words text-sm text-destructive">{task.exit_status}</p>}
    <details><summary className="cursor-pointer text-xs">Task ID</summary><p className="break-all font-mono text-xs">{task.task_id}</p></details>
    {check.isError&&check.variables===task.task_id&&<p role="alert" className="text-sm text-destructive">{check.error instanceof Error?check.error.message:'Task status could not be checked.'} The displayed status is the last recorded result.</p>}
    <Button variant="outline" size="sm" disabled={check.isPending} onClick={()=>check.mutate(task.task_id)}>{check.isPending&&check.variables===task.task_id?'Checking…':'Check status'}</Button>
   </li>)}</ul>}
   <div className="flex items-center justify-between gap-2 text-sm"><Button variant="outline" size="sm" disabled={offset===0||check.isPending} onClick={()=>setOffset(Math.max(0,offset-20))}>Previous</Button><span>{tasks.data.total===0?'0 requests':`${offset+1}–${Math.min(offset+tasks.data.tasks.length,tasks.data.total)} of ${tasks.data.total}`}</span><Button variant="outline" size="sm" disabled={offset+20>=tasks.data.total||check.isPending} onClick={()=>setOffset(offset+20)}>Next</Button></div>
  </>}
 </CardContent></Card>;
}
