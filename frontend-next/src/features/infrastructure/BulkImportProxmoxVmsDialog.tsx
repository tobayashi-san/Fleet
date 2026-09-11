import { useEffect, useRef, useState } from 'react';
import { Link, useBlocker } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adoptBatch, adoptionKey, type AdoptionGuest, type AdoptionResult } from './adoption-batch';

type Props = {connectionId: string; environmentId: string; vms: AdoptionGuest[]; open: boolean; onOpenChange: (open: boolean) => void};
export function BulkImportProxmoxVmsDialog(props: Props) { return props.open ? <BatchForm {...props} /> : null; }
function BatchForm(props: Props) {
  const [target] = useState(() => ({connectionId:props.connectionId, environmentId:props.environmentId, guests:[...new Map(props.vms.map(vm => [adoptionKey(vm), {...vm}])).values()]}));
  const [rows,setRows] = useState<AdoptionResult[]>(() => target.guests.map(guest => ({guest,status:'pending'})));
  const [sshUser,setSshUser] = useState('root');
  const [sshPort,setSshPort] = useState('22');
  const [groupId,setGroupId] = useState('');
  const [busy,setBusy] = useState(false);
  const [started,setStarted] = useState(false);
  const pending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current=true; return () => { mounted.current=false; }; }, []);
  const contextChanged = props.environmentId !== target.environmentId || props.connectionId !== target.connectionId;
  const contextRef = useRef(contextChanged); contextRef.current=contextChanged;
  const client=useQueryClient();
  const groups=useQuery({queryKey:['server-groups',target.environmentId],queryFn:()=>apiFetch<Array<{id:string;name:string;environment_id?:string}>>(`/servers/groups?environment_id=${encodeURIComponent(target.environmentId)}`,{environmentId:target.environmentId}),enabled:!contextChanged});
  const folders=(Array.isArray(groups.data)?groups.data:[]).filter(g=>(g.environment_id||target.environmentId)===target.environmentId);
  const missingFolder=Boolean(groupId && (groups.isError || !folders.some(g=>g.id===groupId)));
  const retryable=rows.filter(row=>row.status==='pending'||row.status==='failed').length;
  const succeeded=rows.filter(row=>row.status==='succeeded').length;
  const unknown=rows.filter(row=>row.status==='unknown').length;
  useBlocker({disabled:!busy,enableBeforeUnload:busy,shouldBlockFn:()=>pending.current});
  const close=()=>{if(!pending.current)props.onOpenChange(false);};
  const submit=async()=>{
    if(pending.current||contextChanged||missingFolder||!retryable)return;
    pending.current=true;setBusy(true);setStarted(true);
    try {
      await adoptBatch(rows, async guest=>{
        return apiFetch<{server:{id:string}}>(`/opentofu/proxmox-connections/${encodeURIComponent(target.connectionId)}/import-vm`,{method:'POST',environmentId:target.environmentId,body:{name:guest.name,node_name:guest.node_name,vm_id:guest.vm_id,guest_type:guest.guest_type||'qemu',ssh_user:sshUser,ssh_port:Number(sshPort),group_id:groupId||undefined}});
      },row=>{if(mounted.current)setRows(current=>current.map(existing=>adoptionKey(existing.guest)===adoptionKey(row.guest)?row:existing));},()=>!contextRef.current && mounted.current);
    } finally {
      pending.current=false;if(mounted.current)setBusy(false);
      void client.invalidateQueries({queryKey:['servers']});
      void client.invalidateQueries({queryKey:['opentofu','infrastructure',target.environmentId]});
      void client.invalidateQueries({queryKey:['dashboard']});
    }
  };
  return <Dialog open onOpenChange={next=>{if(!next)close();}}><DialogContent className="max-h-[calc(100dvh-2rem)] max-w-2xl overflow-y-auto">
    <DialogHeader><DialogTitle>Adopt {target.guests.length} guests as hosts</DialogTitle><DialogDescription>Shipyard creates host records for the selected VMs and containers and reads their IPv4 addresses. Proxmox resources remain unchanged. No SSH keys are installed by this batch.</DialogDescription></DialogHeader>
    <p className="text-sm">Environment: <strong>{target.environmentId}</strong> · Selection captured when opened</p>
    {contextChanged&&<p role="alert" className="text-sm text-amber-600">The environment or platform changed. Return to the original context before continuing.</p>}
    <div role="status" className="text-sm">{succeeded} adopted · {rows.filter(r=>r.status==='failed').length} rejected · {unknown} uncertain{busy?' · Processing…':''}</div>
    <ul className="max-h-64 space-y-2 overflow-auto rounded-md border p-3">{rows.map(row=><li key={adoptionKey(row.guest)} className="border-b pb-2 last:border-0"><div className="flex flex-wrap justify-between gap-2"><strong className="text-sm">{row.guest.name}</strong><span className="text-xs">{{pending:'Pending',running:'In progress',succeeded:'Adopted',failed:'Rejected',unknown:'Outcome uncertain'}[row.status]}</span></div><p className="text-xs text-muted-foreground">{row.guest.guest_type==='lxc'?'CT':'VM'} {row.guest.vm_id} · {row.guest.node_name}</p>{row.message&&<p className="mt-1 text-sm">{row.message}</p>}{row.serverId&&<Link className="text-sm underline" to="/servers/$id" params={{id:row.serverId}}>Open host</Link>}</li>)}</ul>
    {unknown>0&&<p role="alert" className="text-sm text-amber-600">An uncertain request may already have created a host. Check the inventory before starting another adoption. These targets will not be submitted again by this dialog.</p>}
    <form onSubmit={event=>{event.preventDefault();void submit();}} className="space-y-4" aria-busy={busy}>
      <fieldset disabled={busy||contextChanged||!retryable} className="grid gap-3 sm:grid-cols-2">
        <div><Label htmlFor="bulk-adopt-user">SSH user</Label><Input id="bulk-adopt-user" required value={sshUser} onChange={e=>setSshUser(e.target.value)}/></div>
        <div><Label htmlFor="bulk-adopt-port">SSH port</Label><Input id="bulk-adopt-port" required type="number" min={1} max={65535} step={1} value={sshPort} onChange={e=>setSshPort(e.target.value)}/></div>
        <div className="sm:col-span-2"><Label htmlFor="bulk-adopt-folder">Folder</Label><select id="bulk-adopt-folder" className="h-9 w-full rounded-md border bg-background px-2" value={groupId} onChange={e=>setGroupId(e.target.value)}><option value="">No folder</option>{missingFolder&&<option value={groupId}>Unavailable folder</option>}{folders.map(folder=><option key={folder.id} value={folder.id}>{folder.name}</option>)}</select>{groups.isError&&<p className="text-sm text-destructive">Folders could not be loaded. Retry loading or select No folder.</p>}{groups.isError&&<Button type="button" variant="outline" onClick={()=>void groups.refetch()}>Reload folders</Button>}</div>
      </fieldset>
      <p className="text-xs text-muted-foreground">Guests without a usable reported IPv4 address are rejected. Adopt them individually to enter an address manually. Changes to SSH settings apply only to pending or rejected targets.</p>
      <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={close}>{started?'Close':'Cancel'}</Button>{retryable>0&&<Button type="submit" disabled={busy||contextChanged||missingFolder||!sshUser.trim()}>{busy?'Adopting…':started?`Continue ${retryable} remaining`:`Adopt ${retryable} guests`}</Button>}</DialogFooter>
    </form>
  </DialogContent></Dialog>;
}
