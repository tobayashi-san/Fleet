import type {Profile} from '@/lib/queries';

/** Matches backend folder scope; visible ancestors do not grant administration. */
export function hasHostFolderScope(profile:Profile | null | undefined, groupId:string | null):boolean {
  if (!profile) return false;
  if (profile.role==='admin' || profile.permissions?.full || profile.permissions?.servers==='all') return true;
  if (!groupId) return false;
  const scope=profile.permissions?.servers;
  return !!scope && typeof scope==='object' && (scope.groups || []).includes(groupId);
}
