export interface AuditDetailField {
  key: string;
  label: string;
  value: string;
}

export function normalizeAuditIp(value?: string | null): string {
  const raw = String(value || '').trim();
  const mapped = raw.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  if (!mapped) return raw;
  const octets = mapped[1].split('.').map(Number);
  return octets.every((octet) => octet >= 0 && octet <= 255)
    ? mapped[1]
    : raw;
}

function auditFieldLabel(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^\w/, (letter) => letter.toUpperCase())
    .replace(/\bId\b/g, 'ID');
}

export function parseAuditDetail(detail?: string | null): {
  summary: string;
  fields: AuditDetailField[];
  raw: string;
} {
  const raw = String(detail || '').trim();
  const fields: AuditDetailField[] = [];
  const remainder: string[] = [];
  const pattern = /([A-Za-z][\w.-]*)=(?:"((?:\\.|[^"\\])*)"|'([^']*)'|([^\s]+))/g;
  let cursor = 0;
  for (const match of raw.matchAll(pattern)) {
    const index = match.index || 0;
    const text = raw.slice(cursor, index).trim();
    if (text) remainder.push(text);
    let value = match[2] ?? match[3] ?? match[4] ?? '';
    if (match[2] !== undefined) {
      // New audit producers JSON-encode quoted values. Preserve legacy
      // non-JSON values literally if their escape sequences are invalid.
      try { value = JSON.parse(`"${match[2]}"`) as string; } catch { /* legacy text */ }
    }
    fields.push({
      key: match[1],
      label: auditFieldLabel(match[1]),
      value,
    });
    cursor = index + match[0].length;
  }
  const tail = raw.slice(cursor).trim();
  if (tail) remainder.push(tail);
  return { summary: remainder.join(' ').trim(), fields, raw };
}

export function auditActionLabel(action?: string): string {
  if (!action) return '—';
  const labels: Record<string,string> = {
    'git.disconnect':'Git repository disconnected', 'git.config_update':'Git configuration updated', 'git.settings_update':'Git synchronization policy updated',
    'infrastructure.proxmox_update_catalog':'Proxmox package catalog refresh requested',
    'infrastructure.snapshot_create':'Snapshot creation requested',
    'infrastructure.snapshot_delete':'Snapshot deletion requested',
    'infrastructure.snapshot_restore':'Snapshot restoration requested',
    'infrastructure.vm_power':'Guest power change requested',
    'infrastructure.vm_import':'Guest adopted as host',
    'tofu.connection_remove': 'Platform connection removed',
    'server.notes_update':'Host notes updated',
    'server.update':'Host updated','server.create':'Host created','server.created':'Host created',
    'server.delete':'Host deleted','server.deleted':'Host deleted',
    'custom_update.create': 'Custom update created',
    'custom_update.update': 'Custom update changed',
    'custom_update.delete': 'Custom update deleted',
    'custom_update.check': 'Custom update checked',
    'custom_update.preview': 'Custom update previewed',
    'terminal.connect':'Terminal connected','terminal.connect_failed':'Terminal connection failed','terminal.disconnect':'Terminal disconnected',
    'login.success':'Sign-in succeeded','login.failed':'Sign-in failed',
    'system.audit_export':'Audit log exported','server.file_upload':'File uploaded','server.file_transfer':'File transferred',
    'users.create':'User created','users.update':'User updated','users.delete':'User deleted',
    'users.disable':'User account disabled','users.enable':'User account enabled',
    'users.password':'User password reset','users.totp.disable':'User MFA disabled',
    'users.sessions.revoke':'User sessions revoked',
    'ssh.import':'SSH key imported','ssh.export':'SSH private key exported',
    'roles.create':'Role created','roles.update':'Role updated','roles.delete':'Role deleted',
  };
  return labels[action] || action.replace(/[._-]+/g,' ').replace(/^\w/,letter=>letter.toUpperCase());
}


/** Audit acceptance is distinct from an asynchronous Proxmox task outcome. */
export function guestAuditPresentation(event:{action?:string;detail?:string;success?:boolean|number|null}):{label:string;outcome:string;tone:'danger'|'info'|'neutral'} {
 let label=auditActionLabel(event.action);
 if(event.action==='infrastructure.vm_power'){
  const operation=parseAuditDetail(event.detail).fields.find(field=>field.key==='action')?.value;
  label=({start:'Guest start requested',shutdown:'Guest shutdown requested',reboot:'Guest restart requested',stop:'Forced guest stop requested'} as Record<string,string>)[operation||''] || label;
 }
 const accepted=event.success===true||event.success===1;
 const rejected=event.success===false||event.success===0;
 const asynchronous=['infrastructure.proxmox_update_catalog','infrastructure.vm_power','infrastructure.snapshot_create','infrastructure.snapshot_delete','infrastructure.snapshot_restore'].includes(event.action||'');
 return {label,outcome:rejected?(asynchronous?'Request failed':'Failed'):accepted?(asynchronous?'Request accepted':'Recorded'):'Unknown',tone:rejected?'danger':accepted?'info':'neutral'};
}

export function gitPolicyChanges(detail?: string) {
  const fields = parseAuditDetail(detail).fields;
  try {
    const before = JSON.parse(fields.find(field => field.key === 'before')?.value || 'null');
    const after = JSON.parse(fields.find(field => field.key === 'after')?.value || 'null');
    const labels = { autoPull: 'Auto-pull', autoPush: 'Auto-push', readOnly: 'Remote read-only' };
    const keys = Object.keys(labels) as (keyof typeof labels)[];
    if (!before || !after || !keys.every(key => typeof before[key] === 'boolean' && typeof after[key] === 'boolean')) return null;
    return keys.filter(key => before[key] !== after[key]).map(key => ({label: labels[key], before: before[key] ? 'Enabled' : 'Disabled', after: after[key] ? 'Enabled' : 'Disabled'}));
  } catch { return null; }
}
