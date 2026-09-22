import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useUi } from '@/lib/store';
import { hasCap, useProfile } from '@/lib/queries';
import { Timestamp } from '@/components/ui/timestamp';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { catalogStatus, pendingUpdates, type Catalog, type UpdateHost } from '@/features/updates/model';

function CatalogCell({ host, catalog, kind }: { host: UpdateHost; catalog: Catalog; kind: 'system' | 'docker' }) {
  const status = catalogStatus(catalog, kind);
  const items = kind === 'system' ? catalog.updates : catalog.updates.filter(item => !['up_to_date', 'updated'].includes(item.status || ''));
  const title = kind === 'system' ? 'System' : 'Docker';
  const badge = <StatusBadge tone={status.tone}>{status.label}</StatusBadge>;
  return <section aria-label={`${title} updates for ${host.name}`} className="min-w-0">
    {items.length > 0 ? <details className="group">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 marker:hidden">{badge}<ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-open:rotate-90" aria-hidden="true" /></summary>
      <ul className="mt-2 max-h-56 space-y-1.5 overflow-y-auto text-xs">{items.map((item, index) => <li key={index} className="break-words">
        <span className="font-medium">{kind === 'system' ? item.package : item.container_name || item.image}</span>{' '}
        <span className="break-all text-muted-foreground">{kind === 'system' ? `${item.current_version || 'installed'} → ${item.version || 'available'}${item.phased ? ' · phased' : ''}` : `${item.image || ''}${item.status === 'update_available' ? '' : ' · check required'}`}</span>
      </li>)}</ul>
      <Link to="/servers/$id" params={{ id: host.id }} hash={kind === 'system' ? 'tab=updates' : 'tab=docker'} className="mt-2 inline-block text-xs text-primary hover:underline">Open {title.toLowerCase()} updates</Link>
    </details> : badge}
    {catalog.failure && <p role="status" className="mt-1 break-words text-xs text-destructive">{catalog.failure.reason}</p>}
  </section>;
}

function lastCheck(host: UpdateHost, withDocker: boolean) {
  const times = [host.system.checked_at, withDocker ? host.docker?.checked_at : null].filter((value): value is string => Boolean(value));
  return times.sort()[0] || null;
}

