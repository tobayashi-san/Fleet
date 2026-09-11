import { useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiFetch } from '@/lib/api';
import { useUi } from '@/lib/store';
import { useEnvironments } from '@/lib/queries';
import { formatDateTime } from '@/lib/utils';
import { showToast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { QueryErrorState } from '@/components/ui/query-error-state';

export interface CancelRunTarget { id: string; environment: string }
interface Preview { id: string; environment_id: string; name: string; playbook: string; targets: string; status: string; started_at: string }
export function CancelRunDialog({ target, onClose }: { target: CancelRunTarget | null; onClose: () => void }) {
  return target ? <CancelRunSession key={JSON.stringify(target)} target={target} onClose={onClose} /> : null;
}
function CancelRunSession({ target, onClose }: { target: CancelRunTarget; onClose: () => void }) {
  const selectedEnvironment = useUi(state => state.environmentId);
  const environments = useEnvironments();
  const environmentName = String(environments.data?.find(item => item.id === target.environment)?.name || target.environment);
  const client = useQueryClient();
  const submitting = useRef(false);
  const preview = useQuery({
    queryKey: ['cancel-run-preview', target.environment, target.id],
    queryFn: () => apiFetch<Preview>(`/ansible/runs/${encodeURIComponent(target.id)}/cancel-preview`, { environmentId: target.environment }),
    staleTime: 0,
  });
  const cancel = useMutation({
    mutationFn: () => api.cancelPlaybookRun(target.id, target.environment),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['scheduleHistory', target.environment] });
      void client.invalidateQueries({ queryKey: ['operations', target.environment] });
      showToast('Cancellation requested. Check the execution result before starting another run.', 'success');
      onClose();
    },
  });
  const contextChanged = selectedEnvironment !== target.environment;
  const confirm = async () => {
    if (submitting.current || contextChanged || preview.isFetching || preview.isError || preview.data?.status !== 'running') return;
    submitting.current = true;
    try { await cancel.mutateAsync(); } catch { /* keep the error and target visible */ }
    finally { submitting.current = false; }
  };
  return <Dialog open onOpenChange={open => { if (!open && !submitting.current) onClose(); }}>
    <DialogContent>
      <DialogHeader><DialogTitle>Cancel this playbook run?</DialogTitle></DialogHeader>
      <p className="text-sm">The controller will request that this run stop. Changes already applied are not rolled back, and work already started on remote hosts may continue.</p>
      <p className="text-sm">Environment: <strong>{environmentName}</strong></p>
      {preview.isPending && <p role="status">Loading the execution to cancel…</p>}
      {preview.isError && <QueryErrorState compact title="Run could not be verified" error={preview.error} onRetry={() => void preview.refetch()} />}
      {preview.data && <div className="space-y-1 rounded-md border bg-muted/30 p-3 text-sm">
        <p className="font-semibold">{preview.data.name}</p><p>{preview.data.playbook}</p>
        <p className="break-all">Targets: {preview.data.targets}</p><p>Started: {formatDateTime(preview.data.started_at)}</p>
        <p className="break-all text-xs text-muted-foreground">Execution: {target.id}</p>
        {preview.data.status !== 'running' && <p role="status">This run is {preview.data.status}; cancellation is unavailable.</p>}
      </div>}
      {contextChanged && <p role="alert" className="text-sm text-warning">Environment changed. Close this confirmation and reopen it in the intended environment.</p>}
      {cancel.isError && <p role="alert" className="text-sm text-destructive">{cancel.error.message}</p>}
      <DialogFooter>
        <Button variant="outline" disabled={cancel.isPending} onClick={onClose}>Keep running</Button>
        <Button variant="destructive" disabled={cancel.isPending || contextChanged || preview.isFetching || preview.isPending || preview.isError || preview.data?.status !== 'running'} onClick={() => void confirm()}>{cancel.isPending ? 'Requesting cancellation…' : 'Request cancellation'}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
