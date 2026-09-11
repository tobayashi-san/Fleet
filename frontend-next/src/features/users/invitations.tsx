import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QueryErrorState } from '@/components/ui/query-error-state';

export interface Invitation {
  id: string; username: string; role: string; expiresAt: number;
  status?: 'pending' | 'invalid' | 'accepted' | 'revoked' | 'expired';
  invalidReason?: 'issuer_changed' | 'role_changed' | 'username_unavailable' | null;
  acceptedAt: number | null; revokedAt: number | null; token?: string;
}
export function InvitationLink({ invitation }: { invitation: Invitation }) {
  const [feedback, setFeedback] = useState('');
  const link = `${window.location.origin}/invite#token=${encodeURIComponent(invitation.token || '')}`;
  return <div className="space-y-3">
    <p className="text-sm">Share this single-use link privately with <strong>{invitation.username}</strong>. They choose their own password. No email has been sent.</p>
    <Label htmlFor="invitation-link">Invitation link</Label><Input id="invitation-link" readOnly value={link} onFocus={event => event.target.select()}/>
    <p className="text-xs text-muted-foreground">Expires {formatDateTime(invitation.expiresAt)}. The link is shown only here; if lost, revoke this invitation and create another.</p>
    <Button variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(link); setFeedback('Link copied.'); } catch { setFeedback('Copy unavailable. Select and copy the link above.'); } }}>Copy link</Button>
    {feedback && <p role="status" className="text-sm">{feedback}</p>}
  </div>;
}
export function InvitationsPanel({ roles }: { roles: {id: string; name: string}[] }) {
  const qc = useQueryClient();
  const invitations = useQuery({queryKey: ['user-invitations'], queryFn: () => apiFetch<Invitation[]>('/users/invitations'), refetchInterval: 30_000});
  const revoke = useMutation({mutationFn: (id: string) => apiFetch(`/users/invitations/${encodeURIComponent(id)}`, {method: 'DELETE'}), onSuccess: () => { void qc.invalidateQueries({queryKey: ['user-invitations']}); }});
  const active = invitations.data?.filter(item => !item.acceptedAt && !item.revokedAt && item.expiresAt > Date.now()) || [];
  return <section className="space-y-3 border-t p-4">
    <h3 className="text-sm font-semibold">Open invitations</h3>
    <p className="text-xs text-muted-foreground">Links expire after 24 hours. Role changes, a disabled issuer or revoking all of the issuer’s sessions invalidate their invitations.</p>
    {invitations.isPending && <p role="status" className="text-sm">Loading invitations…</p>}
    {invitations.isError && <QueryErrorState compact error={invitations.error} onRetry={() => void invitations.refetch()} title="Invitations could not be loaded"/>}
    {invitations.isSuccess && !active.length && <p className="text-sm text-muted-foreground">No open invitations.</p>}
    {active.map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"><div className="min-w-0 text-sm"><p className="break-words font-medium">{item.username}</p><p className="text-xs text-muted-foreground">{roles.find(role => role.id === item.role)?.name || item.role} · Expires {formatDateTime(item.expiresAt)}</p>{item.status === 'invalid' && <p className="mt-1 text-xs text-destructive">Cannot be accepted: {item.invalidReason === 'role_changed' ? 'the reviewed role changed' : item.invalidReason === 'username_unavailable' ? 'the username is already in use' : 'the issuing administrator’s access changed'}. Revoke this link before creating a replacement.</p>}</div><Button size="sm" variant="outline" disabled={revoke.isPending} onClick={() => revoke.mutate(item.id)}>{revoke.isPending && revoke.variables === item.id ? 'Revoking…' : 'Revoke invitation'}</Button></div>)}
    {revoke.isError && <p role="alert" className="text-sm text-destructive">{revoke.error.message}</p>}
  </section>;
}
