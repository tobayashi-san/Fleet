export function filterTargetHosts<T extends Record<string, unknown>>(hosts: T[], filters: { search?: string; group?: string; tag?: string; status?: string }) {
  const needle=filters.search?.trim().toLowerCase() || '';
  return hosts.filter(host=>{
    const tags=Array.isArray(host.tags)?host.tags.map(String):[];
    const searchable=[host.name,host.hostname,host.ip_address,...tags].filter(value=>value!=null).join(' ').toLowerCase();
    return (!needle || searchable.includes(needle)) && (!filters.group || String(host.group_id || '')===filters.group) && (!filters.tag || tags.includes(filters.tag)) && (!filters.status || host.status===filters.status);
  });
}
export function scheduleTargetPreview(hosts: Record<string,unknown>[], checked: Set<string>, all: boolean) {
  const names=hosts.map(host=>String(host.name));
  return { targets:all?names.filter(name=>!checked.has(name)):[...checked], unavailable:[...checked].filter(name=>name!=='localhost'&&!names.includes(name)) };
}
