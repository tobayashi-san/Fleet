import { Timestamp } from '@/components/ui/timestamp';
import { Link, useParams, useSearch } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '@/lib/api';
import { useEnvironments } from '@/lib/queries';
import { Button } from '@/components/ui/button';
import { useUi } from '@/lib/store';
import { statusLabel } from '@/lib/history-labels';
import { PageHeader } from '@/components/ui/page-header';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { StatusBadge } from '@/components/ui/status-badge';
import type { OperationRow } from './operations';

interface Execution extends OperationRow {
  execution_id: string;
  duration_seconds: number | null;
  summary: string;
  output: string;
  output_truncated: boolean;
}

export function OperationExecutionPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const selectedEnvironmentId = useUi(state => state.environmentId);
  const setEnvironmentId = useUi(state => state.setEnvironmentId);
  const search = useSearch({ strict: false }) as { environment?: string };
  const environmentId = search.environment || selectedEnvironmentId;
  const environments = useEnvironments();
  const environment = environments.data?.find(item => item.id === environmentId);
  const environmentName = String(environment?.name || environmentId);

  const { t } = useTranslation();
  const details = useQuery({
    queryKey: ['operation-details', environmentId, id],
    queryFn: () => apiFetch<Execution>(`/operations/${encodeURIComponent(id)}/details`, { environmentId }),
    refetchInterval: query => ['running', 'queued', 'pending', 'cancelling'].includes(query.state.data?.status || '') ? 3000 : false,
  });
  const row = details.isError ? undefined : details.data;
  return <div className="space-y-4">
    <Link to="/operations" className="text-sm text-primary hover:underline">{environmentId === selectedEnvironmentId ? 'Back to operations' : 'Back to current environment operations'}</Link>
    <PageHeader title={row?.name || 'Execution details'} description={row ? `${row.source} · ${row.target}` : 'Inspect the selected execution and its recorded output.'} />
    <div className="flex flex-wrap items-center gap-3 rounded-md border bg-card p-3 text-sm" role="status">
      <span>Execution environment: <strong>{environmentName}</strong></span>
      {environmentId !== selectedEnvironmentId && <>
        <span className="text-muted-foreground">This link uses a different environment from the console selection.</span>
        {environment && <Button size="sm" variant="outline" onClick={() => setEnvironmentId(environmentId)}>Use this environment in the console</Button>}
      </>}
    </div>
    {details.isPending && <p role="status">Loading execution details…</p>}
    {details.isError && <QueryErrorState error={details.error} title="Execution details unavailable" onRetry={() => void details.refetch()} />}
    {row && !details.isError && <>
      <section aria-label="Execution summary" className="space-y-3 rounded-md border bg-card p-4">
        <StatusBadge tone={row.status === 'failed' ? 'danger' : row.status === 'success' ? 'success' : ['running', 'queued', 'pending', 'cancelling'].includes(row.status) ? 'info' : 'muted'}>{statusLabel(t, row.status)}</StatusBadge>
        {row.source === 'Workflow' && <p className="text-sm">{row.check_mode ? 'Dry run' : 'Execution'} · {row.playbook}{row.schedule_deleted ? ' · Schedule deleted' : ''}</p>}
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-muted-foreground">Target</dt><dd>{row.target}{row.target_deleted ? ' (deleted host)' : ''}{row.target_detail ? ` · ${row.target_detail}` : ''}</dd></div>
          <div><dt className="text-muted-foreground">Triggered by</dt><dd>{row.initiator}</dd></div>
          <div><dt className="text-muted-foreground">Started</dt><dd>{row.started_at ? <Timestamp value={row.started_at} /> : 'Not recorded'}</dd></div>
          <div><dt className="text-muted-foreground">Completed</dt><dd>{row.completed_at ? <Timestamp value={row.completed_at} /> : (['running', 'queued', 'pending', 'cancelling'].includes(row.status) ? 'Pending completion' : 'Not recorded')}</dd></div>
          <div><dt className="text-muted-foreground">Duration</dt><dd>{row.duration_seconds === null ? (['running', 'queued', 'pending', 'cancelling'].includes(row.status) ? 'Pending completion' : 'Not recorded') : `${row.duration_seconds}s`}</dd></div>
          <div><dt className="text-muted-foreground">Execution</dt><dd className="break-all font-mono">{row.execution_id}</dd></div>
        </dl>
        <p className="break-words">{row.summary}</p>
      </section>
      <section aria-label="Execution log" className="space-y-2 rounded-md border bg-card p-4">
        <h2 className="font-semibold">Execution log</h2>
        {row.output_truncated && <p className="text-sm text-muted-foreground">Showing the last 200,000 characters.</p>}
        <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words rounded bg-muted p-3 text-xs">{row.output || 'No output recorded.'}</pre>
      </section>
    </>}
  </div>;
}
