import { describe, expect, it } from 'vitest';
import { platformHostIds, managementLabel } from './resource-model';
describe('resource identity', () => {
  it('excludes linked nodes and guests from standalone hosts without double counting', () => {
    const ids = platformHostIds([{ nodes: [{ fleet_server_id: 'node' }], vms: [{ fleet_server_id: 'guest' }, { fleet_server_id: 'guest' }, {}] }]);
    expect([...ids]).toEqual(['node', 'guest']);
    expect(['node', 'guest', 'vps'].filter(id => !ids.has(id))).toEqual(['vps']);
  });
  it('does not conflate host adoption with declarative management', () => {
    expect(managementLabel()).toBe('Inventory only');
    expect(managementLabel('host')).toBe('Host operations enabled');
    expect(managementLabel(null, true)).toBe('VM definition');
    expect(managementLabel('host', true)).toContain('host operations enabled');
  });
});
