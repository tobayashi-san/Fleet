import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { OverflowItem, OverflowMenu } from "@/components/ui/overflow-menu";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { DeleteMaintenanceDialog } from '@/features/operations/DeleteMaintenanceDialog';
import { MaintenanceWindow, maintenanceLabel, maintenanceTone, readableTime } from '@/features/operations/model';
import { upcomingSeriesIds } from '@/lib/maintenance-series';
import { useUi } from "@/lib/store";
import { formatDateTime } from "@/lib/utils";
import {
	CalendarClock,
	Pencil,
	Plus,
	Trash2
} from "lucide-react";
import { useState } from "react";

export function MaintenanceWindowsCard({
  windows,
  loading,
  error,
  onRetry,
  canManage,
  onCreate,
  onEdit,
  onDelete,
}: {
  windows: MaintenanceWindow[];
  loading: boolean;
  error?: unknown;
  onRetry: () => void;
  canManage: boolean;
  onCreate: () => void;
  onEdit: (window: MaintenanceWindow) => void;
  onDelete: (window: MaintenanceWindow) => void;
}) {
  const environmentId = useUi(state=>state.environmentId);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteTargets, setDeleteTargets] = useState<MaintenanceWindow[]>([]);
  const [cancelTargets,setCancelTargets]=useState<MaintenanceWindow[]>([]);
  const editableWindows = windows.filter(window=>window.can_edit !== false && !window.cancelled_at);
  const selectedWindows = editableWindows.filter((window) => selected.has(window.id));
  const seriesInfo = (item:MaintenanceWindow) => item.series_id ? <div className="mt-1 text-xs text-muted-foreground">{item.recurrence_frequency === 'weekly' ? 'Weekly' : 'Daily'} series · Occurrence {item.series_index} of {item.series_count} originally scheduled{canManage&&<Button className="ml-2 h-auto px-1 py-0 text-xs" variant="link" disabled={!upcomingSeriesIds(editableWindows,item).length} onClick={()=>setSelected(new Set(upcomingSeriesIds(editableWindows,item)))}>Select upcoming in this series</Button>}</div> : null;
  const allSelected =
    editableWindows.length > 0 && selectedWindows.length === editableWindows.length;
  const someSelected = selectedWindows.length > 0 && !allSelected;
  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 border-b bg-muted/15 py-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-4 w-4" />
            Maintenance windows
          </CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Scheduled work is documented per environment and remains traceable
            in the audit log.
          </p>
        </div>
        {canManage && (
          <Button size="sm" onClick={onCreate}>
            <Plus />
            Add maintenance window
          </Button>
        )}
      </CardHeader>
      {canManage && selectedWindows.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b bg-primary/[0.04] px-4 py-2 text-sm">
          <span className="font-medium tabular-nums">
            {selectedWindows.length} selected
          </span>
          <Button
            size="sm"
            variant="destructive"
            className="ml-auto"
            onClick={() => setDeleteTargets(selectedWindows.map(row=>({...row})))}
          >
            <Trash2 />
            Delete
          </Button>
          <Button size="sm" variant="outline" disabled={!selectedWindows.some(item=>item.state==='scheduled'||item.state==='active')} onClick={()=>setCancelTargets(selectedWindows.filter(item=>item.state==='scheduled'||item.state==='active'))}>Cancel scheduled work</Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelected(new Set())}
          >
            Clear selection
          </Button>
        </div>
      )}
      <CardContent className="p-0">
        {loading ? (
          <div className="p-4 text-sm text-muted-foreground">
            Loading maintenance windows…
          </div>
        ) : error ? (
          <QueryErrorState
            compact
            error={error}
            title="Maintenance windows could not be loaded"
            onRetry={onRetry}
          />
        ) : windows.length === 0 ? (
          <EmptyState
            compact
            icon={<CalendarClock className="h-5 w-5" />}
            title="No maintenance windows scheduled"
            description="Schedule a maintenance window."
          />
        ) : (
          <>
            <div className="divide-y md:hidden">
              {windows.map((window) => (
                <div
                  key={window.id}
                  className="flex gap-3 p-3.5"
                  data-selected={selected.has(window.id) || undefined}
                >
                  {canManage && (
                    <input
                      className="mt-1"
                      type="checkbox"
                      aria-label={`Select ${window.name}`}
                      disabled={window.can_edit === false}
                            checked={selected.has(window.id)}
                      onChange={() => toggle(window.id)}
                    />
                  )}
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {window.name}
                        </div>
                        {seriesInfo(window)}
                        {window.cancelled_at&&<p className="text-xs text-muted-foreground">Cancelled {formatDateTime(window.cancelled_at)} by {window.cancelled_by||'System'} · {window.cancellation_reason}</p>}
                        {window.description && (
                          <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {window.description}
                          </div>
                        )}
                        {(window.affected_resources || window.owner || window.resource_ids?.length || window.change_reference) && <div className="mt-1 text-xs text-muted-foreground">{window.resource_ids?.length ? `${window.resource_ids.length} selected hosts` : window.affected_resources || "Entire environment"}{window.change_reference ? ` · ${window.change_reference}` : ""}{window.owner ? ` · Owner: ${window.owner}` : ""}</div>}
                      </div>
                      <StatusBadge tone={maintenanceTone(window.state)} dot>
                        {maintenanceLabel(window.state)}
                      </StatusBadge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {readableTime(window.starts_at)} –{" "}
                      {readableTime(window.ends_at)}
                    </div>
                    {canManage && window.can_edit !== false && (
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => onEdit(window)}
                        >
                          <Pencil />
                          Edit
                        </Button>
                        {(window.state==='scheduled'||window.state==='active')&&<Button size="sm" variant="outline" onClick={()=>setCancelTargets([window])}>Cancel window</Button>}
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => onDelete(window)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="table-scroll hidden md:block">
              <table
                data-density="compact"
                className="w-full min-w-[720px] text-sm"
              >
                <thead>
                  <tr>
                    {canManage && (
                      <th className="w-11 px-3">
                        <input
                          type="checkbox"
                          aria-label="Select all maintenance windows"
                          checked={allSelected}
                          ref={(input) => {
                            if (input) input.indeterminate = someSelected;
                          }}
                          onChange={() =>
                            setSelected(
                              allSelected
                                ? new Set()
                                : new Set(editableWindows.map((window) => window.id)),
                            )
                          }
                        />
                      </th>
                    )}
                    <th className="px-3">Maintenance window</th>
                    <th className="px-3">Time range</th>
                    <th className="px-3">Status</th>
                    <th className="w-24 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {windows.map((window) => (
                    <tr
                      key={window.id}
                      data-selected={selected.has(window.id) || undefined}
                    >
                      {canManage && (
                        <td className="px-3">
                          <input
                            type="checkbox"
                            aria-label={`Select ${window.name}`}
                            disabled={window.can_edit === false}
                            checked={selected.has(window.id)}
                            onChange={() => toggle(window.id)}
                          />
                        </td>
                      )}
                      <td className="px-3">
                        <div className="font-medium">{window.name}</div>
                        {seriesInfo(window)}
                        {window.cancelled_at&&<p className="text-xs text-muted-foreground">Cancelled {formatDateTime(window.cancelled_at)} by {window.cancelled_by||'System'} · {window.cancellation_reason}</p>}
                        {window.description && (
                          <div className="mt-0.5 max-w-xl truncate text-xs text-muted-foreground">
                            {window.description}
                          </div>
                        )}
                        {(window.affected_resources || window.owner || window.resource_ids?.length || window.change_reference) && <div className="mt-0.5 max-w-xl truncate text-xs text-muted-foreground">{window.resource_ids?.length ? `${window.resource_ids.length} selected hosts` : window.affected_resources || "Entire environment"}{window.change_reference ? ` · ${window.change_reference}` : ""}{window.owner ? ` · Owner: ${window.owner}` : ""}</div>}
                      </td>
                      <td className="px-3 whitespace-nowrap text-xs text-muted-foreground">
                        {readableTime(window.starts_at)} –{" "}
                        {readableTime(window.ends_at)}
                        <div>{window.timezone || "Europe/Zurich"}</div>
                      </td>
                      <td className="px-3">
                        <StatusBadge tone={maintenanceTone(window.state)} dot>
                          {maintenanceLabel(window.state)}
                        </StatusBadge>
                      </td>
                      <td className="px-3 text-right">
                        {canManage && window.can_edit !== false ? (
                          <div className="flex justify-end">
                            <OverflowMenu title={`Actions for ${window.name}`}>
                              <OverflowItem icon={Pencil} onClick={() => onEdit(window)}>
                                Edit window
                              </OverflowItem>
                              {(window.state==='scheduled'||window.state==='active')&&<OverflowItem onClick={()=>setCancelTargets([window])}>Cancel window</OverflowItem>}
                              <OverflowItem icon={Trash2} danger onClick={() => onDelete(window)}>
                                Delete window
                              </OverflowItem>
                            </OverflowMenu>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
      <DeleteMaintenanceDialog mode="cancel" windows={cancelTargets} environmentId={environmentId} onClose={()=>setCancelTargets([])} onDeleted={id=>setSelected(previous=>{const next=new Set(previous);next.delete(id);return next;})} />
      <DeleteMaintenanceDialog windows={deleteTargets} environmentId={environmentId} onClose={()=>setDeleteTargets([])} onDeleted={id=>setSelected(previous=>{const next=new Set(previous);next.delete(id);return next;})} />
    </Card>
  );
}
