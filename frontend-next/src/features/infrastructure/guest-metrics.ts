export function guestMetricPercent(used: unknown, total: unknown, fractional = false): string | null {
  if (typeof used !== 'number' || !Number.isFinite(used) || used < 0 || typeof total !== 'number' || !Number.isFinite(total) || total <= 0 || used > total) return null;
  return `${((used / total) * 100).toFixed(fractional ? 1 : 0)}%`;
}
export function guestMetricExplanation(status: string): string {
  return status === 'stopped'
    ? 'Guest is stopped. Live CPU and memory activity is not expected; displayed values are retained inventory samples. Missing values are not measured zero usage.'
    : 'Missing values were not supplied as valid measurements by Proxmox. Refresh the inventory, then check guest and node status in Proxmox if values remain unavailable.';
}
