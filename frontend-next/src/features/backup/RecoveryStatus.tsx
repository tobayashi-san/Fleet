import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useUnsavedChanges } from '@/lib/use-unsaved-changes';
import { formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QueryErrorState } from '@/components/ui/query-error-state';
interface RecordInfo {occurredAt:string;scope:string;result:string;version?:string;notes?:string;recordedBy?:string}
interface Status {externalLastSuccess:RecordInfo|null;databaseExport:RecordInfo|null;externalBackup:RecordInfo|null;recoveryTest:RecordInfo|null}
const empty = {occurredAt:'',scope:'',version:'',result:'passed',notes:''};
export function RecoveryStatus() {
  const qc=useQueryClient();
  const query=useQuery({queryKey:['recovery-status'],queryFn:()=>apiFetch<Status>('/system/database-backup/status')});
  const [kind,setKind]=useState('external');
  const [draft,setDraft]=useState(empty);
  const dirty=JSON.stringify(draft)!==JSON.stringify(empty);
  useUnsavedChanges(dirty);
  const save=useMutation({mutationFn:()=>apiFetch(`/system/database-backup/records/${kind}`,{method:'PUT',body:{...draft,occurredAt:new Date(draft.occurredAt).toISOString()}}),onSuccess:()=>{setDraft(empty);void qc.invalidateQueries({queryKey:['recovery-status']});}});
  return <section className="space-y-3 rounded-md border p-4"><h2 className="font-semibold">Backup and recovery status · this installation</h2>
    {query.isPending ? <p>Loading recovery status…</p> : query.isError ? <QueryErrorState compact title="Recovery status unavailable" error={query.error} onRetry={()=>void query.refetch()}/> : <div className="grid gap-3 md:grid-cols-2">{([['databaseExport','Last verified database archive'],['externalLastSuccess','Last successful external backup (recorded)'],['externalBackup','Last recorded external backup attempt'],['recoveryTest','Last recorded recovery test']] as const).map(([key,label])=>{const record=query.data[key];return <div key={key} className="rounded border p-3 text-sm"><h3 className="font-medium">{label}</h3>{record ? <><p>{formatDateTime(record.occurredAt)} · {record.result === 'passed' ? 'Passed' : 'Failed'}</p><p>{record.scope}</p>{record.version && <p>Application version: {record.version}</p>}{record.notes && <p className="whitespace-pre-wrap break-words">{record.notes}</p>}<p className="text-xs text-muted-foreground">{key === 'databaseExport' ? 'Prepared and verified by Shipyard; receipt and storage of the download are not verified.' : `Manually recorded by ${record.recordedBy}. Not independently verified.`}</p></> : <p className="text-muted-foreground">Unknown · no record yet</p>}</div>})}</div>}
    <details><summary className="cursor-pointer text-sm font-medium">Record an external backup or recovery test</summary><form className="mt-3 space-y-3" onSubmit={e=>{e.preventDefault();if(dirty&&!save.isPending)save.mutate();}}><fieldset disabled={save.isPending} className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm">Record type<select aria-label="Recovery record type" value={kind} onChange={e=>setKind(e.target.value)} className="block h-9 w-full rounded border bg-background px-2"><option value="external">External backup</option><option value="recovery">Recovery test</option></select></label>
      <label className="text-sm">Performed at (local time)<Input required type="datetime-local" value={draft.occurredAt} onChange={e=>setDraft({...draft,occurredAt:e.target.value})}/></label>
      <label className="text-sm">Scope<Input required maxLength={500} value={draft.scope} onChange={e=>setDraft({...draft,scope:e.target.value})} placeholder="Database, files and application key"/></label>
      <label className="text-sm">Application version<Input required maxLength={100} value={draft.version} onChange={e=>setDraft({...draft,version:e.target.value})}/></label>
      <label className="text-sm">Result<select aria-label="Recovery result" value={draft.result} onChange={e=>setDraft({...draft,result:e.target.value})} className="block h-9 rounded border bg-background px-2"><option value="passed">Passed</option><option value="failed">Failed</option></select></label>
      <label className="text-sm">Notes (no secrets)<Input maxLength={2000} value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})}/></label>
      <div className="flex flex-wrap gap-2"><Button type="submit" disabled={!dirty}>Save record</Button><Button type="button" variant="outline" disabled={!dirty} onClick={()=>setDraft(empty)}>Discard changes</Button></div>{dirty && <p role="status" className="text-sm">Unsaved changes</p>}
    </fieldset>{save.isError && <p role="alert" className="text-destructive">{save.error.message}</p>}</form></details>
  </section>;
}
