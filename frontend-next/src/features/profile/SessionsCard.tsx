import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { notifyUnauthorized } from '@/lib/auth';
import { formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { QueryErrorState } from '@/components/ui/query-error-state';

interface Session {
  id: string; current: boolean; created_at: number; last_seen_at: number;
  expires_at: number; ip: string; user_agent: string;
}
interface SessionsResponse { sessions: Session[]; total: number; legacy_current: boolean }
const PAGE_SIZE = 20;

export function SessionsCard() {
  const client = useQueryClient();
  const [page, setPage] = useState(0);
  const query = useQuery({
    queryKey: ['auth-sessions', page],
    queryFn: () => apiFetch<SessionsResponse>(`/auth/sessions?offset=${page * PAGE_SIZE}`),
    retry: false,
  });
  const revoke = useMutation({
    mutationFn: (id: string) => apiFetch<{current: boolean}>(`/auth/sessions/${encodeURIComponent(id)}`, {method: 'DELETE'}),
    onSuccess: result => {
      if (result.current) notifyUnauthorized();
      else {
        if (query.data?.sessions.length === 1 && page > 0) setPage(page - 1);
        void client.invalidateQueries({queryKey: ['auth-sessions']});
      }
    },
  });
  const date = (value: number) => formatDateTime(new Date(value).toISOString());
  const total = query.data?.total ?? 0;
  return <Card>
    <CardHeader>
      <CardTitle>Sign-in sessions</CardTitle>
      <p className="text-sm text-muted-foreground">Revoke an individual sign-in to end its API access and connected terminals. Existing work on managed hosts may continue. The current session is listed first, followed by newest sign-ins.</p>
    </CardHeader>
    <CardContent>
      <Button variant="outline" size="sm" disabled={query.isFetching || revoke.isPending} onClick={() => void query.refetch()}>Refresh sessions</Button>
      {query.isLoading ? <p className="mt-3 text-sm">Loading sessions…</p> : query.isError ? <QueryErrorState error={query.error} onRetry={() => void query.refetch()}/> : <>
        {query.data?.legacy_current && <p className="mt-3 text-sm text-muted-foreground">This sign-in predates session tracking. Older sessions are not listed; signing out revokes this one, while changing your password revokes all older sessions.</p>}
        {!query.data?.sessions.length && <p className="mt-3 text-sm">{page ? 'No sessions on this page. Return to the previous page or refresh.' : 'No tracked active sessions.'}</p>}
        <ul className="mt-3 divide-y">{query.data?.sessions.map(session => <li key={session.id} className="flex flex-col items-start justify-between gap-3 py-3 sm:flex-row">
          <div className="min-w-0 w-full flex-1 text-sm">
            <strong>{session.current ? 'This session' : 'Other session'}</strong>
            <p className="break-words text-muted-foreground">{session.user_agent || 'Client not reported'}</p>
            <p className="break-all">IP: {session.ip || 'Not reported'}</p>
            <p className="text-xs text-muted-foreground">Signed in {date(session.created_at)}<br/>Last seen {date(session.last_seen_at)}<br/>Expires {date(session.expires_at)}</p>
          </div>
          <Button variant="outline" size="sm" disabled={revoke.isPending} onClick={() => revoke.mutate(session.id)}>{revoke.isPending && revoke.variables === session.id ? 'Revoking…' : session.current ? 'Sign out here' : 'Revoke session'}</Button>
        </li>)}</ul>
      </>}
      {revoke.isError && <p role="alert" className="mt-3 break-words text-sm text-destructive">{revoke.error.message}</p>}
      <nav aria-label="Session pages" className="mt-3 flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" disabled={!page || query.isFetching || revoke.isPending} onClick={() => setPage(page - 1)}>Previous</Button>
        <span className="text-sm text-muted-foreground">Page {page + 1}{query.data ? ` · ${total} active sessions` : ''}</span>
        <Button variant="outline" size="sm" disabled={query.isFetching || revoke.isPending || !query.data || (page + 1) * PAGE_SIZE >= total} onClick={() => setPage(page + 1)}>Next</Button>
      </nav>
    </CardContent>
  </Card>;
}
