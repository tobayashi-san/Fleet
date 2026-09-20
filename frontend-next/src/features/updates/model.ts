import type { StatusTone } from '@/components/ui/status-badge';

export interface UpdateItem {
  package?: string;
  current_version?: string;
  version?: string;
  phased?: boolean;
  container_name?: string;
  image?: string;
  status?: string;
}
export interface Catalog {
  updates: UpdateItem[];
  checked_at: string | null;
  stale: boolean;
  failure?: { reason: string; attempted_at: string } | null;
}
export interface UpdateHost {
  id: string;
  name: string;
  ip_address?: string;
  status: string;
  reboot_required: boolean;
  system: Catalog;
  docker?: Catalog | null;
}
export function pendingUpdates(catalog: Catalog, kind: 'system' | 'docker') {
  return catalog.updates.filter(item => kind === 'system' ? !item.phased : item.status === 'update_available');
}
export function catalogStatus(catalog: Catalog, kind: 'system' | 'docker'): { label: string; tone: StatusTone; needsCheck: boolean } {
  if (catalog.failure) return { label: 'Check failed', tone: 'danger', needsCheck: true };
  if (!catalog.checked_at) return { label: 'Not checked', tone: 'muted', needsCheck: true };
  if (catalog.stale) return { label: 'Check again', tone: 'muted', needsCheck: true };
  if (kind === 'docker' && catalog.updates.some(item => !['update_available', 'up_to_date', 'updated'].includes(item.status || ''))) {
    return { label: 'Check required', tone: 'muted', needsCheck: true };
  }
  const count = pendingUpdates(catalog, kind).length;
  return { label: count ? `${count} available` : 'Up to date', tone: count ? 'warning' : 'success', needsCheck: false };
}
