import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { RefreshCw } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useUi } from '@/lib/store';
import { hasCap, useProfile } from '@/lib/queries';
import { formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { catalogStatus, pendingUpdates, type Catalog, type UpdateHost } from '@/features/updates/model';

function CatalogView({ host, catalog, kind }: { host: UpdateHost; catalog: Catalog; kind: 'system' | 'docker' }) {
  const status = catalogStatus(catalog, kind);
  const pending = pendingUpdates(catalog, kind);
  const items = kind === 'system' ? catalog.updates : catalog.updates.filter(item => !['up_to_date', 'updated'].includes(item.status || ''));
  const title = kind === 'system' ? 'System' : 'Docker';
  return <section aria-label={`${title} updates for ${host.name}`} className="min-w-0 space-y-3 rounded-md border p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{title}</h3><StatusBadge tone={status.tone}>{status.label}</StatusBadge></div>
    <p className="text-xs text-muted-foreground">{catalog.checked_at ? `Checked ${formatDateTime(catalog.checked_at)}` : 'No check recorded'}</p>
    {catalog.failure && <p role="status" className="break-words text-sm text-destructive">{catalog.failure.reason}</p>}
    {items.length > 0 ? <details><summary className="cursor-pointer text-sm">{pending.length} available{items.length > pending.length ? ' · more results' : ''}</summary><ul className="mt-3 max-h-64 space-y-2 overflow-y-auto text-sm">{items.map((item, index) => <li key={index} className="break-words border-t pt-2">
      <p className="font-medium">{kind === 'system' ? item.package : item.container_name || item.image}</p>
      <p className="break-all text-xs text-muted-foreground">{kind === 'system' ? `${item.current_version || 'Installed'} → ${item.version || 'Available version'}${item.phased ? ' · Phased rollout' : ''}` : `${item.image || ''} · ${item.status === 'update_available' ? 'Update available' : 'Check required'}`}</p>
    </li>)}</ul></details> : <p className="text-sm text-muted-foreground">{status.needsCheck ? 'Check this host for current results.' : 'No updates available.'}</p>}
    <Button asChild variant="outline" size="sm"><Link to="/servers/$id" params={{ id: host.id }} hash={kind === 'system' ? 'tab=updates' : 'tab=docker'}>Open {title.toLowerCase()} updates</Link></Button>
  </section>;
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
  return <div className="space-y-5">
    <PageHeader title="Updates" description="System packages and Docker images across your hosts." actions={<Button variant="outline" disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw className={query.isFetching ? 'animate-spin' : ''} />Refresh overview</Button>} />
    {query.isError ? <QueryErrorState error={query.error} title="Updates could not be loaded" onRetry={() => void query.refetch()} /> : query.isPending ? <p role="status" className="text-sm text-muted-foreground">Loading updates…</p> : <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[
        ['System updates', hosts.reduce((sum, host) => sum + pendingUpdates(host.system, 'system').length, 0)],
        ...(canViewDocker ? [['Docker updates', hosts.reduce((sum, host) => sum + (host.docker ? pendingUpdates(host.docker, 'docker').length : 0), 0)]] : []),
        ['Hosts to check', hosts.filter(needsCheck).length], ['Reboot required', hosts.filter(host => host.reboot_required).length],
      ].map(([label, value]) => <Card key={label}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p></CardContent></Card>)}</div>
      <div className="flex flex-wrap gap-3"><Input aria-label="Search hosts" placeholder="Search hosts…" value={search} onChange={event => setSearch(event.target.value)} className="sm:max-w-xs" /><select aria-label="Filter updates" value={filter} onChange={event => setFilter(event.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm"><option value="all">All hosts</option><option value="available">Updates available</option><option value="check">Needs checking</option><option value="reboot">Reboot required</option></select></div>
      <p className="text-xs text-muted-foreground">Saved check results · refresh reloads this overview. Open a host to check or install updates.</p>
      {!visible.length && <p className="rounded-md border p-6 text-sm text-muted-foreground">{hosts.length ? 'No hosts match this filter.' : 'No hosts in this environment.'}</p>}
      {visible.map(host => <Card key={host.id}><CardContent className="space-y-4 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><Link to="/servers/$id" params={{ id: host.id }} className="text-base font-semibold hover:underline">{host.name}</Link><p className="text-xs text-muted-foreground">{host.ip_address}</p></div><div className="flex flex-wrap gap-2"><StatusBadge tone={host.status === 'online' ? 'success' : host.status === 'offline' ? 'danger' : 'muted'}>{host.status === 'online' ? 'Connected' : host.status === 'offline' ? 'Offline' : 'Check connection'}</StatusBadge>{host.reboot_required && <StatusBadge tone="warning">Reboot required</StatusBadge>}</div></div><div className={`grid gap-4 ${canViewDocker && host.docker ? 'lg:grid-cols-2' : ''}`}><CatalogView host={host} catalog={host.system} kind="system" />{canViewDocker && host.docker && <CatalogView host={host} catalog={host.docker} kind="docker" />}</div></CardContent></Card>)}
    </>}
  </div>;
}
