import { guestAuditPresentation, auditActionLabel } from "./audit-display";
import { describe, expect, it } from 'vitest';
import { normalizeAuditIp, parseAuditDetail, gitPolicyChanges } from './audit-display';

describe('normalizeAuditIp', () => {
  it('shows IPv4-mapped addresses as IPv4 while rejecting invalid octets', () => {
    expect(normalizeAuditIp('::ffff:10.77.25.1')).toBe('10.77.25.1');
    expect(normalizeAuditIp('::ffff:999.77.25.1')).toBe('::ffff:999.77.25.1');
    expect(normalizeAuditIp('2001:db8::1')).toBe('2001:db8::1');
  });
});

describe('parseAuditDetail', () => {
  it('keeps JSON-escaped task names intact without interpreting embedded fields', () => {
    const name = 'Check "server=other" on C:\\tools\nsecond line';
    const detail = `server_id="host-one" name=${JSON.stringify(name)} changed_fields="check_command"`;
    const parsed = parseAuditDetail(detail);
    expect(parsed.summary).toBe('');
    expect(parsed.fields.map(({key,value}) => [key,value])).toEqual([
      ['server_id','host-one'], ['name',name], ['changed_fields','check_command'],
    ]);
  });
  it('separates technical key-value data into named fields', () => {
    expect(parseAuditDetail('Updated agent version=3.0.8 path="/opt/ship yard"')).toEqual({
      summary: 'Updated agent',
      fields: [
        { key: 'version', label: 'Version', value: '3.0.8' },
        { key: 'path', label: 'Path', value: '/opt/ship yard' },
      ],
      raw: 'Updated agent version=3.0.8 path="/opt/ship yard"',
    });
  });
});


it('labels audit actions while retaining a readable fallback', () => {
  expect(auditActionLabel('terminal.connect_failed')).toBe('Terminal connection failed');
  expect(auditActionLabel('server.update')).toBe('Host updated');
  expect(auditActionLabel('tofu.connection_remove')).toBe('Platform connection removed');
  expect(auditActionLabel('custom_plugin.check_done')).toBe('Custom plugin check done');
  expect(auditActionLabel()).toBe('—');
  expect(auditActionLabel('users.password')).toBe('User password reset');
  expect(auditActionLabel('users.totp.disable')).toBe('User MFA disabled');
  expect(auditActionLabel('users.sessions.revoke')).toBe('User sessions revoked');
  expect(auditActionLabel('users.disable')).toBe('User account disabled');
  expect(auditActionLabel('users.enable')).toBe('User account enabled');
});


it('distinguishes Proxmox request acceptance from completion and missing results',()=>{
 for(const action of ['infrastructure.snapshot_create','infrastructure.snapshot_delete','infrastructure.snapshot_restore','infrastructure.vm_power']){
  expect(guestAuditPresentation({action,success:1}).outcome).toBe('Request accepted');
  expect(guestAuditPresentation({action,success:false}).outcome).toBe('Request failed');
  for(const success of [undefined,null,2])expect(guestAuditPresentation({action,success}).outcome).toBe('Unknown');
 }
 expect(guestAuditPresentation({action:'infrastructure.vm_power',detail:'action=stop vm=example',success:true}).label).toBe('Forced guest stop requested');
 expect(guestAuditPresentation({action:'infrastructure.vm_import',success:true}).outcome).toBe('Recorded');
});


it('shows only changed Git booleans and rejects malformed snapshots',()=>{
 const before={autoPull:false,autoPush:false,readOnly:true};
 const after={autoPull:true,autoPush:false,readOnly:true};
 const detail=`before=${JSON.stringify(JSON.stringify(before))} after=${JSON.stringify(JSON.stringify(after))}`;
 expect(gitPolicyChanges(detail)).toEqual([{label:'Auto-pull',before:'Disabled',after:'Enabled'}]);
 expect(gitPolicyChanges(`before="invalid" after="null"`)).toBeNull();
 expect(gitPolicyChanges(`before=${JSON.stringify(JSON.stringify(before))} after=${JSON.stringify(JSON.stringify(before))}`)).toEqual([]);
});
