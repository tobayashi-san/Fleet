export interface HostView {
  search: string;
  tag: string | null;
  status: 'all' | 'online' | 'offline' | 'unknown';
  group: string;
  updates: boolean;
  attention: boolean;
  severity?: 'all' | 'critical' | 'warning';
  grouped: boolean;
  sort: 'name' | 'status' | 'ip';
  columns: { state: boolean; contact: boolean; owner: boolean };
}
export interface SavedHostView { name: string; view: HostView }
export const savedViewKey = (user: string, environment: string) => `shipyard.ui.hostViews.v1:${JSON.stringify([user, environment])}`;
export function readSavedViews(raw: string | null): SavedHostView[] {
  try {
    const parsed: unknown = JSON.parse(raw || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is SavedHostView => {
      if (!item || typeof item !== 'object' || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 60) return false;
      const v = item.view;
      return v && typeof v.search === 'string' && (v.tag === null || typeof v.tag === 'string') &&
        ['all', 'online', 'offline', 'unknown'].includes(v.status) && typeof v.group === 'string' &&
        ['updates', 'attention', 'grouped'].every(key => typeof v[key] === 'boolean') &&
        (v.severity === undefined || ['all', 'critical', 'warning'].includes(v.severity)) &&
        ['name', 'status', 'ip'].includes(v.sort) && typeof v.columns?.state === 'boolean' && typeof v.columns?.contact === 'boolean' && (v.columns.owner === undefined || typeof v.columns.owner === 'boolean');
    }).map(item => ({ ...item, view: { ...item.view, columns: { ...item.view.columns, owner: item.view.columns.owner === true } } })).slice(0, 20);
  } catch { return []; }
}
