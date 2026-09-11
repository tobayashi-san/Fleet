import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from './api';
import { releaseIpamAllocations } from './ipam-bulk-release';
vi.mock('./api', () => ({ apiFetch: vi.fn() }));
const fetch = vi.mocked(apiFetch);
beforeEach(() => fetch.mockReset());
describe('IPAM bulk release', () => {
  it('waits for every request and distinguishes confirmed releases from failures', async () => {
    let finish!: (value: unknown) => void;
    fetch.mockRejectedValueOnce(new Error('Address is managed by a source'));
    fetch.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    let settled = false;
    const pending = releaseIpamAllocations([
      { id: 'a/b', kind: 'address', start_address: '192.0.2.1', end_address: '192.0.2.1' },
      { id: 'range', kind: 'range', start_address: '192.0.2.10', end_address: '192.0.2.20' },
    ], 'default').then(result => { settled = true; return result; });
    await Promise.resolve();
    await Promise.resolve();
    expect(settled).toBe(false);
    finish({ success: true });
    expect(await pending).toEqual({ released: ['range:range'], failed: [{ key: 'address:a/b', label: '192.0.2.1', message: 'Address is managed by a source' }] });
    expect(fetch).toHaveBeenNthCalledWith(1, '/ipam/reservations/a%2Fb', { method: 'DELETE', environmentId: 'default' });
    expect(fetch).toHaveBeenNthCalledWith(2, '/ipam/ranges/range', { method: 'DELETE', environmentId: 'default' });
  });
  it('keeps the range label and supplies guidance for an unknown failure', async () => {
    fetch.mockRejectedValueOnce(null);
    const result = await releaseIpamAllocations([{ id: 'r', kind: 'range', start_address: '192.0.2.10', end_address: '192.0.2.20' }], 'default');
    expect(result.released).toEqual([]);
    expect(result.failed[0].label).toBe('192.0.2.10 – 192.0.2.20');
    expect(result.failed[0].message).toMatch(/could not be confirmed/);
  });
});