export function UpdatesPage() {
  const environmentId = useUi(state => state.environmentId);
  const { data: profile } = useProfile();
  const canViewDocker = hasCap(profile, 'canViewDocker');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const query = useQuery({
    queryKey: ['update-dashboard', environmentId],
    queryFn: () => apiFetch<UpdateHost[]>('/servers/update-dashboard', { environmentId }),
    refetchInterval: 30_000,
  });
  const hosts = query.data || [];
  const count = (host: UpdateHost) => pendingUpdates(host.system, 'system').length + (canViewDocker && host.docker ? pendingUpdates(host.docker, 'docker').length : 0);
  const needsCheck = (host: UpdateHost) => catalogStatus(host.system, 'system').needsCheck || (canViewDocker && host.docker && catalogStatus(host.docker, 'docker').needsCheck);
  const visible = hosts.filter(host => `${host.name} ${host.ip_address || ''}`.toLowerCase().includes(search.toLowerCase()) && (filter === 'all' || (filter === 'available' ? count(host) > 0 : filter === 'reboot' ? host.reboot_required : needsCheck(host))))
    .sort((a, b) => count(b) - count(a) || a.name.localeCompare(b.name));
  const columns = canViewDocker ? 'md:grid-cols-[minmax(12rem,1.4fr)_minmax(8rem,1fr)_minmax(8rem,1fr)_7rem_8rem_2rem]' : 'md:grid-cols-[minmax(12rem,1.4fr)_minmax(8rem,1fr)_7rem_8rem_2rem]';
  const cellLabel = 'text-[11px] font-medium uppercase tracking-wide text-muted-foreground md:hidden';
  return <div className="space-y-5">
    <PageHeader title="Updates" description="System packages and Docker images across your hosts. Open a host to check or install updates." />
    {query.isError ? <QueryErrorState error={query.error} title="Updates could not be loaded" onRetry={() => void query.refetch()} /> : query.isPending ? <p role="status" className="text-sm text-muted-foreground">Loading updates…</p> : <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[
        ['System updates', hosts.reduce((sum, host) => sum + pendingUpdates(host.system, 'system').length, 0)],
        ...(canViewDocker ? [['Docker updates', hosts.reduce((sum, host) => sum + (host.docker ? pendingUpdates(host.docker, 'docker').length : 0), 0)]] : []),
        ['Outdated checks', hosts.filter(needsCheck).length], ['Reboot required', hosts.filter(host => host.reboot_required).length],
      ].map(([label, value]) => <Card key={label}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p></CardContent></Card>)}</div>
      <div className="flex flex-wrap gap-3"><Input aria-label="Search hosts" placeholder="Search hosts…" value={search} onChange={event => setSearch(event.target.value)} className="sm:max-w-xs" /><select aria-label="Filter updates" value={filter} onChange={event => setFilter(event.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm"><option value="all">All hosts</option><option value="available">Updates available</option><option value="check">Outdated or missing check</option><option value="reboot">Reboot required</option></select></div>
      {!visible.length ? <p className="rounded-md border p-6 text-sm text-muted-foreground">{hosts.length ? 'No hosts match this filter.' : 'No hosts in this environment.'}</p> : <div className="overflow-hidden rounded-panel border bg-card" role="table" aria-label="Updates by host">
        <div role="row" className={`hidden gap-4 border-b bg-muted/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground md:grid ${columns}`}>
          <span role="columnheader">Host</span><span role="columnheader">System</span>{canViewDocker && <span role="columnheader">Docker</span>}<span role="columnheader">Reboot</span><span role="columnheader">Last check</span><span role="columnheader"><span className="sr-only">Open</span></span>
        </div>
        {visible.map(host => { const checked = lastCheck(host, canViewDocker); return <div key={host.id} role="row" className={`grid grid-cols-2 items-start gap-x-4 gap-y-2 border-b px-4 py-3 last:border-b-0 hover:bg-muted/30 md:items-center ${columns}`}>
          <div role="cell" className="col-span-2 min-w-0 md:col-span-1"><div className="flex min-w-0 flex-wrap items-center gap-2"><Link to="/servers/$id" params={{ id: host.id }} className="truncate font-medium hover:underline">{host.name}</Link>{host.status !== 'online' && <StatusBadge tone={host.status === 'offline' ? 'danger' : 'muted'}>{host.status === 'offline' ? 'Offline' : 'Check connection'}</StatusBadge>}</div><p className="truncate font-mono text-xs text-muted-foreground">{host.ip_address}</p></div>
          <div role="cell" className="min-w-0"><p className={cellLabel}>System</p><CatalogCell host={host} catalog={host.system} kind="system" /></div>
          {canViewDocker && <div role="cell" className="min-w-0"><p className={cellLabel}>Docker</p>{host.docker ? <CatalogCell host={host} catalog={host.docker} kind="docker" /> : <span className="text-sm text-muted-foreground">—</span>}</div>}
          <div role="cell"><p className={cellLabel}>Reboot</p>{host.reboot_required ? <StatusBadge tone="warning">Required</StatusBadge> : <span className="text-sm text-muted-foreground">—</span>}</div>
          <div role="cell" className="text-sm text-muted-foreground"><p className={cellLabel}>Last check</p>{checked ? <Timestamp value={checked} /> : 'Never'}</div>
          <div role="cell" className="hidden md:block"><Link to="/servers/$id" params={{ id: host.id }} hash="tab=updates" aria-label={`Open ${host.name}`} className="flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground"><ChevronRight className="h-4 w-4" /></Link></div>
        </div>; })}
      </div>}
    </>}
  </div>;
}
