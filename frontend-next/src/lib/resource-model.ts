/** Host links include hypervisor nodes as well as guest VMs. */
export function platformHostIds(clusters: Array<{
  nodes?: Array<{ fleet_server_id?: string | null }>;
  vms?: Array<{ fleet_server_id?: string | null }>;
}>): Set<string> {
  return new Set(clusters.flatMap(cluster => [...(cluster.nodes || []), ...(cluster.vms || [])])
    .map(resource => resource.fleet_server_id).filter((id): id is string => Boolean(id)));
}
export function managementLabel(hostId?: string | null, hasDefinition = false): string {
  if (hasDefinition) return hostId ? 'VM definition · host operations enabled' : 'VM definition';
  return hostId ? 'Host operations enabled' : 'Inventory only';
}
