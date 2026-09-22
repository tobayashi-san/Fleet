import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useUi } from '@/lib/store';
import { Timestamp } from '@/components/ui/timestamp';
import { useMutation } from '@tanstack/react-query';

export function OsUpdatePreview({ serverId }: { serverId: string }) {
  const environmentId = useUi(state => state.environmentId);
  const context = JSON.stringify([serverId, environmentId]);
  // A new context gets a fresh mutation instance. Returning to an earlier
  // host must not resurrect its old plan or let a late response overwrite it.
  return <OsUpdatePreviewSession key={context} serverId={serverId} environmentId={environmentId} context={context} />;
}

function OsUpdatePreviewSession({serverId, environmentId, context}: {serverId:string; environmentId:string; context:string}) {
  const preview = useMutation({mutationFn: async (input: {serverId:string; context:string}) => ({
    context: input.context, result: await api.previewServerUpdates(input.serverId, environmentId),
  })});
  const current = preview.variables?.context === context;
  const result = current && preview.isSuccess && preview.data?.context === context ? preview.data.result : null;
  return <details className="group space-y-3 border-t px-4 py-3" open={Boolean(preview.variables)}>
    <summary className="cursor-pointer text-sm font-medium">Preview package changes</summary>
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <Button type="button" variant="outline" size="sm" disabled={preview.isPending} onClick={()=>preview.mutate({serverId,context})}>{preview.isPending ? 'Simulating…' : 'Simulate update'}</Button>
      <p className="text-xs text-muted-foreground">Dry run on the host. Nothing is installed.</p>
    </div>
    {preview.variables && !current && <p role="status" className="text-xs text-warning">Host or environment changed. Generate a new preview.</p>}
    {current && preview.isError && <p role="alert" className="text-sm text-destructive">{preview.error.message}</p>}
    {result && <div className="space-y-2 text-xs">
      <p>Checked <Timestamp value={result.checked_at} /></p>
      {result.plan ? <>
        <p className="text-muted-foreground">Point-in-time estimate of a full upgrade.</p>
        <p role="status">{result.plan.changes.filter(c=>c.action==='upgrade').length} upgrades · {result.plan.changes.filter(c=>c.action==='install').length} new installations · {result.plan.changes.filter(c=>c.action==='remove').length} removals</p>
        {result.plan.changes.length > 0 && <div className="max-h-64 overflow-auto"><table className="w-full text-left">
          <thead><tr className="border-b"><th className="p-2">Change</th><th className="p-2">Package</th><th className="p-2">Installed</th><th className="p-2">After update</th></tr></thead>
          <tbody>{result.plan.changes.map((change,index)=><tr key={`${change.package}-${index}`} className="border-b">
            <td className={`p-2 ${change.action==='remove'?'font-medium text-destructive':''}`}>{change.action==='remove'?'Remove':change.action==='install'?'Install':'Upgrade'}</td>
            <td className="p-2 font-mono break-all">{change.package}</td><td className="p-2 font-mono break-all">{change.current_version || '—'}</td><td className="p-2 font-mono break-all">{change.candidate_version || '—'}</td>
          </tr>)}</tbody>
        </table></div>}
        {result.plan.changes.length > 0 && <div className="space-y-2 rounded-md border p-3">
          <h3 className="font-medium text-foreground">Potential service impact</h3>
          <p className="text-muted-foreground" title="Based on service definitions owned by the packages. Shared libraries and package scripts may affect other services.">Services defined by these packages.</p>
          {result.plan.service_ownership?.length ? <ul className="space-y-1">
            {result.plan.service_ownership.map(report=><li key={report.package} className="break-words"><span className="font-mono text-foreground">{report.package}</span>: {report.units === null ? 'Installed file list unavailable; impact unknown.' : report.units.length ? report.units.join(', ') : 'No directly owned service definitions found.'}</li>)}
          </ul> : <p>Service ownership was not reported. Impact is unknown.</p>}
        </div>}
      </> : <p role="status" className="text-muted-foreground">Detailed package-change simulation is currently available for Debian/Ubuntu hosts using apt. This host did not return a supported plan.</p>}
    </div>}
  </details>;
}
