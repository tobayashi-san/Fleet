import {formatDateTime} from '@/lib/utils';
import type {Datastore} from './detail-model';

export function StorageUsageHistory({store, range = 'recent'}: {store: Datastore; range?: 'recent' | 'week'}) {
  const hourly = range === 'week';
  const samples = ((hourly ? store.capacity_history_hourly : store.capacity_history) || []).filter(sample => Number.isFinite(sample.sampled_at) && Number.isFinite(sample.used) && Number.isFinite(sample.total) && sample.total > 0 && sample.used >= 0 && sample.used <= sample.total).slice().sort((a,b)=>a.sampled_at-b.sampled_at);
  if (samples.length < 2) return <span className="text-xs text-muted-foreground">{samples.length ? hourly ? 'One observed hour — more refreshes needed' : 'One observation — more refreshes needed' : 'No observations recorded'}</span>;
  const first = samples[0]; const last = samples[samples.length-1];
  const span = last.sampled_at-first.sampled_at;
  if (!span) return <span className="text-xs text-muted-foreground">More observations needed</span>;
  const change = last.used/last.total*100-first.used/first.total*100;
  return <div className="w-56 min-w-40 text-xs text-muted-foreground">
    <svg viewBox="0 0 160 40" className="h-10 w-40" role="img" aria-label={`${samples.length} ${hourly ? 'hourly mean' : 'observed'} storage utilization samples, change ${change.toFixed(1)} percentage points`}>
      <line x1="3" y1="37" x2="157" y2="37" stroke="currentColor" opacity="0.2"/>
      {samples.map(sample=><circle key={sample.sampled_at} cx={3+(sample.sampled_at-first.sampled_at)/span*154} cy={37-sample.used/sample.total*34} r="2" fill="currentColor"><title>{`${formatDateTime(new Date(sample.sampled_at).toISOString())}: ${(sample.used/sample.total*100).toFixed(1)}%${hourly ? ' hourly mean' : ''}`}</title></circle>)}
    </svg>
    <div>{change > 0 ? '+' : ''}{change.toFixed(1)} percentage points · {samples.length} {hourly ? 'observed hours' : 'samples'}</div>
    <div>{formatDateTime(new Date(first.sampled_at).toISOString())} → {formatDateTime(new Date(last.sampled_at).toISOString())}</div>
  </div>;
}
