import {expect,it} from 'vitest';
import {platformInventoryId} from './platform-inventory-id';
it('matches inventory keys for root and reverse-proxy endpoints',()=>{
 expect(platformInventoryId('https://PVE:8006/')).toBe('https://pve:8006');
 expect(platformInventoryId('https://pve/proxy/api2/json///?ignored=1')).toBe('https://pve/proxy/api2/json');
 expect(platformInventoryId('https://pve/proxy/')).toBe('https://pve/proxy');
});
it('does not generate inventory links for missing or unsupported endpoints',()=>{
 for(const endpoint of [null,undefined,'invalid','javascript:alert(1)']) expect(platformInventoryId(endpoint)).toBeNull();
});
