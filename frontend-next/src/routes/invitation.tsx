import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function InvitationPage() {
  // Fragment tokens are never sent in the initial HTTP request or referrer.
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token') || '');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [pending, setPending] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const preview = useQuery({
    queryKey: ['invitation-preview', token],
    queryFn: () => apiFetch<{username: string; displayName: string; roleName: string; expiresAt: number}>('/auth/invitations/preview', {method: 'POST', skipAuth: true, body: {token}}),
    retry: false, gcTime: 0, refetchOnWindowFocus: false,
  });
  async function accept(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (password.length < 12 || new TextEncoder().encode(password).length > 72) { setError('Use at least 12 characters and at most 72 UTF-8 bytes.'); return; }
    if (password !== confirmation) { setError('The passwords do not match.'); return; }
    setPending(true);
    try {
      await apiFetch('/auth/invitations/accept', {method: 'POST', skipAuth: true, body: {token, password}});
      setPassword(''); setConfirmation(''); setAccepted(true);
      window.history.replaceState(window.history.state, '', window.location.pathname);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not accept invitation.'); }
    finally { setPending(false); }
  }
  return <main className="grid min-h-screen place-items-center bg-background p-4">
    <section className="w-full max-w-md space-y-5 rounded-xl border bg-card p-6 shadow-sm">
      <div><p className="text-sm text-muted-foreground">Fleet · Account invitation</p><h1 className="mt-2 text-2xl font-semibold">{accepted ? 'Your account is ready' : 'Join your workspace'}</h1></div>
      {accepted ? <><p className="text-sm">Sign in as <strong>{preview.data?.username}</strong> with your new password.</p><Button asChild><Link to="/login">Continue to sign in</Link></Button></> : <>
        {preview.isPending && <p role="status">Checking invitation…</p>}
        {preview.isError && <div role="alert" className="space-y-3 text-sm"><p>{preview.error.message}</p><p>For an expired, revoked or changed invitation, ask an administrator for a new link.</p><Button variant="outline" onClick={() => void preview.refetch()}>Check again</Button></div>}
        {preview.isSuccess && <form onSubmit={accept} className="space-y-4">
          <div className="rounded-md bg-muted p-3 text-sm"><p className="font-medium">{preview.data.displayName || preview.data.username}</p><p>Username: {preview.data.username}</p><p>Role: {preview.data.roleName}</p><p className="mt-2 text-xs text-muted-foreground">Expires {formatDateTime(preview.data.expiresAt)}</p></div>
          <fieldset disabled={pending} className="space-y-4">
            <div><Label htmlFor="invite-password">Choose a password</Label><Input id="invite-password" type="password" autoComplete="new-password" required minLength={12} value={password} onChange={event => setPassword(event.target.value)} aria-describedby="invite-password-help"/><p id="invite-password-help" className="mt-1 text-xs text-muted-foreground">At least 12 characters; at most 72 UTF-8 bytes.</p></div>
            <div><Label htmlFor="invite-confirm">Confirm password</Label><Input id="invite-confirm" type="password" autoComplete="new-password" required value={confirmation} onChange={event => setConfirmation(event.target.value)}/></div>
            <Button type="submit" className="w-full">{pending ? 'Creating account…' : 'Accept invitation'}</Button>
          </fieldset>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </form>}
      </>}
    </section>
  </main>;
}
