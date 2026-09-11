import type { StatusTone } from '@/components/ui/status-badge';
export function containerStateTone(status?: string, state?: string): StatusTone {
  const value = (status || state || '').trim().toLowerCase();
  if (/\bunhealthy\b|^restarting\b/.test(value)) return 'warning';
  if (/^dead\b/.test(value)) return 'danger';
  const exited = /^exited\s*\((-?\d+)\)/.exec(value);
  if (exited) return Number(exited[1]) === 0 ? 'muted' : 'danger';
  if (/\bpaused\b/.test(value)) return 'muted';
  if (/^up\b|^running$/.test(value)) return 'success';
  return 'muted';
}
