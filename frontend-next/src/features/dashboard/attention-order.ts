export interface AttentionHost {
  id: string | number;
  name: string;
  status?: string;
  reboot_required?: boolean;
  updates_count?: number | null;
  image_updates_count?: number | null;
  custom_updates_count?: number | null;
  alert_count?: number;
  attention?: { requiresAttention: boolean; severity: 'healthy' | 'warning' | 'critical' };
}

export function attentionPriority(host: AttentionHost): number {
  // Prefer the permission-filtered canonical state supplied by the backend.
  if (host.attention) return { healthy: 0, warning: 1, critical: 2 }[host.attention.severity];
  if (host.status === 'offline') return 2;
  return Number(Boolean(host.reboot_required || (host.alert_count ?? 0) > 0 ||
    (host.updates_count ?? 0) > 0 || (host.image_updates_count ?? 0) > 0 ||
    (host.custom_updates_count ?? 0) > 0));
}

export function compareAttentionHosts(a: AttentionHost, b: AttentionHost): number {
  return attentionPriority(b) - attentionPriority(a) ||
    a.name.localeCompare(b.name, 'en', { numeric: true, sensitivity: 'base' }) ||
    String(a.id).localeCompare(String(b.id), 'en', { numeric: true });
}
