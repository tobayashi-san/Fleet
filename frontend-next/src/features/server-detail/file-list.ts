export function filterFileEntries<T extends {name:string;type:string}>(entries: readonly T[], search: string, showHidden: boolean): T[] {
  const needle=search.trim().toLocaleLowerCase();
  return entries.filter(entry => (showHidden || !entry.name.startsWith('.')) && (!needle || entry.name.toLocaleLowerCase().includes(needle))).sort((a,b)=>{
    if (a.type === 'directory' && b.type !== 'directory') return -1;
    if (a.type !== 'directory' && b.type === 'directory') return 1;
    return a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:'base'});
  });
}
export function describePermissions(mode:number): string {
  if (!Number.isInteger(mode) || mode < 0) return 'Permissions unavailable';
  const group=(shift:number)=>['read','write','execute'].filter((_,index)=>(mode & (1 << (shift+2-index))) !== 0).join(', ') || 'none';
  const special=[mode & 0o4000 ? 'setuid' : '', mode & 0o2000 ? 'setgid' : '', mode & 0o1000 ? 'sticky bit' : ''].filter(Boolean);
  return `Owner: ${group(6)}; group: ${group(3)}; others: ${group(0)}${special.length ? `; ${special.join(', ')}` : ''}`;
}
