import { historyIdentity } from "@/lib/history-identity";
import { historyFailureCause } from "@/lib/history-failure";
import { Timestamp } from '@/components/ui/timestamp';
import {
  lazy,
  Suspense,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  RefreshCw,
  CircleDot,
  Cpu,
  HardDrive,
  Clock,
  HeartPulse,
  Box,
  Satellite,
  Boxes,
  ExternalLink,
  Info,
  Terminal,
  Pencil,
  ArrowUp,
  Key,
  Power,
  Play,
  Square,
  CloudDownload,
  FileText,
  RotateCw,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Layers,
  Settings2,
  StickyNote,
  Eye,
  Bot,
  Download,
  Shield,
  Sliders,
  History,
  Code2,
  Bell,
  Workflow,
  X,
  Network,
} from "lucide-react";
import { formatDateTime, parseApiDate } from "@/lib/utils";
import { api, apiFetch, ApiError } from "@/lib/api";
import { ws } from "@/lib/ws";
import { useProfile, useSettings, hasCap } from "@/lib/queries";
import { useUi } from "@/lib/store";
import { showToast } from "@/lib/toast";
import { actionLabel, statusLabel } from "@/lib/history-labels";
import { CreateServerDialog } from "@/components/CreateServerDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, LiveDot } from "@/components/ui/status-badge";
import { Skeleton, SkeletonRow } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  OverflowMenu,
  OverflowItem,
  OverflowSep,
} from "@/components/ui/overflow-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { metricTextClass } from "@/components/ui/metric-bar";
import {
  ActionRunDialog,
  type OutputLine,
  type RunStatus,
} from "@/components/ui/action-run-dialog";
import { CopyButton, StatCard, ThresholdBar } from "./components/summary-cards";
import { marked } from "marked";
import DOMPurify from "dompurify";
import {
  type AgentStatus,
  type ContainerRow,
  type CustomTask,
  type HistoryRow,
  type IpamReservation,
  type ManagedDeploymentResponse,
  type ServerDetail,
  type ServerInfo,
  CapacitySummary,
  formatBytes,
  formatUptime,
  HostStorageInventory,
  RecentHostTasks,
  SummaryField,
} from "./server-detail-model";


import type { ServerDetailController } from "./useServerDetailController";

