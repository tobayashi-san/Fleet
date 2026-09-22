import { CreateServerDialog } from '@/components/CreateServerDialog';
import { VmId } from "@/components/VmId";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { ImportProxmoxVmDialog } from '@/features/infrastructure/ImportProxmoxVmDialog';
import type { InfrastructureResponse, Vm } from '@/features/infrastructure/detail-model';
import { api, apiFetch } from '@/lib/api';
import { canAccessInfrastructure, hasCap, useProfile } from '@/lib/queries';
import { useUi } from '@/lib/store';
import { Timestamp } from '@/components/ui/timestamp';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import type { ServerGroup, ServerRow } from './server-list-utils';
function connectionLabel(host: ServerRow) {
  if (host.deployment && host.deployment.deployment_phase !== 'ready') return !host.ip_address ? 'Waiting for IP' : host.deployment.status === 'failed' ? 'Connection or deployment failed' : host.deployment.deployment_phase === 'connect_host' ? 'Checking connection' : 'Finishing deployment';
  return host.status === 'online' ? 'Connected' : ['offline','error'].includes(host.status || '') ? 'Unreachable' : 'Not checked';
}
function Connection({ host }: { host: ServerRow }) {
  return <span className="inline-flex" title={host.last_seen ? undefined : 'Never checked'}>
    <StatusBadge tone={host.status === 'online' ? 'success' : ['offline','error'].includes(host.status || '') ? 'danger' : 'muted'}>{connectionLabel(host)}</StatusBadge>
  </span>;
}
function percent(used?: number | null, total?: number | null) {
  return used != null && total ? Math.round((used / total) * 100) : null;
}
/** Compact usage bar; colour changes only when action is needed. */
function Usage({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null;
  const tone = value >= 90 ? 'bg-destructive' : value >= 80 ? 'bg-[hsl(var(--warning))]' : 'bg-muted-foreground/45';
  return <div className="flex items-center gap-2 text-xs" title={`${label} ${value}%`}>
    <span className="w-8 text-muted-foreground">{label}</span>
    <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted"><span className={cn('block h-full rounded-full', tone)} style={{ width: `${Math.min(value, 100)}%` }} /></span>
    <span className={cn('w-9 text-right tabular-nums', value >= 80 ? 'font-medium text-foreground' : 'text-muted-foreground')}>{value}%</span>
  </div>;
}
function Resources({ host }: { host: ServerRow }) {
  const disk = percent(host.resources?.disk_used_gb, host.resources?.disk_total_gb);
  const ram = percent(host.resources?.ram_used_mb, host.resources?.ram_total_mb);
  if (disk === null && ram === null) return <span className="text-muted-foreground">—</span>;
  return <div className="space-y-1"><Usage label="Disk" value={disk} /><Usage label="RAM" value={ram} /></div>;
}
function Updates({ host }: { host: ServerRow }) {
  if (host.updates_count === undefined && host.image_updates_count === undefined) return <span className="text-muted-foreground">—</span>;
  const system = host.updates_count ?? null;
  const images = host.image_updates_count ?? null;
  const stale = Boolean(host.updates_stale) || (images !== null && Boolean(host.image_updates_stale));
  if (system === null && images === null) return <span className="text-muted-foreground">Not checked</span>;
  const total = (system || 0) + (images || 0);
  return <span className="inline-flex flex-wrap items-center gap-1.5">
    {total > 0 ? <StatusBadge tone="warning">{total} available</StatusBadge> : <span className="text-muted-foreground">Up to date</span>}
    {stale && <span className="text-xs text-muted-foreground" title="The last update check is outdated">· outdated</span>}
  </span>;
}

const HostManagement = lazy(() => import('./ServersPage').then(module => ({default:module.ServersPage})));

export function HostsPage() {
  const environmentId = useUi(state => state.environmentId);
  const { data: profile } = useProfile();
  const [management, setManagement] = useState(false);
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const hosts = useQuery({ queryKey: ['servers', environmentId], queryFn: () => api.getServers(environmentId) as unknown as Promise<ServerRow[]>, refetchInterval: 30_000 });
  const groups = useQuery({ queryKey: ['server-groups', environmentId], queryFn: () => api.getServerGroups(environmentId) as unknown as Promise<ServerGroup[]> });
  const rows = (hosts.data || []).filter(host => (!group || host.group_id === group) && [host.name, host.ip_address, host.hostname].some(value => String(value || '').toLowerCase().includes(search.trim().toLowerCase())));
  // A group column that is empty on every row only adds noise.
  const showGroups = (hosts.data || []).some(host => host.group_id);
  if (management) return <div className="space-y-4"><Button variant="outline" onClick={() => setManagement(false)}>Back to hosts</Button><Suspense fallback={<p role="status">Loading host tools…</p>}><HostManagement /></Suspense></div>;
  return <div className="space-y-4">
    <PageHeader title="Hosts" actions={hasCap(profile, 'canEditServers') && <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" />Add host</Button>} />
    <div className="flex flex-wrap gap-2">
      <Input className="max-w-sm" aria-label="Search hosts" placeholder="Search hosts" value={search} onChange={event => setSearch(event.target.value)} />
      <select className="rounded-md border bg-background px-3 text-sm" aria-label="Filter by group" value={group} onChange={event => setGroup(event.target.value)}>
        <option value="">All groups</option>{(groups.data || []).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
      {hasCap(profile, 'canEditServers') && <Button variant="outline" onClick={() => setManagement(true)}>Groups and bulk actions</Button>}
    </div>
    {groups.isError && <QueryErrorState compact title="Groups could not be loaded" error={groups.error} onRetry={() => void groups.refetch()} />}
    {hosts.isError ? <QueryErrorState error={hosts.error} onRetry={() => void hosts.refetch()} /> : hosts.isPending ? <p role="status">Loading hosts…</p> : <>
      <ul className="divide-y rounded-md border md:hidden" aria-label="Hosts">
        {rows.map(host => <li key={host.id} className="space-y-2 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link className="block truncate font-medium text-primary hover:underline" to="/servers/$id" params={{ id: host.id }}>{host.name}</Link>
              <p className="truncate font-mono text-xs text-muted-foreground">{host.ip_address || host.hostname || 'Not configured'}</p>
            </div>
            <Connection host={host} />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"><Updates host={host} />{host.reboot_required && <StatusBadge tone="warning">Reboot required</StatusBadge>}</div>
          <Resources host={host} />
        </li>)}
        {!rows.length && <li className="p-8 text-center text-sm text-muted-foreground">{search || group ? 'No hosts match these filters.' : 'Add a host to get started.'}</li>}
      </ul>
      <div className="hidden overflow-x-auto rounded-md border md:block">
      <table className="w-full text-left text-sm"><thead className="border-b bg-muted/40"><tr>{['Name', 'Address', 'Connection', 'Updates', 'Reboot', 'Resources', ...(showGroups ? ['Group'] : [])].map(label => <th className="px-4 py-3 font-medium" key={label}>{label}</th>)}</tr></thead>
        <tbody>{rows.map(host => <tr key={host.id} className="border-b last:border-0 hover:bg-muted/30">
          <td className="px-4 py-3"><Link className="font-medium text-primary hover:underline" to="/servers/$id" params={{ id: host.id }}>{host.name}</Link> <VmId value={host.proxmox_vm_id} />{host.deployment && <Link className="block text-xs text-muted-foreground hover:underline" to="/deployments/$id" params={{id:host.deployment.id}}>Deployment</Link>}</td>
          <td className="px-4 py-3 font-mono text-xs">{host.ip_address || host.hostname || 'Not configured'}</td>
          <td className="px-4 py-3"><Connection host={host} />{host.status !== 'online' && host.last_seen && <p className="mt-1 text-xs text-muted-foreground">Last seen <Timestamp value={host.last_seen} /></p>}</td>
          <td className="px-4 py-3"><Updates host={host} /></td>
          <td className="px-4 py-3">{host.reboot_required ? <StatusBadge tone="warning">Required</StatusBadge> : <span className="text-muted-foreground">—</span>}</td>
          <td className="px-4 py-3"><Resources host={host} /></td>
          {showGroups && <td className="px-4 py-3">{host.group_name || groups.data?.find(item => item.id === host.group_id)?.name || '—'}</td>}
        </tr>)}{!rows.length && <tr><td colSpan={showGroups ? 7 : 6} className="p-8 text-center text-muted-foreground">{search || group ? 'No hosts match these filters.' : 'Add a host to get started.'}</td></tr>}</tbody>
      </table>
    </div></>}
    <Dialog open={addOpen} onOpenChange={setAddOpen}><DialogContent><DialogHeader><DialogTitle>Add host</DialogTitle></DialogHeader><div className="grid gap-2">
      <Button variant="outline" onClick={() => { setAddOpen(false); setManualOpen(true); }}>Enter host details</Button>
      {canAccessInfrastructure(profile) && <Button variant="outline" onClick={() => { setAddOpen(false); setImportOpen(true); }}>Import from Proxmox</Button>}
    </div></DialogContent></Dialog>
    <CreateServerDialog open={manualOpen} onOpenChange={setManualOpen} />
    {importOpen && <ProxmoxHostPicker key={environmentId} environmentId={environmentId} onClose={() => setImportOpen(false)} />}
  </div>;
}

function ProxmoxHostPicker({ environmentId, onClose }: { environmentId: string; onClose: () => void }) {
  const [selection, setSelection] = useState<{ connectionId: string; vm: Vm } | null>(null);
  const [search, setSearch] = useState('');
  const inventory = useQuery({
    queryKey: ['opentofu', 'host-import', environmentId],
    queryFn: () => apiFetch<InfrastructureResponse>(`/opentofu/infrastructure?environment_id=${encodeURIComponent(environmentId)}`, { environmentId }),
    refetchInterval: query => query.state.data?.refreshing ? 2_000 : false,
  });
  if (selection) return <ImportProxmoxVmDialog open connectionId={selection.connectionId} environmentId={environmentId} vm={selection.vm} onOpenChange={open => { if (!open) onClose(); }} />;
  const guests = (inventory.data?.clusters || []).flatMap(cluster => cluster.vms.filter(vm => !vm.fleet_server_id).map(vm => ({ vm, connectionId: cluster.connections?.[0]?.id, cluster: cluster.endpoint })));
  const filtered = guests.filter(({ vm }) => `${vm.name} ${vm.node_name} ${vm.vm_id}`.toLowerCase().includes(search.toLowerCase()));
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Import from Proxmox</DialogTitle></DialogHeader>
    <Input placeholder="Search VMs" aria-label="Search VMs" value={search} onChange={event => setSearch(event.target.value)} />
    {inventory.data?.warnings?.length ? <div role="alert" className="text-sm text-destructive">{inventory.data.warnings.join(' ' )}<Button variant="outline" size="sm" onClick={() => void inventory.refetch()}>Try again</Button></div> : null}
    {inventory.isError ? <QueryErrorState error={inventory.error} onRetry={() => void inventory.refetch()} /> : inventory.isPending || inventory.data?.refreshing ? <p role="status">Loading VMs…</p> : <div className="max-h-96 space-y-2 overflow-y-auto">
      {filtered.map(({ vm, connectionId, cluster }) => <Button key={`${cluster}/${vm.node_name}/${vm.vm_id}`} variant="outline" className="h-auto w-full justify-between py-3" disabled={!connectionId} onClick={() => connectionId && setSelection({ connectionId, vm })}><span>{vm.name}</span><span className="text-xs text-muted-foreground">{vm.node_name} · {vm.vm_id}</span></Button>)}
      {!filtered.length && <p className="py-4 text-sm text-muted-foreground">No VMs available to import.</p>}
    </div>}
  </DialogContent></Dialog>;
}
