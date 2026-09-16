export interface JsonChange {path:string;before:unknown;after:unknown}
/** Compare JSON values by property; keep arrays together so collector ordering stays visible. */
export function jsonChanges(before:unknown, after:unknown, path='$'):JsonChange[] {
  if (JSON.stringify(before) === JSON.stringify(after)) return [];
  const object = (value:unknown): value is Record<string,unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
  if (object(before) && object(after)) return [...new Set([...Object.keys(before),...Object.keys(after)])].flatMap(key=>jsonChanges(Object.hasOwn(before,key) ? before[key] : undefined,Object.hasOwn(after,key) ? after[key] : undefined,`${path}[${JSON.stringify(key)}]`));
  return [{path,before,after}];
}
