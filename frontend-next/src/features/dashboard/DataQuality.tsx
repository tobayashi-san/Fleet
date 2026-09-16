import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Timestamp } from '@/components/ui/timestamp';
import { StatusBadge } from '@/components/ui/status-badge';
import { DISPLAY_TIME_ZONE } from '@/lib/utils';

export interface CheckQuality {
  kind: 'os' | 'images' | 'custom'; label: string;
  state: 'failed' | 'stale' | 'not_checked' | 'not_applicable' | 'current';
  checked_at: string | null; attempted_at: string | null; source: string; reason: string;
}
const labels = {failed: 'Failed', stale: 'Stale', not_checked: 'Not checked', not_applicable: 'Not applicable', current: 'Current'};
export function DataQuality({hosts}: {hosts: Array<{id: string | number; name: string; check_quality?: CheckQuality[]}>}) {
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState('attention');
  const rows = hosts.flatMap(host => (host.check_quality || []).map(check => ({host, check})));
  if (!rows.length) return null;
  const incomplete = hosts.filter(host => host.check_quality?.some(check => !['current', 'not_applicable'].includes(check.state))).length;
  const covered = hosts.filter(host => host.check_quality?.length).length;
  const visible = rows.filter(({check}) => filter === 'all' || filter === 'attention' ? filter === 'all' || !['current', 'not_applicable'].includes(check.state) : check.state === filter);
  return <section id="data-quality" className="space-y-3 rounded-md border bg-card p-4" aria-label="Check data quality">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="font-semibold">Check data quality</h2><p className="text-sm text-muted-foreground">{covered - incomplete}/{covered} hosts fully checked · {incomplete} need attention. Not-applicable checks are excluded.</p></div>
      <button type="button" aria-expanded={expanded} aria-controls="check-quality-details" onClick={() => setExpanded(!expanded)} className="rounded-md border px-3 py-2 text-sm hover:bg-accent">{expanded ? "Hide check details" : "Inspect check details"}</button>
    </div>
    <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">{(["failed","stale","not_checked"] as const).map(state => { const count = new Set(rows.filter(row => row.check.state === state).map(row => row.host.id)).size; return count ? <button key={state} type="button" className="text-primary underline underline-offset-4" onClick={() => { setFilter(state); setExpanded(true); }}>{count} hosts · {labels[state]}</button> : null; })}</div>
    <div id="check-quality-details" hidden={!expanded} className="space-y-3">
      <label className="text-sm">Show <select value={filter} onChange={event => setFilter(event.target.value)} className="ml-2 rounded-md border bg-background px-2 py-1.5" aria-label="Filter check quality"><option value="attention">Needs attention</option>{Object.entries(labels).map(([value,label]) => <option key={value} value={value}>{label} ({rows.filter(row => row.check.state === value).length})</option>)}<option value="all">All checks</option></select></label>
    <p className="text-xs text-muted-foreground">Times in {DISPLAY_TIME_ZONE}. These are collection results; execution failures are tracked separately in Operations.</p>
    {!visible.length ? <p className="text-sm">No checks match this filter.</p> : <div className="max-h-96 overflow-auto"><table className="w-full text-left text-sm"><thead><tr>{['Host / check','State','Last successful check','Cause / source','Action'].map(label => <th key={label} className="p-2">{label}</th>)}</tr></thead><tbody>{visible.map(({host,check}) => <tr className="border-t" key={`${host.id}:${check.kind}`}>
      <td className="p-2"><span className="font-medium">{host.name}</span><span className="block text-xs text-muted-foreground">{check.label}</span></td>
      <td className="p-2"><StatusBadge tone={check.state === 'failed' ? 'danger' : ['stale','not_checked'].includes(check.state) ? 'warning' : check.state === 'current' ? 'success' : 'muted'}>{labels[check.state]}</StatusBadge></td>
      <td className="p-2"><Timestamp value={check.checked_at} />{check.attempted_at && <span className="block text-xs text-muted-foreground">Last attempt: <Timestamp value={check.attempted_at} /></span>}</td>
      <td className="min-w-52 p-2">{check.reason}<span className="block text-xs text-muted-foreground">{check.source}</span></td>
      <td className="p-2"><Link to="/servers/$id" params={{id: String(host.id)}} hash={check.kind === 'images' ? 'tab=docker' : 'tab=updates'} className="text-primary hover:underline">Inspect {check.kind === 'images' ? 'workloads' : 'updates'}</Link></td>
    </tr>)}</tbody></table></div>}
    </div>
  </section>;
}
