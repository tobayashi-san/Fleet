import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { QueryErrorState } from '@/components/ui/query-error-state';
interface Cycle {startedAt:string;completedAt?:string;errors:number}
interface Runtime {
  checkedAt: string; restartPending: boolean; registeredSchedules: number; runningSchedules: number;
  pollers: Array<{id: string; enabled: boolean; scheduled: boolean; running: boolean; intervalMin: number; observations?:{current:Cycle|null;last:Cycle|null;history:Cycle[]}}>;
}
const labels: Record<string,string> = {info:'System information',updates:'OS updates',imageUpdates:'Image updates',customUpdates:'Custom updates',ipamSources:'IPAM source checks'};
export function PollingRuntime() {
  const query=useQuery({queryKey:['polling-runtime'],queryFn:()=>apiFetch<Runtime>('/system/polling-status'),refetchInterval:15_000});
  return <div className="space-y-3 py-3 text-sm">
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-muted-foreground">Current Shipyard process · all environments · refreshes every 15 seconds</p><Button size="sm" variant="outline" disabled={query.isFetching} onClick={()=>void query.refetch()}>Refresh runtime status</Button></div>
    {query.isError ? <QueryErrorState compact title="Runtime status unavailable" error={query.error} onRetry={()=>void query.refetch()}/> : query.isPending ? <p>Loading runtime status…</p> : <>
      <p>{query.data.registeredSchedules} registered playbook schedules · {query.data.runningSchedules} running scheduled executions</p>
      {query.data.restartPending && <p role="status" className="text-warning">Polling configuration is waiting to be applied.</p>}
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="py-2 pr-4">Collector</th><th className="pr-4">Configured interval</th><th className="pr-4">Runtime state</th><th>Recent collection cycles</th></tr></thead><tbody>{query.data.pollers.map(p=><tr key={p.id} className="border-b last:border-0"><td className="py-2 pr-4">{labels[p.id]||p.id}</td><td className="pr-4">{p.enabled ? `${p.intervalMin} min` : 'Disabled'}</td><td className={!p.scheduled&&p.enabled?'text-warning':''}>{p.running ? p.scheduled ? 'Running · next checks scheduled' : 'Running · no future timer' : p.scheduled ? 'Waiting for next check' : p.enabled ? 'No active timer' : 'Stopped'}</td><td className="py-2 pl-4 text-xs">{p.observations?.current && <p>Started {formatDateTime(p.observations.current.startedAt)}</p>}{p.observations?.last ? <details><summary className="cursor-pointer">{p.observations.last.errors ? `${p.observations.last.errors} reported failures` : 'Completed without reported failures'} · {formatDateTime(p.observations.last.completedAt)}</summary><ol className="mt-2 space-y-2">{p.observations.history.map((cycle,index)=><li key={index}>Started {formatDateTime(cycle.startedAt)}<br/>Completed {formatDateTime(cycle.completedAt)} · {cycle.errors} reported failures</li>)}</ol></details> : <p>No completed cycle observed</p>}</td></tr>)}</tbody></table></div>
      <p className="text-xs text-muted-foreground">Observed {formatDateTime(query.data.checkedAt)}. Timer state does not verify host connectivity or successful collection. These counts exclude manual executions; overlapping poller cycles are skipped rather than queued. IPAM sources also have individual intervals. Cycle observations retain the last 10 completions in this process and reset on restart. A cycle may have no eligible targets; completion does not guarantee fresh data for every host.</p>
    </>}
  </div>;
}
