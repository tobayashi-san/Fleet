import { Link, useBlocker } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, RefreshCw, ServerCog } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { showToast } from '@/lib/toast';
import { useProfile } from '@/lib/queries';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Folder {
  id: string;
  name: string;
  environment_id?: string;
}

interface GuestIp {
  ip_address?: string | null;
}

interface ImportProxmoxVmDialogProps {
  connectionId: string;
  environmentId: string;
  vm: {
    name: string;
    node_name: string;
    vm_id: number;
    guest_type?: 'qemu' | 'lxc';
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportProxmoxVmDialog(props: ImportProxmoxVmDialogProps) {
  return props.open ? <ImportForm {...props} /> : null;
}

function ImportForm(props: ImportProxmoxVmDialogProps) {
  const [target] = useState(() => ({connectionId: props.connectionId, environmentId: props.environmentId, vm: {...props.vm}}));
  const {connectionId, environmentId, vm} = target;
  const {onOpenChange} = props;
  const contextChanged = props.environmentId !== environmentId || props.connectionId !== connectionId || props.vm.node_name !== vm.node_name || props.vm.vm_id !== vm.vm_id || props.vm.guest_type !== vm.guest_type;
  const pending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const queryClient = useQueryClient();
  const profile = useProfile();
  const canInstallKey = profile.data?.role === 'admin' && !profile.isError;
  const keyAccess = useRef(canInstallKey);
  keyAccess.current = canInstallKey;
  const kind = vm.guest_type === 'lxc' ? 'CT' : 'VM';
  const [name, setName] = useState(vm.name);
  const [ipAddress, setIpAddress] = useState('');
  const [ipEdited, setIpEdited] = useState(false);
  const [sshUser, setSshUser] = useState('root');
  const [sshPort, setSshPort] = useState('22');
  const [groupId, setGroupId] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  useEffect(() => { if (!canInstallKey) setTemporaryPassword(''); }, [canInstallKey]);
  const [partialResult, setPartialResult] = useState<{serverId: string; error: string} | null>(null);

  const groupsQuery = useQuery({
    queryKey: ['server-groups', environmentId],
    queryFn: () => apiFetch<Folder[]>(`/servers/groups?environment_id=${encodeURIComponent(environmentId)}`, {environmentId}),
    enabled: !contextChanged && !partialResult,
    staleTime: 30_000,
  });
  const groups = (Array.isArray(groupsQuery.data) ? groupsQuery.data : [])
    .filter(group => String(group.environment_id || environmentId) === environmentId);
  const guestIpQuery = useQuery({
    queryKey: ['opentofu', 'proxmox-guest-ip', environmentId, connectionId, vm.node_name, vm.vm_id],
    queryFn: () => apiFetch<GuestIp>(`/opentofu/proxmox-connections/${encodeURIComponent(connectionId)}/guest-ip?node=${encodeURIComponent(vm.node_name)}&vm_id=${vm.vm_id}`, {environmentId}),
    enabled: !contextChanged && !partialResult && Boolean(connectionId),
    retry: false,
  });

  useEffect(() => {
    if (!ipEdited && guestIpQuery.data?.ip_address) setIpAddress(guestIpQuery.data.ip_address);
  }, [guestIpQuery.data?.ip_address, ipEdited]);

  const dirty = !partialResult && (name !== vm.name || ipEdited || sshUser !== 'root' || sshPort !== '22' || Boolean(groupId || temporaryPassword));
  const importMutation = useMutation({
    mutationFn: async () => {
      if (partialResult) throw new Error('This guest has already been adopted. Open the existing host.');
      if (temporaryPassword && !keyAccess.current) throw new Error('SSH key installation requires an administrator. Clear the password to adopt without key installation.');
      if (contextChanged) throw new Error('The environment or guest changed. Return to the original guest before adopting it.');
      const result = await apiFetch<{ server: { id: string; ip_address: string } }>(
        `/opentofu/proxmox-connections/${encodeURIComponent(connectionId)}/import-vm`,
        {
          method: 'POST',
          environmentId,
          body: {
            name,
            node_name: vm.node_name,
            vm_id: vm.vm_id,
            guest_type: vm.guest_type || 'qemu',
            ip_address: ipAddress,
            ssh_user: sshUser,
            ssh_port: Number(sshPort),
            group_id: groupId || undefined,
          },
        },
      );
      if (!temporaryPassword) return { ...result, keyDeployError: '', keyAttempted: false };
      try {
        if (!mounted.current || !keyAccess.current) throw new Error('The account or its permissions changed. An administrator must check SSH access for the created host.');
        const keyResult = await apiFetch<{success?: boolean; error?: string}>('/system/deploy', {
          method: 'POST',
          environmentId,
          body: {
            server_id: result.server.id,
            ip_address: result.server.ip_address,
            ssh_user: sshUser,
            ssh_port: Number(sshPort),
            password: temporaryPassword,
          },
        });
        if (keyResult?.success !== true) throw new Error(keyResult?.error || 'SSH key installation could not be confirmed.');
        return { ...result, keyDeployError: '', keyAttempted: true };
      } catch (error) {
        // Adoption and key distribution are independent operations. Keep the
        // host visible and report exactly what still needs attention.
        return {
          ...result,
          keyAttempted: true,
          keyDeployError: error instanceof Error
            ? error.message
            : 'The SSH key could not be installed.',
        };
      } finally {
        if (mounted.current) setTemporaryPassword('');
      }
    },
    onSuccess: result => {
      showToast(
        result.keyDeployError
          ? `${kind} adopted. SSH key: ${result.keyDeployError}`
          : result.keyAttempted
            ? `${kind} adopted and Fleet SSH key installed.`
            : `${kind} adopted as a host.`,
        result.keyDeployError ? 'warning' : 'success',
      );
      void queryClient.invalidateQueries({ queryKey: ['servers'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['opentofu', 'infrastructure', environmentId] });
      void queryClient.invalidateQueries({ queryKey: ['proxmox-vm-context', connectionId, vm.node_name, vm.vm_id] });
      if (mounted.current) {
        if (result.keyDeployError) setPartialResult({serverId: result.server.id, error: result.keyDeployError});
        else onOpenChange(false);
      }
    },
    onSettled: () => { pending.current = false; },
  });

  useBlocker({disabled: !dirty && !importMutation.isPending, enableBeforeUnload: dirty || importMutation.isPending, shouldBlockFn: () => pending.current || (dirty && !globalThis.confirm('Discard unsaved host adoption inputs and leave?'))});
  const close = () => {
    if (pending.current) return;
    if (!dirty || globalThis.confirm('Discard unsaved host adoption inputs?')) onOpenChange(false);
  };
  return (
    <Dialog open onOpenChange={next => { if (!next) close(); }}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ServerCog className="h-5 w-5" /> Adopt {kind} as host
          </DialogTitle>
          <DialogDescription>
            Fleet creates a host record for the existing Proxmox {kind}. No Proxmox resources are created. Optional SSH key installation adds Fleet’s key inside the guest.
          </DialogDescription>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">Environment: <strong>{environmentId}</strong></p>
        {contextChanged && !partialResult && <p role="alert" className="text-sm text-amber-600">The environment or guest changed. This draft belongs to {vm.name} in {environmentId}. Return to the original context before adopting.</p>}
        {importMutation.isError && <p role="alert" className="text-sm text-destructive">{importMutation.error instanceof Error ? importMutation.error.message : 'Adoption failed.'} Your inputs are preserved.</p>}
        {partialResult ? <div className="space-y-4">
          <p role="status" className="font-medium">Host created: {name}</p>
          <div role="alert" className="space-y-2 rounded-md border border-amber-500 p-3 text-sm"><p className="font-medium">SSH key installation needs attention</p><p>{partialResult.error}</p><p>The host is already linked to this guest. Check its SSH access before installing the key again. Do not repeat adoption.</p></div>
          <DialogFooter><Button type="button" variant="outline" onClick={close}>Close</Button>{!contextChanged && <Button asChild><Link to="/servers/$id" params={{id:partialResult.serverId}}>Open created host</Link></Button>}</DialogFooter>
          {contextChanged && <p className="text-sm">Return to {environmentId} to open the created host.</p>}
        </div> : <form aria-busy={importMutation.isPending} className="space-y-4" onSubmit={event => { event.preventDefault(); if (pending.current || contextChanged) return; pending.current = true; importMutation.mutate(); }}>
          <fieldset disabled={importMutation.isPending || contextChanged} className="min-w-0 space-y-4">
          <div className="grid gap-3 rounded-md border bg-muted/20 p-3 text-sm sm:grid-cols-3">
            <div><span className="text-xs text-muted-foreground">{kind}</span><div className="font-medium">{vm.name}</div></div>
            <div><span className="text-xs text-muted-foreground">Node</span><div className="font-mono">{vm.node_name}</div></div>
            <div><span className="text-xs text-muted-foreground">{kind} ID</span><div className="font-mono">{vm.vm_id}</div></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Host name" htmlFor="import-host-name">
              <Input id="import-host-name" maxLength={100} required value={name} onChange={event => setName(event.target.value)} />
            </Field>
            <Field label="IP address" htmlFor="import-ip">
              <div className="flex gap-2">
                <Input id="import-ip" required value={ipAddress} onChange={event => { setIpEdited(true); setIpAddress(event.target.value); }} placeholder="10.20.1.10" />
                <Button type="button" size="icon" variant="outline" onClick={() => { setIpEdited(false); void guestIpQuery.refetch(); }} disabled={guestIpQuery.isFetching} aria-label="Read virtual machine IP">
                  <RefreshCw className={guestIpQuery.isFetching ? 'animate-spin' : undefined} />
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {guestIpQuery.isError
                  ? 'Automatic address detection failed. Enter an address manually or retry.'
                  : vm.guest_type === 'lxc'
                    ? 'Read from the LXC interface list or enter manually.'
                    : 'Read from the QEMU Guest Agent or enter manually.'}
              </p>
            </Field>
            <Field label="SSH user" htmlFor="import-ssh-user">
              <Input id="import-ssh-user" maxLength={100} required value={sshUser} onChange={event => setSshUser(event.target.value)} placeholder="ubuntu" />
            </Field>
            <Field label="SSH port" htmlFor="import-ssh-port">
              <Input id="import-ssh-port" type="number" min={1} max={65535} step={1} required value={sshPort} onChange={event => setSshPort(event.target.value)} inputMode="numeric" />
            </Field>
          </div>
          <Field label="Folder" htmlFor="import-folder">
            <select id="import-folder" value={groupId} onChange={event => setGroupId(event.target.value)} className="h-9 w-full rounded-sm border bg-background px-2.5 text-[13px]">
              <option value="">No folder</option>
              {groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
            </select>
            {groupsQuery.isError && <p className="text-xs text-destructive">Folders could not be loaded. You can adopt the host without a folder.</p>}
          </Field>
          <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
            <div className="flex items-center gap-2 text-sm font-medium"><KeyRound className="h-4 w-4" /> Fleet SSH key</div>
            <p className="mt-1 text-xs text-muted-foreground">Fleet installs its configured SSH key using a temporary password. The password is used only for this action and is not stored.</p>
            {canInstallKey ? <><Label className="mt-3 block" htmlFor="import-vm-password">Temporary password <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Input id="import-vm-password" className="mt-1.5" value={temporaryPassword} onChange={event => setTemporaryPassword(event.target.value)} type="password" autoComplete="new-password" /></> : <p className="mt-3 text-sm">{profile.isPending ? 'Checking permission for SSH key installation…' : profile.isError ? 'SSH key permissions could not be verified. You can adopt the host without installing a key.' : 'SSH key installation requires an administrator. You can adopt the host using existing SSH access.'}</p>}
            {profile.isError && <Button type="button" variant="outline" onClick={() => void profile.refetch()}>Retry permission check</Button>}
          </div>
          </fieldset>
          {importMutation.isPending && <p role="status" className="text-sm text-muted-foreground">Adopting the host{temporaryPassword ? ' and installing its SSH key' : ''}. Please wait before closing.</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close} disabled={importMutation.isPending}>Cancel</Button>
            <Button type="submit" disabled={importMutation.isPending || contextChanged}>
              {importMutation.isPending ? <RefreshCw className="animate-spin" /> : <ServerCog />} Adopt as host
            </Button>
          </DialogFooter>
        </form>}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label htmlFor={htmlFor}>{label}</Label>{children}</div>;
}
