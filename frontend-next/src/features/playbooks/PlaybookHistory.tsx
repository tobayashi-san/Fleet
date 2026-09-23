import { Timestamp } from '@/components/ui/timestamp';
import { CancelRunDialog, type CancelRunTarget } from './components/CancelRunDialog';
import { Link } from "@tanstack/react-router";
import { statusLabel } from "@/lib/history-labels";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Eye, History, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { SkeletonRow } from "@/components/ui/skeleton";
import { hasCap, useProfile } from "@/lib/queries";
import { useUi } from "@/lib/store";
import type { HistoryEntry } from "./playbook-types";
import { PlaybookTargetSummary } from "./components/PlaybookTargetSummary";

export function HistoryTab() {
  const { t } = useTranslation();
  const environmentId = useUi((state) => state.environmentId);
  const { data: profile } = useProfile();
  const [cancelTarget, setCancelTarget] = useState<CancelRunTarget | null>(null);
  const [filterSchedule, setFilterSchedule] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => { setFilterSchedule(""); setFilterStatus(""); setPage(1); }, [environmentId]);

  const historyQuery = useQuery({
    queryKey: ["scheduleHistory", environmentId, filterSchedule, filterStatus, page],
    queryFn: () => {
      const query = new URLSearchParams({environment_id: environmentId, page: String(page)});
      if (filterSchedule) query.set('scheduleId', filterSchedule);
      if (filterStatus) query.set('status', filterStatus);
      return apiFetch<{items: HistoryEntry[]; schedules: {id:string; name:string; deleted:boolean}[]; total: number; page: number; pageSize: number}>(`/schedule-history?${query}`, {environmentId});
    },
    refetchInterval: (query) => query.state.data?.items.some(entry => ["running", "queued"].includes(entry.status)) ? 2_000 : 15_000,
  });
  useEffect(() => {
    if (historyQuery.data) {
      const lastPage = Math.max(1, Math.ceil(historyQuery.data.total / historyQuery.data.pageSize));
      if (page > lastPage) setPage(lastPage);
    }
  }, [historyQuery.data, page]);
  const schedules = historyQuery.data?.schedules || [];
  const history = historyQuery.data?.items;
  return (
    <>
      <CancelRunDialog target={cancelTarget} onClose={() => setCancelTarget(null)} />
      <p className="text-xs text-muted-foreground">Automatic cleanup keeps the latest 200 finished or skipped workflow entries per environment. Running and queued runs are retained.</p>
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <History className="h-4 w-4" /> {t("hist.title")}
            </div>
            <select
              className="flex h-8 max-w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
              aria-label="Filter runs by schedule"
              value={filterSchedule}
              onChange={(e) => { setFilterSchedule(e.target.value); setPage(1); }}
            >
              <option value="">{t("hist.filterAll")}</option>
              {schedules.map((s) => (
                <option key={s.id} value={s.id} title={`Schedule ID: ${s.id}`}>
                  {s.name}{s.deleted ? " · deleted" : ""}{schedules.filter(other => other.name === s.name).length > 1 ? ` · ${s.id.slice(0,8)}` : ""}
                </option>
              ))}
            </select>
            <select aria-label="Filter runs by status" className="h-8 rounded-md border bg-background px-2 text-xs" value={filterStatus} onChange={event => {setFilterStatus(event.target.value); setPage(1);}}>
              <option value="">All statuses</option>
              {['success','failed','running','queued','cancelled','skipped','unknown'].map(status => <option key={status} value={status}>{statusLabel(t,status)}</option>)}
            </select>
          </div>
          {historyQuery.isLoading ? (
            <div className="space-y-1">
              <SkeletonRow cols={5} />
              <SkeletonRow cols={5} />
              <SkeletonRow cols={5} />
              <SkeletonRow cols={5} />
            </div>
          ) : historyQuery.isError ? (
            <QueryErrorState
              compact
              error={historyQuery.error}
              title="Playbook run history could not be loaded"
              onRetry={() => void historyQuery.refetch()}
            />
          ) : !history || history.length === 0 ? (
            <EmptyState
              compact
              icon={<History className="h-5 w-5" />}
              title={filterStatus || filterSchedule ? "No runs match these filters" : t("hist.noHistory")}
            />
          ) : (
            <div className="table-scroll">
              <table
                className="w-full min-w-[720px] text-sm"
                data-density="compact"
              >
                <thead>
                  <tr>
                    <th className="px-3">{t("hist.schedule")}</th>
                    <th className="px-3">{t("hist.playbook")}</th>
                    <th className="px-3">{t("hist.targets")}</th>
                    <th className="px-3">{t("hist.started")}</th>
                    <th className="px-3">{t("hist.status")}</th>
                    <th className="w-16 px-3">
                      <span className="sr-only">{t("common.actions")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id}>
                      <td className="px-3 font-medium">
                        {h.schedule_id === null ? (
                          <StatusBadge tone="muted">
                            {h.schedule_name}
                          </StatusBadge>
                        ) : (
                          <>{h.schedule_name}{schedules.find(schedule => schedule.id === h.schedule_id)?.deleted && <span className="ml-1 text-xs text-muted-foreground">· deleted schedule</span>}</>
                        )}
                      </td>
                      <td className="px-3 font-mono text-xs">{h.playbook}</td>
                      <td className="px-3 text-xs"><PlaybookTargetSummary targets={h.targets} /></td>
                      <td className="px-3 text-xs text-muted-foreground">
                        <Timestamp value={h.started_at} />
                        {h.completed_at && <span className="mt-1 block">Completed: <Timestamp value={h.completed_at} /></span>}
                      </td>
                      <td className="px-3">
                        <StatusBadge
                          tone={h.status === 'success' ? 'success' : ['running','queued'].includes(h.status) ? 'info' : h.status === 'failed' ? 'danger' : 'muted'}
                        >
                          {statusLabel(t, h.status)}
                        </StatusBadge>
                      </td>
                      <td className="px-3 text-right">
                        <div className="flex justify-end gap-1">
                          {h.status === "running" && hasCap(profile, "canRunPlaybooks") && (
                            <Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => setCancelTarget({id:h.id,environment:environmentId})} title="Cancel run" aria-label="Cancel run">
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Link to="/operations/executions/$id" params={{id:`workflow-${h.id}`}} search={{environment:environmentId}} aria-label={`Open execution: ${h.schedule_name || h.playbook}`} title={t("hist.output")} className="inline-flex h-7 w-7 items-center justify-center rounded-md border hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {historyQuery.data && (historyQuery.data.total > 0 || page > 1) && <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <p>{historyQuery.data.total} matching entries · Page {page} of {Math.max(1, Math.ceil(historyQuery.data.total / historyQuery.data.pageSize))}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1 || historyQuery.isFetching} onClick={() => setPage(page - 1)}>Previous</Button>
              <Button size="sm" variant="outline" disabled={page * historyQuery.data.pageSize >= historyQuery.data.total || historyQuery.isFetching} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>}
        </CardContent>
      </Card>

    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Playbook History Dialog
// ═════════════════════════════════════════════════════════════════════════════
