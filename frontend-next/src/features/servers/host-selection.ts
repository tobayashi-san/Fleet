export function selectHostPage(selected: ReadonlySet<string>, pageIds: string[], checked: boolean): Set<string> {
  const next = new Set(selected);
  for (const id of pageIds) {
    if (checked) next.add(id);
    else next.delete(id);
  }
  return next;
}

export function hostSelectionScope(selected: ReadonlySet<string>, pageIds: string[], filteredIds: string[]) {
  const onPage = new Set(pageIds);
  const inFilter = new Set(filteredIds);
  return {
    onPage: [...selected].filter(id=>onPage.has(id)).length,
    otherPages: [...selected].filter(id=>inFilter.has(id) && !onPage.has(id)).length,
    outsideFilter: [...selected].filter(id=>!inFilter.has(id)).length,
  };
}

export function groupHostIds(node: {id:string;children:typeof node[]}, byGroup: Record<string,Array<{id:string}>>, visited = new Set<string>()): string[] {
  if (visited.has(node.id)) return [];
  visited.add(node.id);
  return [...new Set([...(byGroup[node.id] || []).map(host=>host.id), ...node.children.flatMap(child=>groupHostIds(child,byGroup,visited))])];
}
