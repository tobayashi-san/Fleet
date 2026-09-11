interface Cluster { id: string; connections?: { name?: string }[]; nodes?: { name: string; fleet_server_id?: string | null }[]; vms?: { name?: string; vm_id: number | string; node_name: string; guest_type?: string; fleet_server_id?: string | null }[] }
export function infrastructureSearchItems(clusters: Cluster[], hosts: Array<{id: string; name: string}> = []) {
  const names = new Map(hosts.map(host => [host.id, host.name]));
  const hostKeywords = (id?: string | null) => names.has(id || "") ? [names.get(id || "")!] : [];
  const hostDetail = (id?: string | null) => names.has(id || '') ? ` · Host: ${names.get(id || '')}` : '';
  return clusters.flatMap(cluster => {
    const base = `/infrastructure/${encodeURIComponent(cluster.id)}`;
    const platform = cluster.connections?.[0]?.name || 'Proxmox';
    return [
      { id: base, path: base, label: platform, detail: 'Platform', keywords: [cluster.id, platform] },
      ...(cluster.nodes || []).map(node => ({ id: `${base}/${node.name}`, path: `${base}/nodes/${encodeURIComponent(node.name)}`, label: node.name, detail: `Node · ${platform}${hostDetail(node.fleet_server_id)}`, keywords: [node.name, platform, ...hostKeywords(node.fleet_server_id)] })),
      ...(cluster.vms || []).map(vm => ({ id: `${base}/${vm.node_name}/${vm.vm_id}`, path: `${base}/nodes/${encodeURIComponent(vm.node_name)}/vms/${encodeURIComponent(vm.vm_id)}`, label: vm.name || `VM ${vm.vm_id}`, detail: `${vm.guest_type === 'lxc' ? 'CT' : 'VM'} ${vm.vm_id} · ${vm.node_name} · ${platform}${hostDetail(vm.fleet_server_id)}`, keywords: [String(vm.vm_id), vm.name || '', vm.node_name, platform, ...hostKeywords(vm.fleet_server_id)] })),
    ];
  });
}
