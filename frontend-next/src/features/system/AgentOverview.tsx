import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {apiFetch} from '@/lib/api';
import {formatDateTime} from '@/lib/utils';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {QueryErrorState} from '@/components/ui/query-error-state';
interface Overview {
  checkedAt:string;enabled:boolean;total:number;counts:Record<string,number>;
  hosts:Array<{id:string;name:string;environmentId:string;mode:string;effectiveMode:string;reportState:string|null;lastSeen:string|null;intervalSeconds:number;runnerVersion:string|null}>;
}
const reportLabels:Record<string,string>={recent:'Recent report',overdue:'Report overdue',never:'No report received',invalid:'Invalid or future report time'};
export function AgentOverview(){
  const [search,setSearch]=useState('');
  const [page,setPage]=useState(0);
  const query=useQuery({queryKey:['agent-overview'],queryFn:()=>apiFetch<Overview>('/system/agent-overview'),refetchInterval:30_000});
  const hosts=query.data?.hosts.filter(host=>`${host.name} ${host.environmentId} ${host.mode} ${reportLabels[host.reportState||'']||''}`.toLowerCase().includes(search.toLowerCase()))||[];
  const currentPage=Math.min(page,Math.max(0,Math.ceil(hosts.length/50)-1));
  return <div className="space-y-3 py-3 text-sm">
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-muted-foreground">Managed hosts across all environments · refreshes every 30 seconds</p><Button size="sm" variant="outline" disabled={query.isFetching} onClick={()=>void query.refetch()}>Refresh agent overview</Button></div>
    {query.isError?<QueryErrorState compact title="Agent overview unavailable" error={query.error} onRetry={()=>void query.refetch()}/>:query.isPending?<p>Loading agent overview…</p>:<>
      <p>{query.data.total} hosts · {query.data.counts.ssh} SSH · {query.data.counts.push} push agent · {query.data.counts.pull} pull agent</p>
      <p>{query.data.counts.recent} recent reports · {query.data.counts.overdue} overdue · {query.data.counts.never} never reported · {query.data.counts.invalid} invalid timestamps</p>
      {!query.data.enabled&&<p className="text-warning">Agent processing is disabled globally. Configured agent modes are retained; SSH is selected for system-information collection.</p>}
      <Input aria-label="Filter agent hosts" value={search} onChange={event=>{setSearch(event.target.value);setPage(0);}} placeholder="Filter by host, environment, mode or report state"/>
      <p className="text-xs text-muted-foreground">Page {currentPage+1} of {Math.max(1,Math.ceil(hosts.length/50))} · {hosts.length} matching hosts</p>
      {!hosts.length?<p>No matching hosts.</p>:<div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="border-b"><th className="py-2 pr-4">Host / environment</th><th className="pr-4">Configured / selected mode</th><th>Last report</th></tr></thead><tbody>{hosts.slice(currentPage*50,currentPage*50+50).map(host=><tr key={host.id} className="border-b last:border-0"><td className="py-2 pr-4">{host.name}<p className="text-xs text-muted-foreground">{host.environmentId}</p></td><td className="pr-4">{host.mode} / {host.effectiveMode}<p className="text-xs text-muted-foreground">{host.mode!=='ssh'?`${host.intervalSeconds}s interval · Runner ${host.runnerVersion||'not reported'}`:'SSH collection'}</p></td><td>{host.reportState?reportLabels[host.reportState]:'Not applicable'}{host.reportState&&<p className="text-xs text-muted-foreground">{formatDateTime(host.lastSeen)}</p>}</td></tr>)}</tbody></table></div>}
      {hosts.length>50&&<div className="flex gap-2"><Button variant="outline" disabled={currentPage===0} onClick={()=>setPage(currentPage-1)}>Previous hosts</Button><Button variant="outline" disabled={(currentPage+1)*50>=hosts.length} onClick={()=>setPage(currentPage+1)}>Next hosts</Button></div>}
      <p className="text-xs text-muted-foreground">Observed {formatDateTime(query.data.checkedAt)}. Recent means reported within ten configured intervals, with a minimum interval of five seconds. Report age does not prove current connectivity; the selected agent path may fall back to SSH, including push agents that have never reported. Manage an individual host from its server details.</p>
    </>}
  </div>;
}
