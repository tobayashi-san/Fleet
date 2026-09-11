/** Validate before JSON serialization can turn NaN into null (clear VLAN). */
export function prefixInputErrors(vlan: string, dhcpStart: string, dhcpEnd: string): string[] {
  const errors: string[] = [];
  const text = vlan.trim();
  if (text && (!/^\d+$/.test(text) || Number(text) < 1 || Number(text) > 4094)) errors.push('vlanRangeError');
  if (Boolean(dhcpStart.trim()) !== Boolean(dhcpEnd.trim())) errors.push('dhcpPairError');
  return errors;
}
