import { expect, it } from 'vitest';
import { infrastructureSearchItems } from './infrastructure-search';
import { commandModifier } from './keyboard';
it('builds stable encoded links and searches VM identifiers and platform names', () => {
  const items = infrastructureSearchItems([{ id: 'https://pve:8006', connections: [{ name: 'Production' }], nodes: [{ name: 'node a' }], vms: [{ vm_id: 100, node_name: 'node a', name: 'erp' }] }]);
  expect(items).toHaveLength(3);
  expect(items[2].path).toBe('/infrastructure/https%3A%2F%2Fpve%3A8006/nodes/node%20a/vms/100');
  expect(items[2].keywords).toEqual(['100', 'erp', 'node a', 'Production']);
});
it('uses platform-appropriate command keys', () => {
  expect(commandModifier('Linux x86_64')).toBe('Ctrl');
  expect(commandModifier('Win32')).toBe('Ctrl');
  expect(commandModifier('MacIntel')).toBe('⌘');
});

it('finds inventory objects by authorized linked host aliases without changing their destinations', () => {
 const items = infrastructureSearchItems([{id:'platform',nodes:[{name:'node',fleet_server_id:'node-host'}],vms:[{vm_id:101,node_name:'node',name:'inventory-name',fleet_server_id:'guest-host'}]}],[{id:'guest-host',name:'Operations alias'},{id:'node-host',name:'Hypervisor alias'}]);
 expect(items[1].keywords).toContain('Hypervisor alias');
 expect(items[2].keywords).toContain('Operations alias');
 expect(items[2].detail).toContain('Host: Operations alias');
 expect(items[2].path).toBe('/infrastructure/platform/nodes/node/vms/101');
 expect(infrastructureSearchItems([{id:'platform',vms:[{vm_id:101,node_name:'node',fleet_server_id:'guest-host'}]}])[1].keywords).not.toContain('Operations alias');
});
