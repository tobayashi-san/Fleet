import { jsonChanges } from '@/lib/json-changes';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiFetch } from '@/lib/api';
import { useUnsavedChanges } from '@/lib/use-unsaved-changes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { formatDateTime } from '@/lib/utils';

interface Manifest {version:number;content:unknown}
interface History {version:number;changelog?:string;created_at?:string}
const format = (value:unknown) => JSON.stringify(value,null,2);
export function AgentManifestTab() {
  const qc = useQueryClient();
  const current = useQuery({queryKey:['agent-manifest'],queryFn:()=>api.getAgentManifest()});
  const history = useQuery({queryKey:['agent-manifest-history'],queryFn:()=>api.getAgentManifestHistory(30) as unknown as Promise<History[]>});
  const [draft,setDraft] = useState<{json:string;base:Manifest;changelog:string}|null>(null);
  const json = draft?.json ?? (current.data ? format(current.data.content) : '');
  const dirty = !!draft && (draft.json !== format(draft.base.content) || !!draft.changelog);
  useUnsavedChanges(dirty);
  let parsed:unknown;
  let invalid = '';
  try {parsed=JSON.parse(json);if(!parsed || typeof parsed !== 'object' || Array.isArray(parsed))invalid='Manifest must be a JSON object';
    else {
      const value=parsed as Record<string,unknown>;
      if(!Number.isInteger(value.version) || Number(value.version)<1)invalid='Version must be a positive integer';
      else if(!Number.isInteger(value.interval) || Number(value.interval)<5 || Number(value.interval)>3600)invalid='Interval must be between 5 and 3600 seconds';
      else if(!Array.isArray(value.collectors) || !value.collectors.length)invalid='Add at least one collector';
      else if(value.collectors.some(c=>!c || typeof c.id !== 'string' || !c.id || typeof c.cmd !== 'string' || !c.cmd || c.cmd.length>1000))invalid='Every collector needs an ID and a command of up to 1000 characters';
    }} catch {invalid='Enter valid JSON';}
  const conflict = !!draft && current.data?.version !== draft.base.version;
  const change = (patch:Partial<NonNullable<typeof draft>>) => {if(current.data)setDraft({...draft ?? {json,base:current.data,changelog:''},...patch});};
  const save = useMutation({mutationFn:()=>api.saveAgentManifest(parsed,draft?.changelog || '',draft?.base.version ?? current.data?.version),onSuccess:async()=>{await qc.invalidateQueries({queryKey:['agent-manifest']});setDraft(null);await qc.invalidateQueries({queryKey:['agent-manifest-history']});}});
  const restore = useMutation({mutationFn:(version:number)=>apiFetch<Manifest>(`/v1/agent-manifest/versions/${version}`),onSuccess:(value)=>{if(current.data)setDraft({json:format({...value.content as object,version:current.data.version}),base:current.data,changelog:`Restore content from v${value.version}`});}});
  if(current.isPending)return <p role="status">Loading manifest…</p>;
  if(current.isError && !current.data)return <QueryErrorState title="Manifest unavailable" error={current.error} onRetry={()=>void current.refetch()}/>;
  return <div className="space-y-4">
    <section className="space-y-3 rounded-md border p-4"><h2 className="font-semibold">Agent manifest · this installation</h2><p className="text-sm text-muted-foreground">Advanced collector configuration. Saving publishes a new version for agents; Shipyard assigns its version number automatically. History is retained.</p>
      <p>Server version: {current.data?.version}{dirty && <span role="status"> · Unsaved changes</span>}</p>
      {current.isError && <p role="alert">Could not refresh the server version. Retry before saving.</p>}
      {conflict && <p role="alert" className="text-warning">The server has a newer manifest. Your draft is preserved. Compare below, then discard or explicitly keep this draft against the latest version.</p>}
      <fieldset disabled={save.isPending || restore.isPending} className="space-y-3">
        <label className="block text-sm">Manifest JSON<Textarea aria-label="Manifest JSON" value={json} onChange={e=>change({json:e.target.value})} rows={16} className="font-mono text-xs" spellCheck={false}/></label>
        {invalid && <p role="alert" className="text-destructive">{invalid}</p>}
        <label className="block text-sm">Changelog<Input aria-label="Manifest changelog" value={draft?.changelog || ''} maxLength={500} onChange={e=>change({changelog:e.target.value})}/></label>
        <div className="flex flex-wrap gap-2"><Button disabled={!dirty || !!invalid || conflict || current.isFetching || current.isError} onClick={()=>save.mutate()}>Save new manifest version</Button><Button variant="outline" disabled={!draft} onClick={()=>setDraft(null)}>Discard changes</Button><Button variant="outline" disabled={current.isFetching} onClick={()=>{void current.refetch();void history.refetch();}}>Refresh server version</Button>{conflict && <Button variant="outline" onClick={()=>current.data && change({base:current.data})}>Keep draft against latest version</Button>}</div>
      </fieldset>
      {(save.isError || restore.isError) && <p role="alert" className="text-destructive">{save.error?.message || restore.error?.message}</p>}
      {draft && <details open={conflict}><summary className="cursor-pointer text-sm font-medium">Compare server and draft</summary><ul className="mt-2 space-y-2 text-xs">{!invalid && jsonChanges(current.data?.content,parsed).map(change=><li key={change.path}><code>{change.path}</code><pre className="overflow-auto whitespace-pre-wrap break-words text-destructive">− {format(change.before) ?? '(absent)'}</pre><pre className="overflow-auto whitespace-pre-wrap break-words text-success">+ {format(change.after) ?? '(absent)'}</pre></li>)}</ul><div className="mt-2 grid gap-3 lg:grid-cols-2"><div><h3>Current server</h3><pre className="max-h-96 overflow-auto rounded border p-2 text-xs">{format(current.data?.content)}</pre></div><div><h3>Draft content · version assigned on save</h3><pre className="max-h-96 overflow-auto rounded border p-2 text-xs">{json}</pre></div></div></details>}
    </section>
    <section className="space-y-3 rounded-md border p-4"><h2 className="font-semibold">Version history</h2><p className="text-xs text-muted-foreground">Restoring loads an earlier version into the editor. Review and save it as a new version.</p>{history.isPending ? <p>Loading history…</p> : history.isError ? <QueryErrorState compact title="History unavailable" error={history.error} onRetry={()=>void history.refetch()}/> : history.data?.length ? history.data.map(entry=><div className="flex flex-wrap items-center justify-between gap-2 border-b py-2 text-sm" key={entry.version}><div>v{entry.version} · {entry.changelog || 'No changelog'}<p className="text-xs text-muted-foreground">{formatDateTime(entry.created_at)}</p></div><Button size="sm" variant="outline" disabled={dirty || save.isPending || restore.isPending || current.isFetching || current.isError} onClick={()=>restore.mutate(entry.version)}>Load v{entry.version}</Button></div>) : <p>No history yet.</p>}</section>
  </div>;
}
