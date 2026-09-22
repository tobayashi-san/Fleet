import { describe, expect, it } from 'vitest';
import { catalogStatus, needsAction, packageIndex, pendingUpdates, type Catalog, type UpdateHost } from './model';
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

const host = (id: string, system: Catalog, extra: Partial<UpdateHost> = {}): UpdateHost => ({ id, name: id, status: 'online', reboot_required: false, system, ...extra });
describe('package view and action filter', () => {
  it('groups one package across hosts and keeps Docker images separate', () => {
    const rows = packageIndex([
      host('a', { ...fresh, updates: [{ package: 'openssl', current_version: '3.0.1', version: '3.0.2' }, { package: 'curl', version: '8' }] }),
      host('b', { ...fresh, updates: [{ package: 'openssl', current_version: '3.0.0', version: '3.0.2' }, { package: 'phased', phased: true }] }, { docker: { ...fresh, updates: [{ container_name: 'web', image: 'nginx:1.27', status: 'update_available' }] } }),
    ], true);
    expect(rows.map(row => row.key)).toEqual(['system:openssl', 'system:curl', 'docker:nginx:1.27']);
    expect(rows[0].hosts.map(item => item.name)).toEqual(['a', 'b']);
    expect(rows[0].versions).toEqual(['3.0.2']);
    expect(packageIndex([host('b', fresh, { docker: { ...fresh, updates: [{ image: 'nginx', status: 'update_available' }] } })], false)).toEqual([]);
  });
  it('treats pending updates, reboots and untrusted checks as work to do', () => {
    expect(needsAction(host('ok', fresh), true)).toBe(false);
    expect(needsAction(host('reboot', fresh, { reboot_required: true }), true)).toBe(true);
    expect(needsAction(host('stale', { ...fresh, stale: true }), true)).toBe(true);
    expect(needsAction(host('pending', { ...fresh, updates: [{ package: 'x' }] }), true)).toBe(true);
    expect(needsAction(host('docker', fresh, { docker: { ...fresh, updates: [{ status: 'update_available' }] } }), false)).toBe(false);
  });
});
