import { formatDateTime } from '@/lib/utils';
export interface GitComparison {
  state: 'unavailable' | 'aligned' | 'ahead' | 'behind' | 'diverged';
  ahead: number | null;
  behind: number | null;
}
export function GitSyncState({ comparison, lastFetchAt, conflicts = [] }: {
  comparison?: GitComparison; lastFetchAt?: string | null; conflicts?: string[];
}) {
  const labels = {
    unavailable: 'Remote comparison unavailable. Fetch the configured branch to establish a comparison.',
    aligned: 'Aligned with the last fetched remote revision.',
    ahead: 'Local commits are ready to publish when remote write access is enabled.',
    behind: 'Remote commits are available to pull into a clean working copy.',
    diverged: 'Branches have diverged. Reconcile local and remote commits in the Git workspace before synchronizing.',
  };
  return <div className="space-y-1 text-xs">
    <p className={comparison?.state === 'diverged' ? 'text-warning' : 'text-muted-foreground'}>{labels[comparison?.state ?? 'unavailable']}</p>
    {comparison && comparison.state !== 'unavailable' && <p>{comparison.ahead} local-only commits · {comparison.behind} remote-only commits</p>}
    <p className="text-muted-foreground">Last successful fetch: {lastFetchAt ? formatDateTime(lastFetchAt) : 'Not recorded'}. Comparison uses locally cached remote data; it does not verify the current remote state.</p>
    {conflicts.length > 0 && <div role="alert" className="space-y-1 text-destructive">
      <p>Unresolved merge conflicts. Resolve or abort the merge in the Git workspace, then refresh. Synchronization and publishing are blocked to preserve conflict files.</p>
      <ul className="break-all font-mono">{conflicts.map(file => <li key={file}>{file}</li>)}</ul>
    </div>}
  </div>;
}