function historyDuration(item: Partial<HistoryRow>) {
  if (!item.started_at || !item.completed_at) return item.status === "running" ? "Running" : "—";
  const milliseconds = parseApiDate(item.completed_at).getTime() - parseApiDate(item.started_at).getTime();
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return "—";
  const seconds = Math.round(milliseconds / 1000);
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export function ServerOperationsTabs({ controller }: { controller: ServerDetailController }) {
  const [historySelection, setHistorySelection] = useState<{ host: string; row: HistoryRow } | null>(null);
  const setSelectedHistory = (row: HistoryRow | null) => setHistorySelection(row ? {host:controller.id,row} : null);
  const selectedSnapshot = historySelection?.host === controller.id ? historySelection.row : null;
  const selectedRunQuery = useQuery({
    queryKey: ["server", controller.id, "historyRun", selectedSnapshot ? historyIdentity(selectedSnapshot) : null],
    queryFn: () => apiFetch<HistoryRow>(`/servers/${encodeURIComponent(controller.id)}/history/${selectedSnapshot?._type === "schedule" ? "schedule" : "manual"}/${encodeURIComponent(String(selectedSnapshot?.id))}`),
    enabled: Boolean(selectedSnapshot),
    refetchInterval: query => ["running", "pending", "queued", "cancelling"].includes((query.state.data || selectedSnapshot)?.status || "") ? 3000 : false,
  });
  const selectedHistory = selectedSnapshot ? selectedRunQuery.data || selectedSnapshot : null;
  const {
    t,
    qc,
    params,
    id,
    navigate,
    terminalOpen,
    setTerminalOpen,
    editOpen,
    setEditOpen,
    confirmRunUpdate,
    setConfirmRunUpdate,
    confirmResetHostKey,
    setConfirmResetHostKey,
    confirmReboot,
    setConfirmReboot,
    confirmDelete,
    setConfirmDelete,
    confirmDeleteTask,
    setConfirmDeleteTask,
    confirmComposeDown,
    setConfirmComposeDown,
    confirmAgentInstall,
    setConfirmAgentInstall,
    confirmAgentRemove,
    setConfirmAgentRemove,
    confirmRestartContainer,
    setConfirmRestartContainer,
    actionRun,
    setActionRun,
    profile,
    settings,
    agentEnabled,
    timeFormat,
    hour12,
    serverKnown,
    canViewManagementRelationships,
    deploymentData,
    managedDeployments,
    managedProxmoxDeployment,
    startActionRun,
    rawServer,
    isLoading,
    server,
    info,
    refetchInfo,
    fetchingInfo,
    infoFailed,
    infoError,
    ipamReservationData,
    ipamReservations,
    dockerContainers,
    fetchingDocker,
    rawUpdates,
    history,
    notesData,
    notesBaseline,
    notesFailed,
    refetchNotes,
    notesReady,
    notesDirty,
    reloadNotesMut,
    customTasks,
    customTaskList,
    agentStatus,
    refetchAgent,
    imageUpdates,
    setImageUpdates,
    notes,
    setNotes,
    notesEditing,
    setNotesEditing,
    renderedNotes,
    saveNotesMut,
    runUpdateMut,
    runRebootMut,
    proxmoxRebootMut,
    testConnMut,
    resetHostKeyMut,
    deleteServerMut,
    restartContainerMut,
    logsContainer,
    setLogsContainer,
    logsContent,
    setLogsContent,
    logsTail,
    setLogsTail,
    logsLoading,
    setLogsLoading,
    logsError,
    setLogsError,
    logsRequestRef,
    loadLogs,
    taskDialog,
    setTaskDialog,
    taskForm,
    setTaskForm,
    saveTaskMut,
    deleteTaskMut,
    checkTaskMut,
    runTaskMut,
    checkImageMut,
    checkSystemUpdatesMut,
    composeActionMut,
    composeDialog,
    setComposeDialog,
    confirmDeleteStack,
    setConfirmDeleteStack,
    deleteStackMut,
    openEditCompose,
    saveComposeMut,
    latencyMs,
    setLatencyMs,
    agentUrl,
    setAgentUrl,
    agentCa,
    setAgentCa,
    agentInstallMut,
    agentUpdateMut,
    agentConfigMut,
    agentRotateMut,
    agentRemoveMut,
    agentBusy,
    HIST_PAGE_SIZE,
    histPage,
    setHistPage,
    histItems,
    historyFilters,
    historyActions = [],
    setHistoryFilters,
    historyCount,
    historyMatchCount = histItems.length,
    historyLoading,
    historyFailed,
    refetchHistory,
    histTotal,
    histSafe,
    histPage_,
    ramPct,
    diskPct,
    cpuPct,
    healthThresholds,
    updatesList,
    phasedList,
    containers,
    activeLogContainer,
    stacks,
  } = controller;

  return (
    <>
        {/* ════ HISTORY ════ */}
        <TabsContent value="history" className="space-y-4">
          <div className="flex flex-wrap items-end gap-3 rounded-md border bg-card p-3">
            <label className="min-w-48 flex-1 text-xs">Search action, actor or log<Input value={historyFilters.query} onChange={event=>setHistoryFilters({...historyFilters,query:event.target.value})} /></label>
            <label className="text-xs">Action type<select className="block h-9 rounded-md border bg-background px-2" value={historyFilters.action || ""} onChange={event=>setHistoryFilters({...historyFilters,action:event.target.value})}><option value="">All action types</option>{historyFilters.action && !historyActions.includes(historyFilters.action) && <option value={historyFilters.action}>{actionLabel(t,historyFilters.action)}</option>}{historyActions.map(action=><option key={action} value={action}>{actionLabel(t,action)}</option>)}</select></label>
            <label className="text-xs">Status<select className="block h-9 rounded-md border bg-background px-2" value={historyFilters.status} onChange={event=>setHistoryFilters({...historyFilters,status:event.target.value})}><option value="">All statuses</option>{['success','failed','running','pending','queued','cancelling','cancelled','skipped'].map(status=><option key={status} value={status}>{statusLabel(t,status)}</option>)}</select></label>
            <label className="text-xs">From · Europe/Zurich<Input type="date" value={historyFilters.from} onChange={event=>setHistoryFilters({...historyFilters,from:event.target.value})} /></label>
            <label className="text-xs">Through · Europe/Zurich<Input type="date" value={historyFilters.to} onChange={event=>setHistoryFilters({...historyFilters,to:event.target.value})} /></label>
            <Button size="sm" variant="outline" onClick={()=>setHistoryFilters({query:'',status:'',from:'',to:''})}>Clear filters</Button>
            <p className="w-full text-xs text-muted-foreground">{historyFailed ? "Run counts are unavailable until history loads." : historyLoading ? "Loading run counts…" : `${historyMatchCount} of ${historyCount} runs match.`} Filters include older manual and scheduled runs.</p>
            {historyFilters.from && historyFilters.to && historyFilters.from > historyFilters.to && <p role="alert" className="text-xs text-destructive">The end date must be on or after the start date.</p>}
          </div>
          {historyFailed ? <div role="alert" className="space-y-3 rounded-md border p-4"><p>History could not be loaded.</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={controller.historyFetching} onClick={()=>void refetchHistory()}>Retry</Button>{histPage > 1 && <Button variant="outline" size="sm" onClick={()=>setHistPage(1)}>Back to newest runs</Button>}</div></div> : historyLoading ? <p>Loading history…</p> : histItems.length === 0 ? (
            <Card>
              <CardHeader className="border-b bg-muted/15 px-4 py-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <History className="h-4 w-4" />
                  Task history
                </CardTitle>
              </CardHeader>
              <CardContent className="flex min-h-24 items-center gap-3 px-4 py-4 text-sm text-muted-foreground">
                <History className="h-4 w-4 shrink-0" />
                <span>{historyCount ? "No runs match these filters." : t("det.noHistory")}</span>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-3 border-b bg-muted/15 px-4 py-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <History className="h-4 w-4" />
                    Task history
                  </CardTitle>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Executions, updates, and scheduled runs for this host.
                  </p>
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  {histItems.length}
                </span>
              </CardHeader>
              <CardContent className="p-0">
                <>
                  <div className="divide-y md:hidden">
                    {histPage_.map((h) => (
                      <div key={historyIdentity(h)} className="space-y-1.5 px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              {h._type === "schedule" && (
                                <StatusBadge tone="muted">
                                  {t("det.playbookBadge")}
                                </StatusBadge>
                              )}
                              <span className="truncate text-sm font-medium">
                                {h.action
                                  ? actionLabel(t, h.action)
                                  : h.playbook_name || "—"}
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {h.triggered_by || "system"} · Started:{" "}
                              <Timestamp value={h.started_at} hour12={hour12} />
                              {h.completed_at && <span className="block">Completed: <Timestamp value={h.completed_at} hour12={hour12} /></span>}
                            </div>
                          </div>
                          <StatusBadge
                            tone={
                              h.status === "success"
                                ? "success"
                                : h.status === "failed"
                                  ? "danger"
                                  : "muted"
                            }
                            dot
                          >
                            {statusLabel(t, h.status)}
                          </StatusBadge>
                        </div>
                        <div className="text-xs text-muted-foreground">Duration: {historyDuration(h)}</div>
                        {h.status !== "failed" && <button type="button" className="text-xs underline" onClick={() => setSelectedHistory(h)}>Open log</button>}
                        {h.status === "failed" && <div className="rounded-sm bg-destructive/5 p-2 text-xs text-destructive"><span className="font-medium">Cause: </span>{historyFailureCause(h)}<button type="button" className="ml-2 underline" onClick={() => setSelectedHistory(h)}>Open log</button></div>}
                      </div>
                    ))}
                  </div>
                  <div className="table-scroll hidden md:block">
                    <table
                      className="w-full min-w-[620px] text-sm"
                      data-density="compact"
                    >
                      <thead className="border-b bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2">{t("det.colAction")}</th>
                          <th className="px-3 py-2">{t("det.colTrigger")}</th>
                          <th className="px-3 py-2">{t("common.status")}</th>
                          <th className="px-3 py-2">{t("det.colStarted")}</th>
                          <th className="px-3 py-2">{t("det.colDone")}</th>
                          <th className="px-3 py-2">Duration</th>
                          <th className="px-3 py-2">Failure / log</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {histPage_.map((h) => (
                          <tr key={historyIdentity(h)}>
                            <td className="px-3 py-2 font-mono text-xs">
                              {h._type === "schedule" && (
                                <StatusBadge tone="muted" className="mr-1">
                                  {t("det.playbookBadge")}
                                </StatusBadge>
                              )}
                              {h.action
                                ? actionLabel(t, h.action)
                                : h.playbook_name || "—"}
                            </td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">
                              {h.triggered_by || "system"}
                            </td>
                            <td className="px-3 py-2">
                              <StatusBadge
                                tone={
                                  h.status === "success"
                                    ? "success"
                                    : h.status === "failed"
                                      ? "danger"
                                      : "muted"
                                }
                              >
                                {statusLabel(t, h.status)}
                              </StatusBadge>
                            </td>
                            <td className="px-3 py-2 text-xs text-muted-foreground tabular-nums">
                              <Timestamp value={h.started_at} hour12={hour12} />
                            </td>
                            <td className="px-3 py-2 text-xs text-muted-foreground tabular-nums">
                              <Timestamp value={h.completed_at} hour12={hour12} />
                            </td>
                            <td className="px-3 py-2 text-xs text-muted-foreground tabular-nums">{historyDuration(h)}</td>
                            <td className="max-w-[22rem] px-3 py-2 text-xs">
                              {h.status === "failed" ? <><span className="block truncate text-destructive" title={historyFailureCause(h)}>{historyFailureCause(h)}</span><button type="button" className="mt-0.5 text-primary underline" onClick={() => setSelectedHistory(h)}>Open log</button></> : <button type="button" className="text-primary underline" onClick={() => setSelectedHistory(h)}>Open log</button>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {histTotal > 1 && (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2">
                      <span className="text-xs text-muted-foreground">
                        {t("det.histPageInfo", {
                          from: (histSafe - 1) * HIST_PAGE_SIZE + 1,
                          to: Math.min(
                            histSafe * HIST_PAGE_SIZE,
                            historyMatchCount,
                          ),
                          total: historyMatchCount,
                        })}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label="Newer runs"
                          disabled={histSafe === 1}
                          onClick={() => setHistPage(histSafe - 1)}
                        >
                          ‹
                        </Button>
                        {Array.from({ length: histTotal }, (_, i) => i + 1)
                          .filter(
                            (i) =>
                              histTotal <= 7 ||
                              Math.abs(i - histSafe) <= 2 ||
                              i === 1 ||
                              i === histTotal,
                          )
                          .map((i, idx, arr) => (
                            <span key={i}>
                              {idx > 0 && i - arr[idx - 1] > 1 && (
                                <span className="px-1 text-muted-foreground">
                                  …
                                </span>
                              )}
                              <Button
                                size="sm"
                                variant={i === histSafe ? "default" : "ghost"}
                                aria-label={`History page ${i}`}
                                aria-current={i === histSafe ? "page" : undefined}
                                onClick={() => setHistPage(i)}
                              >
                                {i}
                              </Button>
                            </span>
                          ))}
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label="Older runs"
                          disabled={histSafe === histTotal}
                          onClick={() => setHistPage(histSafe + 1)}
                        >
                          ›
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ════ AGENT ════ */}
        {agentEnabled && profile?.role === "admin" && (
          <TabsContent value="agent" className="space-y-4">
            <Card>
              <CardContent className="px-4 pb-4 pt-4 space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t("det.agentDescription")}
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    icon={<Settings2 className="h-5 w-5" />}
                    label={t("det.agentMode")}
                    value={agentStatus?.mode || "legacy"}
                  />
                  <Card>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground"><Clock className="h-4 w-4" />{t("det.agentLastSeen")}</div>
                      <div className="mt-1 break-words text-sm">{agentStatus?.lastSeen ? <Timestamp value={agentStatus.lastSeen} hour12={hour12} /> : "No agent report recorded"}</div>
                      <p className="mt-1 text-xs text-muted-foreground">Last received report; installation alone does not confirm current connectivity.</p>
                    </CardContent>
                  </Card>
                  <StatCard
                    icon={<Shield className="h-5 w-5" />}
                    label={t("det.agentRunnerVersion")}
                    value={agentStatus?.runnerVersion || "—"}
                  />
                  <StatCard
                    icon={<FileText className="h-5 w-5" />}
                    label={t("det.agentManifestVersion")}
                    value={String(
                      agentStatus?.manifestVersion ||
                        agentStatus?.latestManifestVersion ||
                        "—",
                    )}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {!agentStatus?.installed ? (
                    <Button
                      size="sm"
                      onClick={() => setConfirmAgentInstall(true)}
                      disabled={agentBusy}
                    >
                      <Download className="h-3.5 w-3.5 mr-1" />{" "}
                      {t("det.agentInstall")}
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => agentUpdateMut.mutate()}
                        disabled={agentBusy}
                      >
                        <RotateCw className="h-3.5 w-3.5 mr-1" />
                        {t("det.agentUpdate")}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => agentConfigMut.mutate()}
                        disabled={agentBusy}
                      >
                        <Sliders className="h-3.5 w-3.5 mr-1" />
                        {t("det.agentConfigure")}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => agentRotateMut.mutate()}
                        disabled={agentBusy}
                      >
                        <Key className="h-3.5 w-3.5 mr-1" />
                        {t("det.agentRotateToken")}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setConfirmAgentRemove(true)}
                        disabled={agentBusy}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        {t("det.agentRemove")}
                      </Button>
                    </>
                  )}
                </div>
                {agentStatus?.installed && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>
                      <strong>{t("det.agentUpdate")}:</strong>{" "}
                      {t("det.agentUpdateHint")}
                    </p>
                    <p>
                      <strong>{t("det.agentConfigure")}:</strong>{" "}
                      {t("det.agentConfigureHint")}
                    </p>
                  </div>
                )}
                <div className="space-y-2 max-w-xl">
                  <Label className="text-xs">{t("det.agentShipyardUrl")}</Label>
                  <Input
                    value={agentUrl}
                    onChange={(e) => setAgentUrl(e.target.value)}
                    placeholder={t("det.agentUrlPlaceholder")}
                  />
                  <Label className="text-xs">{t("det.agentCaPem")}</Label>
                  <Textarea
                    value={agentCa}
                    onChange={(e) => setAgentCa(e.target.value)}
                    rows={4}
                    className="font-mono text-xs"
                    placeholder={t("det.agentCaPemPlaceholder")}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
        <Dialog open={Boolean(selectedHistory)} onOpenChange={(open) => !open && setSelectedHistory(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader><DialogTitle>Task log</DialogTitle></DialogHeader>
            <div className="text-xs text-muted-foreground">{selectedHistory?.action ? actionLabel(t, selectedHistory.action) : selectedHistory?.playbook_name || "Task"} · {historyDuration(selectedHistory || {})} · {statusLabel(t, selectedHistory?.status || "unknown")}</div>
            <Button variant="outline" size="sm" disabled={selectedRunQuery.isFetching} onClick={() => void selectedRunQuery.refetch()}>Refresh log</Button>
            {selectedRunQuery.isError && <p role="alert" className="text-sm text-destructive">Log refresh failed. The displayed log is the last loaded version.</p>}
            <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-md bg-slate-950 p-4 font-mono text-xs text-slate-100">{selectedHistory?.output || "No log output was recorded."}</pre>
          </DialogContent>
        </Dialog>

        {/* ════ NOTES ════ */}
        {hasCap(profile, "canViewNotes") && (
          <TabsContent value="notes">
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-muted/40 text-muted-foreground">
                    <StickyNote className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">
                      {t("det.tabNotes")}
                    </CardTitle>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Markdown
                    </p>
                  </div>
                </div>
                {hasCap(profile, "canEditNotes") && (notesEditing || !!notes.trim()) && (
                  <div className="inline-flex rounded-md border bg-muted/30 p-0.5">
                    <Button
                      size="sm"
                      variant={!notesEditing ? "secondary" : "ghost"}
                      className="h-7 px-2.5"
                      onClick={() => setNotesEditing(false)}
                    >
                      <Eye className="mr-1.5 h-3.5 w-3.5" />
                      {t("det.notesView")}
                    </Button>
                    <Button
                      size="sm"
                      variant={notesEditing ? "secondary" : "ghost"}
                      className="h-7 px-2.5"
                      disabled={!notesReady || saveNotesMut.isPending || reloadNotesMut.isPending}
                      onClick={() => setNotesEditing(true)}
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      {t("det.notesEdit")}
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-5">
                {!notesReady ? (notesFailed ? <p role="alert">Notes could not be loaded. <Button variant="link" onClick={() => void refetchNotes()}>Retry</Button></p> : <p role="status">Loading notes…</p>) : <>
                {notesFailed && <p role="alert" className="mb-3 text-sm text-destructive">The latest notes could not be checked. Your current draft is retained. <Button variant="link" onClick={() => void refetchNotes()}>Retry</Button></p>}
                {(notesEditing || !!notes.trim() || (notesBaseline?.revision ?? 0) > 0) && <div className="mb-4 space-y-2 text-xs text-muted-foreground">
                  <p>Opened version: {formatDateTime(notesBaseline?.updated_at)} · Author: {notesBaseline?.author || 'Not recorded'} · Revision {notesBaseline?.revision ?? 0}</p>
                  {notesData && notesBaseline && notesData.revision !== notesBaseline.revision && <p role="status" className="text-warning">A different version is saved on the server (revision {notesData.revision}, {formatDateTime(notesData.updated_at)}). Your opened version and draft have been retained. Load the saved version to review it; copy any changes you want to keep first.</p>}
                  <div className="flex flex-wrap items-center gap-2">
                    {hasCap(profile, 'canEditNotes') && <>
                    <Button size="sm" disabled={!notesDirty || saveNotesMut.isPending || reloadNotesMut.isPending || !notesData} onClick={() => saveNotesMut.mutate(notes)}>Save notes</Button>
                    {!notes.trim() && <Button size="sm" variant="outline" disabled={saveNotesMut.isPending || reloadNotesMut.isPending} onClick={() => { setNotes('# Runbook\n\n## Owner and escalation\n- Team / contact:\n\n## Purpose and dependencies\n\n## Routine checks\n\n## Recovery procedure\n\n## References\n'); setNotesEditing(true); }}>Insert runbook template</Button>}
                    </>}
                    <Button size="sm" variant="outline" disabled={saveNotesMut.isPending || reloadNotesMut.isPending} onClick={() => { if (!notesDirty || window.confirm('Discard your unsaved draft and load the latest saved notes? Copy anything you want to keep first.')) reloadNotesMut.mutate(); }}>Load saved version</Button>
                    <span role="status">{saveNotesMut.isPending ? 'Saving…' : reloadNotesMut.isPending ? 'Loading saved version…' : notesDirty ? 'Unsaved changes' : 'No unsaved changes'}</span>
                  </div>
                  {saveNotesMut.isError && <p role="alert" className="text-destructive">{saveNotesMut.error.message} Your draft is still available below.</p>}
                  {reloadNotesMut.isError && <p role="alert" className="text-destructive">{reloadNotesMut.error.message} Your draft has not been replaced.</p>}
                  <NotesHistory hostId={id} />
                </div>}
                {notesEditing ? (
                  <div className="grid gap-4 xl:grid-cols-2">
                    <section className="overflow-hidden rounded-md border bg-background">
                      <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
                        <span className="section-label flex items-center gap-1.5">
                          <Code2 className="h-3.5 w-3.5" /> Markdown
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {saveNotesMut.isPending
                            ? "Saving…"
                            : notesDirty ? "Unsaved changes" : "Saved"}
                        </span>
                      </div>
                      <Textarea
                        value={notes}
                        aria-label="Host notes Markdown"
                        disabled={saveNotesMut.isPending || reloadNotesMut.isPending}
                        maxLength={5000}
                        placeholder={t("det.notesPlaceholder")}
                        className="min-h-[360px] resize-y rounded-none border-0 bg-transparent px-3 py-3 font-mono text-sm leading-6 focus-visible:ring-0"
                        onChange={(e) => {
                          setNotes(e.target.value);
                        }}
                      />
                    </section>
                    <section className="overflow-hidden rounded-md border bg-background">
                      <div className="flex items-center border-b bg-muted/30 px-3 py-2">
                        <span className="section-label flex items-center gap-1.5">
                          <Eye className="h-3.5 w-3.5" /> {t("det.notesView")}
                        </span>
                      </div>
                      {notes.trim() ? (
                        <div
                          className="note-markdown min-h-[360px] px-5 py-4"
                          dangerouslySetInnerHTML={{ __html: renderedNotes }}
                        />
                      ) : (
                        <div className="flex min-h-[360px] items-center justify-center px-5 text-center text-sm text-muted-foreground">
                          {t("det.notesPlaceholder")}
                        </div>
                      )}
                    </section>
                  </div>
                ) : notes.trim() ? (
                  <div
                    className="note-markdown rounded-md border bg-background px-5 py-4"
                    dangerouslySetInnerHTML={{ __html: renderedNotes }}
                  />
                ) : (
                  <div className="flex min-h-28 items-center justify-center gap-2 rounded-md border border-dashed bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
                    <StickyNote className="h-4 w-4 shrink-0" />
                    <span>{t("det.notesEmpty")}</span>
                    {hasCap(profile, 'canEditNotes') && <Button size="sm" disabled={!notesReady} onClick={() => setNotesEditing(true)}>Create host notes</Button>}
                  </div>
                )}
                </>}
              </CardContent>
            </Card>
          </TabsContent>
        )}
    </>
  );
}

function NotesHistory({ hostId }: { hostId: string }) {
  const [open, setOpen] = useState(false);
  const history = useQuery({
    queryKey: ['server', hostId, 'notes-history'],
    queryFn: () => apiFetch<{ revisions: { revision: number; notes: string; author: string | null; created_at: string | null }[] }>(`/servers/${encodeURIComponent(hostId)}/notes/history`),
    enabled: open,
  });
  return <details onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary className="cursor-pointer">Version history · latest 100 revisions</summary>
    {history.isLoading ? <p>Loading history…</p> : history.isError ? <p role="alert">History could not be loaded. <button onClick={() => void history.refetch()} className="underline">Retry</button></p> : !history.data?.revisions.length ? <p>No revisions recorded yet.</p> : <div className="max-h-64 overflow-auto">{history.data.revisions.map((revision) => <details key={revision.revision} className="mt-2 border-t pt-2"><summary className="cursor-pointer">Revision {revision.revision} · {revision.author || 'Original content'} · {formatDateTime(revision.created_at)}</summary><pre className="whitespace-pre-wrap break-words p-2">{revision.notes || '(Empty notes)'}</pre></details>)}</div>}
  </details>;
}
