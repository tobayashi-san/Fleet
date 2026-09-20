import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
	ZonedDateTimePicker
} from "@/components/ui/date-input";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { MaintenanceWindow } from '@/features/operations/model';
import { ApiError, apiFetch } from "@/lib/api";
import { overlappingWindows } from '@/lib/maintenance-overlap';
import {
	useProfile
} from "@/lib/queries";
import { formatDateTime } from "@/lib/utils";
import {
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { useBlocker } from "@tanstack/react-router";
import {
	CalendarClock,
	RefreshCw
} from "lucide-react";
import { useRef, useState } from "react";

export function MaintenanceWindowDialog({
  window,
  environmentId,
  onClose,
}: {
  window: MaintenanceWindow | "new" | null;
  environmentId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const {data:maintenanceProfile}=useProfile();
  const canUseEntireEnvironment=maintenanceProfile?.role==='admin'||maintenanceProfile?.permissions?.full===true||maintenanceProfile?.permissions?.servers==='all';
  const [initial] = useState(window && window !== "new" ? window : null);
  const [openedEnvironment] = useState(environmentId);
  const [reviewedRevision,setReviewedRevision]=useState(initial?.revision);
  const [latestWindow,setLatestWindow]=useState<MaintenanceWindow|null>(null);
  const [reviewError,setReviewError]=useState('');
  const contextChanged = environmentId !== openedEnvironment;
  const [dirty, setDirty] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const submitting = useRef(false);
  const [name, setName] = useState(initial?.name || "");
  const [timezoneSearch, setTimezoneSearch] = useState("");
  const [timezone, setTimezone] = useState(initial?.timezone || "Europe/Zurich");
  const [startsAt, setStartsAt] = useState(
    initial?.starts_at || new Date().toISOString(),
  );
  const [endsAt, setEndsAt] = useState(
    initial?.ends_at || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  );
  const [description, setDescription] = useState(initial?.description || "");
  const [resourceScope, setResourceScope] = useState<'selected' | 'environment'>(!initial || !initial.resource_ids?.length ? 'environment' : 'selected');
  const [resourceIds, setResourceIds] = useState<string[]>(initial?.resource_ids || []);
  const [changeReference, setChangeReference] = useState(initial?.change_reference || "");
  const [repeat, setRepeat] = useState('none');
  const [repeatCount, setRepeatCount] = useState(4);
  const [hostSearch, setHostSearch] = useState("");
  const hostsQuery = useQuery({ queryKey: ["maintenance-host-options", openedEnvironment], queryFn: () => apiFetch<Array<{ id: string; name: string; ip_address?: string }>>(`/servers?environment_id=${encodeURIComponent(openedEnvironment)}`, {environmentId: openedEnvironment}), enabled: Boolean(window) });
  const teamsQuery = useQuery({ queryKey: ["server-groups", openedEnvironment], queryFn: () => apiFetch<Array<{ id: string; name: string }>>(`/servers/groups?environment_id=${encodeURIComponent(openedEnvironment)}`, {environmentId: openedEnvironment}), enabled: Boolean(window) });
  const windowsQuery = useQuery({ queryKey: ["maintenance-windows", openedEnvironment], queryFn: () => apiFetch<MaintenanceWindow[]>(`/maintenance-windows?environment_id=${encodeURIComponent(openedEnvironment)}`, {environmentId: openedEnvironment}), enabled: Boolean(window) });
  const scopedResourceIds = resourceScope === 'environment' ? [] : resourceIds;
  const hasValidScope = resourceScope === 'environment' ? canUseEntireEnvironment : resourceIds.length > 0;
  const availableHostIds = new Set((Array.isArray(hostsQuery.data) ? hostsQuery.data : []).map(host => host.id));
  const unavailableHostIds = hostsQuery.isSuccess ? scopedResourceIds.filter(id => !availableHostIds.has(id)) : [];
  const overlaps = hasValidScope ? overlappingWindows({ id: initial?.id, starts_at: startsAt, ends_at: endsAt, resource_ids: scopedResourceIds }, Array.isArray(windowsQuery.data) ? windowsQuery.data : []) : [];
  const [affectedResources, setAffectedResources] = useState(initial?.affected_resources || "");
  const [owner, setOwner] = useState(initial?.owner || "");
  const hasValidRange = Boolean(
    startsAt &&
      endsAt &&
      new Date(endsAt).getTime() > new Date(startsAt).getTime(),
  );
  const recurrence = !initial && repeat !== 'none' ? {frequency: repeat, count: repeatCount} : undefined;
  const previewBody = {environment_id: openedEnvironment, name, starts_at: startsAt, ends_at: endsAt, timezone, resource_ids: scopedResourceIds, resource_scope: resourceScope, recurrence};
  const repeatPreview = useQuery({
    queryKey: ['maintenance-repeat-preview', previewBody],
    queryFn: () => apiFetch<{occurrences: Array<{starts_at:string;ends_at:string;planned_conflicts?:number[];conflicts:Array<{id:string;name:string}>}>;conflicts_checked:boolean}>('/maintenance-windows/preview', {method:'POST',environmentId:openedEnvironment,body:previewBody}),
    enabled: Boolean(window && recurrence && name.trim() && hasValidRange && hasValidScope && !contextChanged),
    retry: false,
  });
  const repeatReady = !recurrence || (repeatPreview.isSuccess && !repeatPreview.isFetching);
  const saveMutation = useMutation({
    mutationFn: () => {
      if (contextChanged) throw new Error('Return to the original environment before saving this draft.');
      return apiFetch(
        `/maintenance-windows${initial ? `/${encodeURIComponent(initial.id)}` : ""}`,
        {
          method: initial ? "PUT" : "POST",
          environmentId: openedEnvironment,
          body: {
            environment_id: openedEnvironment,
            name,
            starts_at: startsAt,
            ends_at: endsAt,
            description,
            revision: reviewedRevision,
            affected_resources: affectedResources,
            resource_ids: scopedResourceIds,
            resource_scope: resourceScope,
            change_reference: changeReference,
            timezone,
            owner,
            ...(recurrence ? {recurrence} : {}),
          },
        },
      );
    },
    onSettled: () => { submitting.current = false; },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["maintenance-windows", openedEnvironment],
      });
      onClose();
    },
  });
  const versionConflict=saveMutation.error instanceof ApiError && saveMutation.error.status===409;
  const reviewLatest=async()=>{
    setLatestWindow(null);setReviewError('');
    const response=await windowsQuery.refetch();
    if(response.error){setReviewError('The current version could not be loaded. Your draft is unchanged.');return;}
    const current=response.data?.find(row=>row.id===initial?.id);
    if(!current?.revision){setReviewError('This window is no longer available or has no version. Your draft is unchanged.');return;}
    setLatestWindow(current);
  };
  const scopeLabel=(ids:string[]|undefined)=>ids?.length ? ids.map(id=>hostsQuery.data?.find(host=>host.id===id)?.name || id).join(', ') : 'Entire environment';
  const comparison=latestWindow ? [
    ['Name',latestWindow.name,name],['Owner',latestWindow.owner,owner],['Change reference',latestWindow.change_reference,changeReference],
    ['Start',formatDateTime(latestWindow.starts_at),formatDateTime(startsAt)],['End',formatDateTime(latestWindow.ends_at),formatDateTime(endsAt)],
    ['Timezone',latestWindow.timezone,timezone],['Scope',scopeLabel(latestWindow.resource_ids),scopeLabel(scopedResourceIds)],
    ['Impact notes',latestWindow.affected_resources,affectedResources],['Description',latestWindow.description,description],
  ] : [];
  useBlocker({
    disabled: !window || (!dirty && !saveMutation.isPending),
    enableBeforeUnload: Boolean(window && (dirty || saveMutation.isPending)),
    shouldBlockFn: () => submitting.current || (dirty && !globalThis.confirm('Discard unsaved maintenance changes and leave this page?')),
  });
  const markEdited = (event: React.FormEvent<HTMLFormElement>) => {
    const target = event.target as HTMLInputElement;
    // Search filters are presentation state, not an unsaved maintenance edit.
    if (target.id?.startsWith('maintenance-') || target.type === 'checkbox') setDirty(true);
  };
  const requestClose = () => {
    if (submitting.current) return;
    if (dirty) setDiscardOpen(true);
    else onClose();
  };
  if (!window) return null;
  return (<>
    <Dialog open onOpenChange={(open) => !open && requestClose()}>
      <DialogContent className="flex max-w-2xl max-h-[calc(100dvh-2rem)] flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {initial ? "Edit maintenance window" : "Schedule maintenance window"}
          </DialogTitle>
          <DialogDescription>
            During this period, teams can clearly identify scheduled work and its impact.
            {initial?.series_id && " You are editing this occurrence only; other dates in the series stay unchanged."}
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex min-h-0 min-w-0 flex-col overflow-hidden"
          onInput={markEdited}
          onChange={markEdited}
          onSubmit={(event) => {
            event.preventDefault();
            if (versionConflict || !hasValidRange || !hasValidScope || !repeatReady || unavailableHostIds.length > 0 || contextChanged || submitting.current) return;
            submitting.current = true;
            saveMutation.mutate();
          }}
        >
          <div className="min-h-0 space-y-4 overflow-y-auto overscroll-contain p-1" data-dialog-body>
          {contextChanged && <p role="alert" className="text-sm text-destructive">This draft belongs to {openedEnvironment}. Return to that environment to save, or discard the draft.</p>}
          <fieldset disabled={saveMutation.isPending || contextChanged} className="min-w-0 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="maintenance-name">Name</Label>
            <Input
              id="maintenance-name"
              maxLength={120}
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Proxmox maintenance"
            />
          </div>
          {!initial && <div className="space-y-3 rounded-md border p-3">
            <Label htmlFor="maintenance-repeat">Repeat</Label>
            <select id="maintenance-repeat" value={repeat} onChange={event => setRepeat(event.target.value)} className="h-9 w-full rounded-sm border border-input bg-background px-3 text-sm">
              <option value="none">Does not repeat</option><option value="daily">Daily</option><option value="weekly">Weekly</option>
            </select>
            {recurrence && <>
              <Label htmlFor="maintenance-repeat-count">Number of occurrences, including the first</Label>
              <Input id="maintenance-repeat-count" type="number" min={2} max={52} required value={repeatCount} onChange={event => setRepeatCount(Number(event.target.value))} />
              <p className="text-xs text-muted-foreground">Creates a finite set of individual windows. Start time stays fixed in {timezone}; duration stays fixed. Each window can be edited or deleted separately.</p>
              {repeatPreview.isFetching && <p role="status" className="text-sm">Calculating occurrences…</p>}
              {repeatPreview.isError && <QueryErrorState compact title="Recurrence preview unavailable" error={repeatPreview.error} onRetry={() => void repeatPreview.refetch()} />}
              {repeatPreview.data && <div className="max-h-48 space-y-2 overflow-y-auto text-sm" aria-label="Planned occurrences">
                {!repeatPreview.data.conflicts_checked && <p>Existing-window conflicts could not be checked with your permissions.</p>}
                {repeatPreview.data.occurrences.map((item,index) => <div key={item.starts_at} className="rounded border p-2">
                  <p>{index+1}. {formatDateTime(item.starts_at,{timeZone:timezone})} – {formatDateTime(item.ends_at,{timeZone:timezone})}</p>
                  {Boolean(item.planned_conflicts?.length) && <p className="text-amber-500">Overlaps planned occurrence: {item.planned_conflicts?.join(', ')}</p>}
                  {item.conflicts.length>0 && <p className="text-amber-500">Overlaps: {item.conflicts.map(conflict=>conflict.name).join(', ')}</p>}
                </div>)}
                <p className="text-xs text-muted-foreground">Overlaps are allowed when intentional. Coordinate the affected work before saving.</p>
              </div>}
            </>}
          </div>}
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="maintenance-start">Start</Label>
              <ZonedDateTimePicker
                id="maintenance-start"
                required
                value={startsAt}
                onChange={setStartsAt}
                timeZone={timezone}
              />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="maintenance-end">End</Label>
              <ZonedDateTimePicker
                id="maintenance-end"
                required
                value={endsAt}
                onChange={setEndsAt}
                timeZone={timezone}
              />
            </div>
          </div>
          <p className="text-xs tabular-nums text-muted-foreground" aria-live="polite">
            Choose a date and time or enter it with the keyboard · {timezone}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="maintenance-resources">Scope / impact notes</Label>
              <Input id="maintenance-resources" maxLength={1000} value={affectedResources} onChange={(event) => setAffectedResources(event.target.value)} placeholder="e.g. Cluster A, hosts tagged production" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="maintenance-owner">Owner / team</Label>
              <Input id="maintenance-owner" maxLength={120} value={owner} onChange={(event) => setOwner(event.target.value)} list="maintenance-owners" placeholder="Choose a team or enter a person" />
              <p className="text-xs text-muted-foreground">Suggestions include teams from this environment and owners used on other windows.</p>
              {teamsQuery.isError && <p role="status" className="text-xs text-amber-600">Team suggestions could not be loaded. You can still enter an owner.</p>}
            </div>
          </div>
          <fieldset className="space-y-2 rounded-md border p-3">
            <legend className="px-1 text-sm font-medium">Affected hosts</legend>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm"><input id="maintenance-scope-selected" type="radio" name="maintenance-scope" checked={resourceScope === 'selected'} onChange={() => setResourceScope('selected')} />Selected hosts</label>
              <label className="flex items-center gap-2 text-sm"><input id="maintenance-scope-environment" disabled={!canUseEntireEnvironment} type="radio" name="maintenance-scope" checked={resourceScope === 'environment'} onChange={() => setResourceScope('environment')} />Entire environment</label>
            </div>
            {!canUseEntireEnvironment && <p className="text-xs text-muted-foreground">Entire-environment maintenance requires verified access to all hosts. Select hosts within your access scope.</p>}
            {resourceScope === 'environment' && <p className="text-xs text-muted-foreground">This window covers the entire environment, including hosts added later.</p>}
            <fieldset disabled={resourceScope === 'environment'} className="space-y-2">
            <Input aria-label="Find affected hosts" value={hostSearch} onChange={event => setHostSearch(event.target.value)} placeholder="Find host by name or IP…" />
            {hostsQuery.isError && <QueryErrorState compact error={hostsQuery.error} title="Host selection unavailable" onRetry={() => void hostsQuery.refetch()} />}
            <div className="max-h-36 overflow-y-auto">{(Array.isArray(hostsQuery.data) ? hostsQuery.data : []).filter(host => `${host.name} ${host.ip_address || ''}`.toLowerCase().includes(hostSearch.toLowerCase())).map(host => <label key={host.id} className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" checked={resourceIds.includes(host.id)} onChange={event => setResourceIds(current => event.target.checked ? [...current, host.id] : current.filter(id => id !== host.id))} />{host.name}<span className="text-xs text-muted-foreground">{host.ip_address}</span></label>)}</div>
            {unavailableHostIds.length > 0 && <div role="alert" className="space-y-2 rounded-md border border-amber-500 p-2 text-sm">
              <p>Some selected hosts are no longer available in this environment or your access scope. Remove them or restore access before saving.</p>
              {unavailableHostIds.map(id => <div key={id} className="flex items-center justify-between gap-2">
                <span className="min-w-0 break-all">Unavailable host · {id}</span>
                <Button type="button" size="sm" variant="outline" aria-label={`Remove unavailable host ${id}`} onClick={() => {setResourceIds(current => current.filter(value => value !== id)); setDirty(true);}}>Remove</Button>
              </div>)}
              <p className="text-xs">Removing the last selected host leaves an empty selection. Choose a host or explicitly select the entire environment.</p>
            </div>}
            </fieldset>
            {!hasValidScope && <p role="alert" className="text-sm text-destructive">Select at least one host or choose Entire environment.</p>}
            <p className="text-xs text-muted-foreground">{resourceScope === 'environment' ? 'Entire environment' : `${resourceIds.length} selected ${resourceIds.length === 1 ? 'host' : 'hosts'}`}</p>
          </fieldset>
          <div className="space-y-1.5"><Label htmlFor="maintenance-change">Change reference</Label><Input id="maintenance-change" value={changeReference} onChange={event => setChangeReference(event.target.value)} maxLength={200} placeholder="e.g. CHG-2026-104" /></div>
          {windowsQuery.isError && <QueryErrorState compact error={windowsQuery.error} title="Overlap check unavailable" onRetry={() => void windowsQuery.refetch()} />}
          {overlaps.length > 0 && <div role="status" className="rounded-md border border-amber-500 p-3 text-sm"><p className="font-medium">Overlapping maintenance on the same scope</p><ul>{overlaps.map(item => <li key={item.id}>{item.name} · {formatDateTime(item.starts_at)}{item.owner ? ` · ${item.owner}` : ''}</li>)}</ul><p className="mt-1 text-xs">Coordinate owners before saving. Overlaps are allowed when intentional.</p></div>}
          <div className="space-y-1.5">
            <datalist id="maintenance-owners">{[...new Set([
              ...(Array.isArray(teamsQuery.data) ? teamsQuery.data.map(team => team.name) : []),
              ...(windowsQuery.data || []).map(item => item.owner).filter((value): value is string => Boolean(value)),
            ])].map(value => <option key={value} value={value} />)}</datalist>
            <Label htmlFor="maintenance-timezone">Timezone</Label>
            <Input aria-label="Search timezones" placeholder="Search city or timezone…" value={timezoneSearch} onChange={event => setTimezoneSearch(event.target.value)} />
            <select id="maintenance-timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)} className="h-9 w-full rounded-sm border border-input bg-background px-3 text-sm">
              {[...new Set(['UTC', timezone, ...Intl.supportedValuesOf('timeZone')])].sort().filter(zone => zone === timezone || zone.toLowerCase().replaceAll('_', ' ').includes(timezoneSearch.toLowerCase().replaceAll('_', ' '))).map(zone => <option key={zone} value={zone}>{zone}</option>)}
            </select>
            <p className="text-xs text-muted-foreground">Changing the timezone keeps the same instant and updates the displayed local time.</p>
          </div>
          {!hasValidRange && (
            <p className="text-sm text-destructive">
              The end must be after the start.
            </p>
          )}
          <div className="min-w-0 space-y-1.5">
            <Label htmlFor="maintenance-description">
              Description{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <textarea
              id="maintenance-description"
              maxLength={1000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="flex min-h-20 min-w-0 w-full rounded-sm border border-input bg-background px-2.5 py-1.5 text-[13px] leading-5 shadow-[inset_0_1px_1px_hsl(var(--foreground)/0.025)]"
              placeholder="Affected platforms, reason, and expected impact"
            />
          </div>
          </fieldset>
          {saveMutation.error && (
            <p role="alert" className="text-sm text-destructive">
              {(saveMutation.error as Error).message}
            </p>
          )}
          {versionConflict && <div className="space-y-3 rounded border border-amber-500 p-3">
            <Button type="button" variant="outline" disabled={windowsQuery.isFetching||contextChanged} onClick={()=>void reviewLatest()}>{windowsQuery.isFetching?'Loading current version…':'Review current version'}</Button>
            {reviewError&&<p role="alert" className="text-sm text-destructive">{reviewError}</p>}
            {latestWindow&&<><p className="text-sm">Compare the saved version with your draft. Accepting keeps your draft as a complete replacement; it does not save yet.</p>
              <div className="max-h-72 overflow-auto"><table className="w-full table-fixed text-xs"><thead><tr><th>Field</th><th>Current saved value</th><th>Your draft</th></tr></thead><tbody>{comparison.map(([label,current,draft])=><tr key={label} className={current!==draft?'bg-amber-500/10':''}><th className="align-top text-left">{label}</th><td className="break-words p-2 align-top">{current||'—'}</td><td className="break-words p-2 align-top">{draft||'—'}</td></tr>)}</tbody></table></div>
              {latestWindow.can_edit===false?<p role="alert" className="text-sm text-destructive">You can no longer edit this window's scope.</p>:<Button type="button" variant="outline" disabled={contextChanged} onClick={()=>{setReviewedRevision(latestWindow.revision);setLatestWindow(null);saveMutation.reset();}}>Use my draft against this version</Button>}</>}
          </div>}
          </div>
          <DialogFooter className="shrink-0 border-t bg-card pt-3 mt-3">
            <Button type="button" variant="outline" onClick={requestClose} disabled={saveMutation.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={versionConflict || saveMutation.isPending || !hasValidRange || !hasValidScope || !repeatReady || unavailableHostIds.length > 0 || contextChanged}
            >
              {saveMutation.isPending ? (
                <RefreshCw className="animate-spin" />
              ) : (
                <CalendarClock />
              )}
              {initial ? "Save" : recurrence ? `Schedule ${repeatCount} windows` : "Schedule maintenance window"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <ConfirmDialog open={discardOpen} onOpenChange={setDiscardOpen}
      title="Discard maintenance changes?" description="Your unsaved maintenance draft will be lost."
      confirmLabel="Discard changes" cancelLabel="Keep editing"
      onConfirm={() => { setDiscardOpen(false); onClose(); }} />
  </>);
}
