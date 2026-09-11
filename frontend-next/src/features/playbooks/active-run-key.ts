/** User IDs survive renames and are not reused when an account is recreated. */
export function activeRunKey(userId: string | number, environmentId: string): string {
  return `shipyard.active-playbook-run.v2:${JSON.stringify([String(userId), environmentId])}`;
}
