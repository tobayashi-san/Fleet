import { describe, expect, it } from 'vitest';
import { prefixInputErrors } from './ipam-form-validation';
describe('prefix form validation', () => {
  it('rejects values that could serialize as null or be misinterpreted as VLAN IDs', () => {
    for (const value of ['invalid', 'NaN', 'Infinity', '0', '-1', '4095', '1.5', '1e2', '0x10']) {
      expect(prefixInputErrors(value, '', '')).toEqual(['vlanRangeError']);
    }
    for (const value of ['', ' ', '1', '4094', ' 20 ']) expect(prefixInputErrors(value, '', '')).toEqual([]);
  });
  it('requires both DHCP endpoints while permitting explicit clearing', () => {
    expect(prefixInputErrors('', '192.0.2.10', '')).toEqual(['dhcpPairError']);
    expect(prefixInputErrors('', ' ', '192.0.2.20')).toEqual(['dhcpPairError']);
    expect(prefixInputErrors('', '', '')).toEqual([]);
    expect(prefixInputErrors('20', '192.0.2.10', '192.0.2.20')).toEqual([]);
  });
});
