import { apiFetch } from './api';
import i18n from './i18n';

export interface ReleaseTarget {
  id: string;
  kind: 'address' | 'range';
  start_address: string;
  end_address: string;
}
export interface ReleaseResult {
  released: string[];
  failed: { key: string; label: string; message: string }[];
}
export async function releaseIpamAllocations(targets: ReleaseTarget[], environmentId: string): Promise<ReleaseResult> {
  const results = await Promise.allSettled(targets.map(target => apiFetch(
    `/ipam/${target.kind === 'address' ? 'reservations' : 'ranges'}/${encodeURIComponent(target.id)}`,
    { method: 'DELETE', environmentId },
  )));
  const result: ReleaseResult = { released: [], failed: [] };
  results.forEach((outcome, index) => {
    const target = targets[index];
    const key = `${target.kind}:${target.id}`;
    if (outcome.status === 'fulfilled') result.released.push(key);
    else result.failed.push({
      key,
      label: target.kind === 'address' ? target.start_address : `${target.start_address} – ${target.end_address}`,
      message: outcome.reason instanceof Error ? outcome.reason.message : String(i18n.t('ipam.releaseUnconfirmed')),
    });
  });
  return result;
}
