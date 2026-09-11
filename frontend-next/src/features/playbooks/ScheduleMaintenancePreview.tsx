import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { hasCap, useProfile } from '@/lib/queries';
import { formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { maintenanceAtStart, type ScheduleMaintenanceWindow } from './schedule-maintenance';

export function ScheduleMaintenancePreview({runs, targets, hosts, environmentId}: {
  runs: string[]; targets: string[]; hosts: Record<string, unknown>[]; environmentId: string;
}) {
  const profile = useProfile();
  const allowed = !profile.isError && hasCap(profile.data, 'canViewMaintenance');
  const windows = useQuery({
    queryKey: ['maintenance-windows', environmentId],
    queryFn: () => apiFetch<ScheduleMaintenanceWindow[]>(`/maintenance-windows?environment_id=${encodeURIComponent(environmentId)}`, {environmentId}),
    enabled: allowed,
    refetchInterval: 60_000,
  });
  return <section className="mt-3 space-y-2 break-words border-t pt-3" aria-label="Maintenance coverage">
    <p className="font-medium">Maintenance coverage at start</p>
    <p className="text-muted-foreground">Planning aid for the current host selection. Windows do not prevent or stop scheduled runs. Start coverage does not guarantee that the entire execution fits inside a window.</p>
    {profile.isPending ? <p>Checking maintenance access…</p>
      : profile.isError ? <div role="alert"><p>Maintenance access could not be checked.</p><Button size="sm" variant="outline" onClick={() => void profile.refetch()}>Retry access check</Button></div>
      : !allowed ? <p>Maintenance coverage is unavailable without permission to view maintenance windows.</p>
      : windows.isError ? <div role="alert"><p>Maintenance coverage could not be checked.</p><Button size="sm" variant="outline" onClick={() => void windows.refetch()}>Retry maintenance check</Button></div>
      : windows.isPending ? <p>Checking maintenance windows…</p>
      : !targets.length ? <p>Select hosts to check their maintenance coverage.</p>
      : <ol className="space-y-2">{runs.map(run => {
        const coverage = maintenanceAtStart(run, targets, hosts, windows.data || [], environmentId);
        return <li key={run} className="rounded border p-2">
          <p>{formatDateTime(run)} · <strong>{coverage.covered} / {coverage.total} targets covered</strong></p>
          {coverage.windows.length ? <ul className="mt-1">{coverage.windows.map(window => <li key={window.id}>{window.name} · ends {formatDateTime(window.ends_at)}</li>)}</ul> : <p className="text-muted-foreground">No matching maintenance window.</p>}
          {coverage.uncovered.length > 0 && <p className="text-warning">Outside a maintenance window: {coverage.uncovered.join(', ')}.</p>}
          {coverage.unresolved.length > 0 && <p className="text-warning">Cannot uniquely match to an inventory host: {coverage.unresolved.join(', ')}.</p>}
        </li>;
      })}</ol>}
    {allowed && windows.dataUpdatedAt > 0 && !windows.isError && <p className="text-muted-foreground">Windows checked: {formatDateTime(new Date(windows.dataUpdatedAt).toISOString())}. Future inventory changes can change coverage.</p>}
  </section>;
}
