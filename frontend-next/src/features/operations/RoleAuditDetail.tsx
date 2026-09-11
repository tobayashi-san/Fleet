import {formatDateTime} from '@/lib/utils';
const timestampLabels = new Set(['Start (UTC)', 'End (UTC)', 'Cancelled at (UTC)']);
interface RoleChange {
  kind: 'role-change' | 'user-change' | 'maintenance-change' | 'ssh-key-change' | 'host-change'; version: 1;
  resource: {id: string; name: string};
  changes: {label: string; before: string; after: string}[];
}
export function parseRoleChange(detail?: string): RoleChange | null {
  try {
    const value = JSON.parse(detail || 'null');
    if ((value?.kind !== 'role-change' && value?.kind !== 'user-change' && value?.kind !== 'maintenance-change' && value?.kind !== 'ssh-key-change' && value?.kind !== 'host-change') || value.version !== 1 || typeof value.resource?.id !== 'string' || typeof value.resource?.name !== 'string' || !Array.isArray(value.changes)) return null;
    if (!value.changes.every((change: RoleChange['changes'][number]) => change && typeof change.label === 'string' && typeof change.before === 'string' && typeof change.after === 'string')) return null;
    return value;
  } catch { return null; }
}
export function roleAuditValue(label: string, value: string): string {
  if (['Tags', 'Services', 'Links', 'Storage mounts'].includes(label)) {
    try {
      const entries: unknown = JSON.parse(value);
      if (Array.isArray(entries)) {
        if (!entries.length) return 'None';
        if (['Tags', 'Services'].includes(label) && entries.every(item => typeof item === 'string')) return entries.join(', ');
        const key = label === 'Links' ? 'url' : 'path';
        if (entries.every(item => item && typeof item.name === 'string' && typeof item[key] === 'string')) return entries.map(item => `${item.name}: ${item[key]}`).join('; ');
      }
    } catch { /* Keep unrecognized historical values intact. */ }
  }

  if (timestampLabels.has(label) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value)) {
    const formatted = formatDateTime(value, {timeStyle:'medium'});
    if (formatted !== '—') return formatted;
  }
  const resource = ({Servers:'hosts',Playbooks:'playbooks',Plugins:'plugins'} as Record<string,string>)[label];
  if (!resource) return value;
  if (value === 'all') return `All ${resource}`;
  const identifiers = (items: unknown): items is (string | number)[] => Array.isArray(items) && items.every(item => typeof item === 'string' || typeof item === 'number');
  const list = (items: (string | number)[]) => items.map(item => JSON.stringify(String(item))).join(', ') || 'None';
  try {
    const parsed = JSON.parse(value);
    if (label === 'Servers' && parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Object.keys(parsed).every(key => key === 'groups' || key === 'servers') && identifiers(parsed.groups ?? []) && identifiers(parsed.servers ?? [])) {
      return `Group IDs: ${list(parsed.groups ?? [])}; individual host IDs: ${list(parsed.servers ?? [])}`;
    }
    if (label !== 'Servers' && identifiers(parsed)) return parsed.length ? `Selected ${resource}: ${list(parsed)}` : 'None';
  } catch { /* Preserve unrecognized historical values verbatim. */ }
  return value;
}
export function RoleAuditDetail({change}: {change: RoleChange}) {
  return <div className="space-y-2 text-xs [overflow-wrap:anywhere]">
    <p><strong>{change.resource.name}</strong> <span className="text-muted-foreground">(ID: {change.resource.id})</span></p>
    <details>
      <summary className="cursor-pointer text-primary">View changes ({change.changes.length})</summary>
      {change.changes.length ? <dl className="mt-2 space-y-2">{change.changes.map((item,index) => <div key={index}>
        <dt className="font-medium">{item.label === 'Servers' ? 'Hosts' : timestampLabels.has(item.label) ? item.label.replace(' (UTC)', '') : item.label}</dt>
        <dd title={item.before}><span className="text-muted-foreground">Before: </span>{roleAuditValue(item.label,item.before)}</dd>
        <dd title={item.after}><span className="text-muted-foreground">After: </span>{roleAuditValue(item.label,item.after)}</dd>
      </div>)}</dl> : <p className="mt-2">No recorded field changes.</p>}
    </details>
  </div>;
}
