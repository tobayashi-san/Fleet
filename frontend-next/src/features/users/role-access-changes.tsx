export interface AccessPermissions {
  servers?: 'all' | { groups?: (string | number)[]; servers?: (string | number)[] };
  playbooks?: 'all' | string[];
  plugins?: 'all' | string[];
  [cap: string]: unknown;
}

const ids = (values: (string | number)[] = []) => [...new Set(values.map(String))].sort();
export interface AccessResourceLabels {
  groups?: Record<string, string>;
  servers?: Record<string, string>;
  playbooks?: Record<string, string>;
  plugins?: Record<string, string>;
}
const list = (values: string[], labels?: Record<string, string>) => values.map(value => {
  const name = labels?.[value];
  return name ? `${JSON.stringify(name)} (ID: ${JSON.stringify(value)})` : `ID: ${JSON.stringify(value)} (name unavailable)`;
}).join(', ') || 'None';
export function editableCapabilities(permissions: AccessPermissions, keys: string[]) {
  return Object.fromEntries(keys.map(key => [key, permissions[key] === true]));
}
function resourceScopes(permissions: AccessPermissions, labels?: AccessResourceLabels) {
  const full = permissions.full === true;
  const servers = permissions.servers;
  return {
    Hosts: full || servers === 'all' ? 'All hosts' : `Groups: ${list(ids(servers?.groups), labels?.groups)}; individual hosts: ${list(ids(servers?.servers), labels?.servers)}`,
    Playbooks: full || permissions.playbooks === 'all' ? 'All playbooks' : list(ids(permissions.playbooks), labels?.playbooks),
  };
}
export function compareRoleAccess(before: AccessPermissions, after: AccessPermissions, capabilityKeys: string[], labels?: AccessResourceLabels) {
  const changes: {label: string; before: string; after: string}[] = [];
  const wasFull = before.full === true, isFull = after.full === true;
  if (wasFull !== isFull) changes.push({label:'Unrestricted administrator access',before:wasFull?'Allowed':'Not allowed',after:isFull?'Allowed':'Not allowed'});
  const oldScopes = resourceScopes(before, labels), newScopes = resourceScopes(after, labels);
  for (const label of ['Hosts','Playbooks'] as const) {
    if (oldScopes[label] !== newScopes[label]) changes.push({label,before:oldScopes[label],after:newScopes[label]});
  }
  const keys = [...new Set([...capabilityKeys,...Object.keys(before),...Object.keys(after)].filter(key=>/^can[A-Z]/.test(key) && key !== 'canManageDeployments'))].sort();
  for (const key of keys) {
    const oldGrant = wasFull || before[key] === true, newGrant = isFull || after[key] === true;
    if (oldGrant !== newGrant) changes.push({label:key.replace(/^can/,'').replace(/([a-z])([A-Z])/g,'$1 $2'),before:oldGrant?'Allowed':'Not allowed',after:newGrant?'Allowed':'Not allowed'});
  }
  return changes;
}

export function RoleAccessChanges({before,after,capabilityKeys,labels,description='Current role → selected role.'}:{before?:AccessPermissions;after?:AccessPermissions;capabilityKeys:string[];labels?:AccessResourceLabels;description?:string}) {
  if (!before || !after) return <p role="status" className="text-sm text-amber-600 dark:text-amber-400">The access change cannot be compared because permission details are unavailable. Review both roles before continuing.</p>;
  const changes = compareRoleAccess(before,after,capabilityKeys,labels);
  return <section className="space-y-2 rounded-md border p-3 text-xs" aria-label="Access changes">
    <h3 className="font-medium">Access changes</h3>
    <p className="text-muted-foreground">{description} Names are shown when available, with identifiers to distinguish resources. Group access includes descendants.</p>
    {changes.length ? <ul className="space-y-2">{changes.map(change=><li key={change.label} className="break-words [overflow-wrap:anywhere]"><strong>{change.label}</strong><div><span className="text-muted-foreground">{change.before}</span> → {change.after}</div></li>)}</ul> : <p>No effective access changes.</p>}
  </section>;
}

export function RoleAccessSummary({permissions, labels, sensitiveCapabilityKeys}: {
  permissions?: AccessPermissions;
  labels?: AccessResourceLabels;
  sensitiveCapabilityKeys: string[];
}) {
  return <section className="space-y-2 rounded-md border p-3 text-xs [overflow-wrap:anywhere]" aria-label="Effective access">
    <h3 className="font-medium">Effective access</h3>
    {!permissions ? <p role="status">Permission details unavailable. Review this role before assigning it.</p>
      : permissions.full === true ? <p className="text-destructive">Unrestricted access to all resources and administrative capabilities, including user management and system settings.</p>
      : <>
        <dl className="space-y-2">{Object.entries(resourceScopes(permissions, labels)).map(([label, value]) => <div key={label}><dt className="font-medium">{label}</dt><dd>{value}</dd></div>)}</dl>
        <p className="text-muted-foreground">Group access includes descendants. Resources without an available name retain their identifier.</p>
        <p><strong>Sensitive capabilities: </strong>{sensitiveCapabilityKeys.filter(key => permissions[key] === true).map(key => key.replace(/^can/, '').replace(/([a-z])([A-Z])/g, '$1 $2')).join(', ') || 'None'}.</p>
      </>}
  </section>;
}

/** Match granted capabilities only; resource scope is reviewed separately. */
export function matchesRolePreset(permissions: AccessPermissions | undefined, grants: string[]) {
  if (!permissions || permissions.full === true) return false;
  const actual = Object.keys(permissions).filter(key => /^can[A-Z]/.test(key) && key !== 'canManageDeployments' && permissions[key] === true).sort();
  const expected = [...new Set(grants)].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}
