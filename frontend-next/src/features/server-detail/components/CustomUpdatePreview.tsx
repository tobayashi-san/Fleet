import { useUi } from '@/lib/store';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

export function CustomUpdatePreview({ serverId, draft, disabled = false }: { serverId: string; draft: Record<string, unknown>; disabled?: boolean }) {
  const environmentId = useUi(state => state.environmentId);
  const snapshot = JSON.stringify({ serverId, environmentId, draft });
  const preview = useMutation({
    mutationFn: async (input: { serverId: string; draft: Record<string, unknown>; snapshot: string }) => ({
      result: await api.previewCustomUpdateTask(input.serverId, input.draft), snapshot: input.snapshot,
    }),
  });
  const current = preview.variables?.snapshot === snapshot;
  return <div className="space-y-2 rounded-md border p-3">
    <p className="text-xs text-muted-foreground">Runs the check commands on this host and fetches the release source when configured. Use commands that only read state. Each SSH command has a 30-second limit; release lookup has a 15-second limit. The update command is never executed; the task is not saved.</p>
    <Button type="button" size="sm" variant="outline" disabled={disabled || preview.isPending} onClick={() => preview.mutate({ serverId, draft: structuredClone(draft), snapshot })}>{preview.isPending ? 'Checking…' : 'Test check before saving'}</Button>
    {preview.variables && !current && <p role="status" className="text-xs text-warning">Inputs changed. Run the check again for this draft.</p>}
    {current && preview.isError && <p role="alert" className="text-xs text-destructive">{preview.error.message}</p>}
    {current && preview.data?.snapshot === snapshot && <div role="status" className="space-y-1 break-words text-xs">
      <p>Observed: <code>{preview.data.result.current_version ?? '(empty)'}</code></p>
      <p>Compared with: <code>{preview.data.result.last_version ?? '(empty)'}</code></p>
      <p>{preview.data.result.has_update ? 'This check indicates an update.' : 'This check does not indicate an update.'}</p>
    </div>}
  </div>;
}
