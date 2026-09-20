import { describe, expect, it } from 'vitest';
import { catalogStatus, pendingUpdates, type Catalog } from './model';
const fresh: Catalog = { updates: [], checked_at: '2026-09-20T10:00:00Z', stale: false };
describe('update dashboard status', () => {
  it('does not present absent, stale or failed checks as up to date', () => {
    for (const catalog of [{ ...fresh, checked_at: null }, { ...fresh, stale: true }, { ...fresh, failure: { reason: 'Offline', attempted_at: 'now' } }]) {
      expect(catalogStatus(catalog, 'system').needsCheck).toBe(true);
      expect(catalogStatus(catalog, 'system').tone).not.toBe('success');
    }
    expect(catalogStatus(fresh, 'system').label).toBe('Up to date');
  });
  it('counts actionable packages and images while retaining phased and unknown results', () => {
    expect(pendingUpdates({ ...fresh, updates: [{ package: 'ready' }, { package: 'later', phased: true }] }, 'system')).toHaveLength(1);
    const docker = { ...fresh, updates: [{ status: 'update_available' }, { status: 'not_checkable' }, { status: 'up_to_date' }] };
    expect(pendingUpdates(docker, 'docker')).toHaveLength(1);
    expect(catalogStatus(docker, 'docker')).toMatchObject({ label: 'Check required', needsCheck: true });
  });
});
