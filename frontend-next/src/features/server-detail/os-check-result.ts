import { parseApiDate } from '@/lib/utils';
export function verifiedOsCheck<T extends { updates: Record<string, unknown>[]; updated_at: string | null; stale: boolean; cached: boolean }>(result: T): T {
  if (!result || !Array.isArray(result.updates) || result.updates.some(row => !row || typeof row !== 'object' || Array.isArray(row)) || result.stale !== false || result.cached !== false || !result.updated_at || !Number.isFinite(parseApiDate(result.updated_at)?.getTime())) {
    throw new Error('The package check returned no verified fresh catalog. Refresh again before planning updates.');
  }
  return result;
}
