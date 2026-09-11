import { describe, expect, it } from 'vitest';
import { validateVmForm } from './vm-form-validation';
const values = { name: 'app-01', node_name: 'pve', vm_id: '101', clone_vm_id: '9000', clone_retries: '3', disk_datastore: 'local', disk_size_gb: '40', cpu_cores: '2', memory_mb: '4096', disk_interface: 'scsi0', cpu_type: 'host', bridge: 'vmbr0', vlan_id: '', ipv4_mode: 'static', ipv4_address: '10.0.0.2', ipv4_prefix: '24', ipv4_gateway: '', username: 'debian' };
describe('VM wizard validation', () => {
  it('allows a static subnet without an optional gateway', () => {
    expect(validateVmForm(values, [], '').errors).toEqual({});
  });
  it('rejects invalid addresses, non-integral cores and out-of-range VLANs in their steps', () => {
    const result = validateVmForm({ ...values, ipv4_address: '999.0.0.1', cpu_cores: '1.5', vlan_id: '4095' }, [], '');
    expect(result.steps[1]).toContain('CPU cores');
    expect(result.steps[2]).toEqual(['VM VLAN-ID (optional)', 'IPv4 address']);
  });
  it('requires explicit login and pre-deploy target without guessing Ubuntu', () => {
    const result = validateVmForm({ ...values, username: '' }, ['prepare.yml'], '');
    expect(result.steps[2]).toContain('VM user');
    expect(result.steps[3]).toContain('Execution host');
  });
  it('ignores stale static input when using DHCP', () => {
    expect(validateVmForm({ ...values, ipv4_mode: 'dhcp', ipv4_address: '', ipv4_prefix: '' }, [], '').errors).toEqual({});
  });
});
