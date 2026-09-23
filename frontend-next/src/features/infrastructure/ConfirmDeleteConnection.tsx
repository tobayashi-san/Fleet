import { useEffect, useRef, useState } from 'react';
import { useBlocker } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { showToast } from '@/lib/toast';
import { useUi } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ProxmoxConnection } from './ProxmoxConnectionDialog';

type Props = { connection: ProxmoxConnection | null; onOpenChange: (open: boolean) => void; onDeleted: () => void };

export function ConfirmDeleteConnection(props: Props) {
  return props.connection ? <RemovalDialog {...props} connection={props.connection} /> : null;
}

function RemovalDialog({ connection, onOpenChange, onDeleted }: Props & {connection: ProxmoxConnection}) {
  const [target] = useState(() => ({ ...connection }));
  const environmentId = useUi(state => state.environmentId);
  const contextChanged = environmentId !== target.environment_id || connection.id !== target.id;
  const submitting = useRef(false);
  const mounted = useRef(true);
  const queryClient = useQueryClient();
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const deletion = useMutation({
    mutationFn: () => {
      if (contextChanged) throw new Error('Return to the original environment and connection before removing it.');
      return apiFetch(`/opentofu/proxmox-connections/${encodeURIComponent(target.id)}`, {
        method: 'DELETE', environmentId: target.environment_id,
      });
    },
    onSettled: () => { submitting.current = false; },
    onSuccess: () => {
      showToast('Platform connection removed.', 'success');
      void queryClient.invalidateQueries({queryKey: ['opentofu', 'proxmox-connections', target.environment_id]});
      void queryClient.invalidateQueries({queryKey: ['opentofu', 'infrastructure', target.environment_id]});
      if (mounted.current) onDeleted();
    },
  });
  useBlocker({disabled: !deletion.isPending, enableBeforeUnload: deletion.isPending, shouldBlockFn: () => submitting.current});
  const close = () => { if (!submitting.current) onOpenChange(false); };
  return <Dialog open onOpenChange={next => { if (!next) close(); }}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Remove platform connection?</DialogTitle>
        <DialogDescription>Remove this saved connection from Fleet. This does not delete virtual machines, containers or data in Proxmox. Connections still used by deployments or adopted hosts cannot be removed.</DialogDescription>
      </DialogHeader>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 rounded-md border p-3 text-sm">
        <dt>Connection</dt><dd className="break-words font-medium">{target.name}</dd>
        <dt>Environment</dt><dd className="break-words">{target.environment_id}</dd>
        <dt>Endpoint</dt><dd className="break-all">{target.endpoint}</dd>
      </dl>
      {contextChanged && <p role="alert" className="text-sm text-amber-600">The environment or selection changed. Return to {target.environment_id} and the original connection before removing it.</p>}
      {deletion.isError && <p role="alert" className="text-sm text-destructive">{deletion.error instanceof Error ? deletion.error.message : 'The connection could not be removed.'}</p>}
      {deletion.isPending && <p role="status" className="text-sm text-muted-foreground">Removing the connection. Please wait before closing.</p>}
      <DialogFooter>
        <Button variant="outline" onClick={close} disabled={deletion.isPending}>Cancel</Button>
        <Button variant="destructive" disabled={deletion.isPending || contextChanged} onClick={() => {
          if (submitting.current || contextChanged) return;
          submitting.current = true;
          deletion.mutate();
        }}>Remove connection</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
