import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils';
import type { DeleteHostOutcome } from './delete-host-batch';

export function BulkDeleteResult({outcomes,completedAt,onDismiss,onSelectFailed}: {
  outcomes:DeleteHostOutcome[];completedAt:string;onDismiss:()=>void;onSelectFailed:()=>void;
}) {
  const failures=outcomes.filter(row=>!row.deleted);
  return <section aria-label="Host deletion result" className="rounded-md border p-4 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p role="status" className="text-sm font-medium">{outcomes.length-failures.length} deleted · {failures.length} failed</p>
      <Button size="sm" variant="ghost" onClick={onDismiss}>Dismiss result</Button>
    </div>
    <p className="text-xs text-muted-foreground">Completed: {formatDateTime(completedAt)}</p>
    {failures.length > 0 && <>
      <ul className="max-h-48 overflow-auto space-y-2 text-sm">{failures.map(row=><li key={row.id} className="break-words"><span className="font-medium">{row.name}</span> · <span className="font-mono text-xs">{row.ip_address}</span><p className="text-xs text-destructive">{row.error}</p></li>)}</ul>
      <Button size="sm" variant="outline" onClick={onSelectFailed}>Select available failed hosts</Button>
      <p className="text-xs text-muted-foreground">Selection does not retry deletion. Review the selected hosts and use Delete to try again.</p>
    </>}
  </section>;
}
