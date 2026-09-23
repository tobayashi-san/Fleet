import { EmptyState } from '@/components/ui/empty-state';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	DateTextInput
} from "@/components/ui/date-input";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { TablePagination } from "@/components/ui/table-pagination";
import { AuditLogPanel } from "@/features/operations/AuditLogPanel";
import { OperationsResponse, Workspace } from '@/features/operations/model';
import { OperationDetail, OperationList, TaskScopeButton } from '@/features/operations/OperationList';
import { apiFetch } from "@/lib/api";
import {
	canAccessDeployments,
	hasCap,
	useProfile,
} from "@/lib/queries";
import { useUi } from "@/lib/store";
import { showToast } from "@/lib/toast";
import {
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import {
	CheckCircle2,
	Search
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const OPERATIONS_PAGE_SIZE = 10;

export function OperationsPage() {
  const routeSearch = useSearch({ from: "/_protected/operations" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const environmentId = useUi((state) => state.environmentId);
  const { data: profile } = useProfile();
  const canViewDeployments = canAccessDeployments(profile);
  const canViewAudit = hasCap(profile, "canViewAudit");
  const [taskScope, setTaskScope] = useState<"all" | "active" | "failed">(
    routeSearch.scope || "all",
  );
  const [sourceFilter, setSourceFilter] = useState<"all" | "Host" | "Deployment" | "Workflow">(routeSearch.source || "all");
  const [targetFilter, setTargetFilter] = useState(routeSearch.q || "");
  const [fromDate, setFromDate] = useState(routeSearch.from || "");
  const [toDate, setToDate] = useState(routeSearch.to || "");
  const [operationsPage, setOperationsPage] = useState(routeSearch.page || 1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showCompactOperationDialog, setShowCompactOperationDialog] =
    useState(false);
  const initialFailureFilterApplied = useRef(false);
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(
    null,
  );
  const workspaceQuery = useQuery({
    queryKey: ["opentofu", "workspaces", environmentId],
    queryFn: () =>
      apiFetch<Workspace[]>(
        `/opentofu/workspaces?environment_id=${encodeURIComponent(environmentId)}`,
      ),
    enabled: canViewDeployments,
    staleTime: 15_000,
  });
  useEffect(() => {
    void navigate({
      to: "/operations",
      search: {
        ...(taskScope !== "all" ? { scope: taskScope } : {}),
        ...(routeSearch.section ? { section: routeSearch.section } : {}),
        ...(sourceFilter !== "all" ? { source: sourceFilter } : {}),
        ...(targetFilter.trim() ? { q: targetFilter.trim() } : {}),
        ...(fromDate ? { from: fromDate } : {}),
        ...(toDate ? { to: toDate } : {}),
        ...(operationsPage > 1 ? { page: operationsPage } : {}),
      },
      replace: true,
    });
  }, [fromDate, navigate, operationsPage, routeSearch.section, sourceFilter, targetFilter, taskScope, toDate]);

  useEffect(() => {
    if (!routeSearch.section) return;
    const target = document.getElementById(`operation-${routeSearch.section}`);
    window.requestAnimationFrame(() => target?.scrollIntoView({ block: "start" }));
  }, [routeSearch.section]);
  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1279px)");
    const syncDialogLayout = () =>
      setShowCompactOperationDialog(mediaQuery.matches);
    syncDialogLayout();
    mediaQuery.addEventListener("change", syncDialogLayout);
    return () => mediaQuery.removeEventListener("change", syncDialogLayout);
  }, []);
  const operationsQuery = useQuery({
    queryKey: [
      "operations", environmentId, taskScope, sourceFilter, targetFilter,
      fromDate, toDate, operationsPage,
    ],
    queryFn: () => {
      const params = new URLSearchParams({
        scope: taskScope,
        page: String(operationsPage),
        page_size: String(OPERATIONS_PAGE_SIZE),
      });
      if (sourceFilter !== "all") params.set("source", sourceFilter);
      if (targetFilter.trim()) params.set("q", targetFilter.trim());
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      return apiFetch<OperationsResponse>(`/operations?${params}`);
    },
    staleTime: 10_000,
    // Keep the list current without a manual refresh; poll faster while work is running.
    refetchInterval: query => query.state.data?.counts.active ? 15_000 : 30_000,
  });
  const refreshOperations = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["operations"] }),
      queryClient.invalidateQueries({ queryKey: ["audit-log"] }),
    ]);
  };
  const acknowledgeOperation = useMutation({
    mutationFn: (id: string) => apiFetch(`/operations/${encodeURIComponent(id)}/acknowledge`, { method: "POST" }),
    onSuccess: async () => {
      showToast("Failure acknowledged.", "success");
      await refreshOperations();
    },
    onError: (error: Error) => showToast(error.message, "error"),
  });
  const acknowledgeAllOperations = useMutation({
    mutationFn: () => apiFetch<{ acknowledged: number }>("/operations/acknowledge-all", { method: "POST" }),
    onSuccess: async (result) => {
      showToast(
        result.acknowledged === 1
          ? "1 failure acknowledged."
          : `${result.acknowledged} failures acknowledged.`,
        "success",
      );
      await refreshOperations();
    },
    onError: (error: Error) => showToast(error.message, "error"),
  });
  const operationRows = Array.isArray(operationsQuery.data?.items)
    ? operationsQuery.data.items
    : [];
  const operationCounts = operationsQuery.data?.counts || { all: 0, active: 0, failed: 0 };
  const activeOperationCount = operationCounts.active;
  const failedOperationCount = operationCounts.failed;
  const operationsTotalPages = operationsQuery.data?.total_pages || 1;
  const safeOperationsPage = operationsQuery.data?.page || operationsPage;
  const explicitlySelectedOperation =
    operationRows.find((row) => row.id === selectedOperationId) || null;
  const activeSection = routeSearch.section || "tasks";
  useEffect(() => {
    if (initialFailureFilterApplied.current || routeSearch.scope || operationsQuery.isLoading) return;
    initialFailureFilterApplied.current = true;
    if ((operationsQuery.data?.counts.failed || 0) > 0) setTaskScope("failed");
  }, [operationsQuery.data?.counts.failed, operationsQuery.isLoading, routeSearch.scope]);
  useEffect(() => {
    setOperationsPage(1);
  }, [taskScope, sourceFilter, targetFilter, fromDate, toDate]);
  useEffect(() => {
    if (operationsPage > operationsTotalPages)
      setOperationsPage(operationsTotalPages);
  }, [operationsPage, operationsTotalPages]);
  useEffect(() => {
    if (
      selectedOperationId &&
      !operationRows.some((row) => row.id === selectedOperationId)
    )
      setSelectedOperationId(null);
  }, [operationRows, selectedOperationId]);
  return (
    <div className="space-y-5">
      <PageHeader
        title="Jobs"
        description="Runs and scheduled changes."
      />
      <nav className="flex gap-1 overflow-x-auto rounded-panel border bg-card p-1" aria-label="Operations sections">
        <Button asChild size="sm" variant={activeSection === "tasks" ? "secondary" : "ghost"}><Link to="/operations" search={{ ...routeSearch, section: "tasks" }}>Activity</Link></Button>
        {canViewAudit && <Button asChild size="sm" variant={activeSection === "audit" ? "secondary" : "ghost"}><Link to="/operations" search={{ ...routeSearch, section: "audit" }}>Audit</Link></Button>}
      </nav>
      <div className="flex flex-col gap-5">
        {activeSection === "tasks" && <Card id="operation-tasks" className="scroll-mt-16">
          <CardContent className="p-0">
            {operationsQuery.isLoading ? (
              <div className="p-5 text-sm text-muted-foreground">
                Loading activity…
              </div>
            ) : operationsQuery.isError ? (
              <div>
                <QueryErrorState
                  error={operationsQuery.error}
                  title="Activity could not be loaded"
                  onRetry={() => void operationsQuery.refetch()}
                />
                <Button className="m-3" variant="outline" size="sm" onClick={() => { setTaskScope("all"); setSourceFilter("all"); setTargetFilter(""); setFromDate(""); setToDate(""); setOperationsPage(1); }}>Reset filters and show newest tasks</Button>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-1 border-b bg-muted/10 px-3 py-2">
                  <TaskScopeButton
                    active={taskScope === "all"}
                    onClick={() => setTaskScope("all")}
                  >
                    All <span>{operationCounts.all}</span>
                  </TaskScopeButton>
                  <TaskScopeButton
                    active={taskScope === "active"}
                    onClick={() => setTaskScope("active")}
                  >
                    Active <span>{activeOperationCount}</span>
                  </TaskScopeButton>
                  <TaskScopeButton
                    active={taskScope === "failed"}
                    onClick={() => setTaskScope("failed")}
                  >
                    Failed <span className={failedOperationCount > 0 ? "rounded-full bg-destructive px-1.5 text-[11px] font-semibold text-destructive-foreground" : undefined}>{failedOperationCount}</span>
                  </TaskScopeButton>
                  {failedOperationCount > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="ml-auto"
                      disabled={acknowledgeAllOperations.isPending}
                      onClick={() => acknowledgeAllOperations.mutate()}
                    >
                      <CheckCircle2 />
                      {acknowledgeAllOperations.isPending ? "Acknowledging…" : <>Acknowledge all<span className="hidden sm:inline">&nbsp;failures</span></>}
                    </Button>
                  )}
                </div>
                <div className="flex justify-end border-b bg-background/60 px-3 py-2 md:hidden">
                  <Button
                    type="button"
                    size="sm"
                    variant={filtersOpen ? "secondary" : "outline"}
                    aria-expanded={filtersOpen}
                    aria-controls="activity-filters"
                    onClick={() => setFiltersOpen((open) => !open)}
                  >
                    Filters
                    {(sourceFilter !== "all" || targetFilter || fromDate || toDate) && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-primary" />}
                  </Button>
                </div>
                <div id="activity-filters" className={`${filtersOpen ? "grid" : "hidden"} gap-2 border-b bg-background/60 px-3 py-2.5 sm:grid-cols-2 md:grid xl:grid-cols-[12rem_minmax(14rem,1fr)_10rem_10rem_auto]`}>
                  <label className="space-y-1 text-xs text-muted-foreground">
                    <span>Source</span>
                    <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as typeof sourceFilter)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground">
                      <option value="all">All sources</option>
                      <option value="Host">Hosts</option>
                      <option value="Deployment">Deployments</option>
                      <option value="Workflow">Playbooks</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-xs text-muted-foreground">
                    <span>Target, task, or initiator</span>
                    <span className="relative block"><Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4" /><Input value={targetFilter} onChange={(event) => setTargetFilter(event.target.value)} className="pl-8" placeholder="Filter operations…" /></span>
                  </label>
                  <label className="space-y-1 text-xs text-muted-foreground"><span>From</span><DateTextInput value={fromDate} onChange={setFromDate} ariaLabel="Activity from date" /></label>
                  <label className="space-y-1 text-xs text-muted-foreground"><span>To</span><DateTextInput value={toDate} onChange={setToDate} ariaLabel="Activity to date" /></label>
                  <div className="flex items-end"><Button type="button" size="sm" variant="ghost" disabled={sourceFilter === "all" && !targetFilter && !fromDate && !toDate} onClick={() => { setSourceFilter("all"); setTargetFilter(""); setFromDate(""); setToDate(""); }}>Reset</Button></div>
                </div>
                {operationRows.length ? (
                  <>
                    {/* The table uses the full width; details open beside it only for a chosen task. */}
                    <div className={explicitlySelectedOperation ? "grid xl:grid-cols-[minmax(0,1.6fr)_minmax(20rem,1fr)]" : undefined}>
                      <div className="min-w-0">
                        <OperationList
                          rows={operationRows}
                          selectedId={explicitlySelectedOperation?.id}
                          onSelect={id => setSelectedOperationId(current => current === id ? null : id)}
                        />
                      </div>
                      {explicitlySelectedOperation && <OperationDetail
                        className="hidden xl:block"
                        row={explicitlySelectedOperation}
                        acknowledging={acknowledgeOperation.isPending}
                        onAcknowledge={(id) => acknowledgeOperation.mutate(id)}
                        onClose={() => setSelectedOperationId(null)}
                      />}
                    </div>
                    <Dialog
                      open={Boolean(showCompactOperationDialog && selectedOperationId && explicitlySelectedOperation)}
                      onOpenChange={(open) => !open && setSelectedOperationId(null)}
                    >
                      <DialogContent className="p-0">
                        <DialogHeader className="border-b px-4 pb-3 pt-4 text-left">
                          <DialogTitle>Task details</DialogTitle>
                          <DialogDescription className="sr-only">
                            Details of the selected job.
                          </DialogDescription>
                        </DialogHeader>
                        <OperationDetail
                          className="border-0 p-4"
                          row={explicitlySelectedOperation}
                          acknowledging={acknowledgeOperation.isPending}
                          onAcknowledge={(id) => acknowledgeOperation.mutate(id)}
                          showHeading={false}
                        />
                      </DialogContent>
                    </Dialog>
                    <TablePagination
                      page={safeOperationsPage}
                      pageSize={OPERATIONS_PAGE_SIZE}
                      totalItems={operationsQuery.data?.total || 0}
                      onPageChange={setOperationsPage}
                      itemLabel="events"
                    />
                  </>
                ) : (
                  <EmptyState compact title="There are no entries for this view." description="Change the scope or filters to see more jobs." />
                )}
              </>
            )}
          </CardContent>
        </Card>}
        {activeSection === "audit" && canViewAudit && <div id="operation-audit" className="scroll-mt-16"><AuditLogPanel /></div>}
      </div>
    </div>
  );
}

export type { OperationRow } from '@/features/operations/model';
