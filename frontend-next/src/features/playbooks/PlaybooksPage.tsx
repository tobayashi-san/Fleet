import { GitTab } from '@/routes/settings/tabs/git';
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Plus,
  Save,
  Trash2,
  Play,
  History,
  Search,
  ChevronDown,
  FolderCog,
  Folder,
  ArrowLeft,
  X,
  Eye,
  Undo2,
  Clock,
  SlidersHorizontal,
  GitBranch,
  ArrowDown,
  ArrowUp,
  Settings2,
  Terminal,
  KeyRound,
  Calendar,
  GitCommit,
} from "lucide-react";
import { api } from "@/lib/api";
import { asArray } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, SkeletonRow } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useUi } from "@/lib/store";
import { useProfile, hasCap } from "@/lib/queries";
import { showToast } from "@/lib/toast";
import { ws } from "@/lib/ws";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { useUrlTab } from "@/lib/use-url-tab";
import {
  buildAllExceptTargets,
  cronToSelectors,
  formatDate as fmtDate,
  INTERVALS,
  loadCollapsedCategories as loadCollapsed,
  parsePlaybookTargets,
  saveCollapsedCategories as saveCollapsed,
  selectorsToCron,
  TEMPLATE_YAML,
  WEEKDAYS,
} from "./playbook-utils";

const PlaybookEditor = lazy(() => import("./components/PlaybookEditor"));
import type { AnsibleVar, HistoryEntry, Playbook, PlaybookVersion, Schedule } from "./playbook-types";
import { TemplatesTab } from "./PlaybookTemplates";
import { RunsTab } from "./PlaybookRuns";
import { VarsTab } from "./PlaybookVariables";
import { SchedulesTab } from "./PlaybookSchedules";
import { HistoryTab } from "./PlaybookHistory";

// ── Types ────────────────────────────────────────────────────────────────────



// ═════════════════════════════════════════════════════════════════════════════
// Main page
// ═════════════════════════════════════════════════════════════════════════════

export function PlaybooksPage() {
  const { t } = useTranslation();
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const requestedFile = new URLSearchParams(location.searchStr).get("file") || undefined;
  const isAdmin = profile?.role === "admin";
  const [runPreset, setRunPreset] = useState("");
  const [createRequest, setCreateRequest] = useState(0);
  const [createContext, setCreateContext] = useState<string | undefined>();
  const nextCreateRequest = useRef(0);
  const consumeCreateRequest = useCallback(() => setCreateRequest(0), []);

  const tabs = useMemo<{
    value: string;
    label: string;
    icon: React.ReactNode;
    cap?: string;
  }[]>(() => [
    {
      value: "templates",
      label: "Playbooks",
      icon: <FileText className="h-4 w-4" />,
    },
    {
      value: "runs",
      label: "Runs",
      icon: <Play className="h-4 w-4" />,
    },
    {
      value: "vars",
      label: "Variables & Secrets",
      icon: <SlidersHorizontal className="h-4 w-4" />,
      cap: "canViewVars",
    },
    {
      value: "schedules",
      label: t("pb.tabSchedules"),
      icon: <Clock className="h-4 w-4" />,
      cap: "canViewSchedules",
    },
    ...(isAdmin ? [{value:"git",label:"Git",icon:<GitBranch className="h-4 w-4"/>}] : []),
  ], [t,isAdmin]);
  const allowed = useMemo(() => tabs.filter((tb) => !tb.cap || hasCap(profile, tb.cap)), [profile, tabs]);
  const allowedValues = useMemo(() => allowed.map((item) => item.value), [allowed]);
  const playbookTabs = useUrlTab(allowed[0]?.value ?? "templates", allowedValues);

  // Ensure tab is still allowed after profile changes
  useEffect(() => {
    if (!allowed.find((a) => a.value === playbookTabs.value))
      playbookTabs.onValueChange(allowed[0]?.value ?? "templates");
  }, [allowedValues, playbookTabs.value, playbookTabs.onValueChange]);

  return (
    <div className="space-y-5">
      {/* Header + Git widget */}
      <PageHeader
        title={t("pb.title")}
        description={t("pb.subtitle")}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {isAdmin && playbookTabs.value === "templates" && <div className="hidden sm:block"><GitWidget onGoSettings={() => navigate({ to: "/settings/$tab", params: { tab: "git" } })} /></div>}
            {playbookTabs.value === "templates" && hasCap(profile, "canEditPlaybooks") && (
              <Button onClick={() => { playbookTabs.onValueChange("templates"); setCreateContext(requestedFile); setCreateRequest(++nextCreateRequest.current); }}>
                <Plus />{t("pb.new")}
              </Button>
            )}
          </div>
        }
      />

      <Tabs value={playbookTabs.value} onValueChange={playbookTabs.onValueChange}>
        <TabsList className="console-tabs">
          {allowed.map((tb) => (
            <TabsTrigger key={tb.value} value={tb.value} className="gap-1.5">
              {tb.icon} {tb.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {isAdmin && <TabsContent value="git"><GitTab workspace /></TabsContent>}
        <TabsContent value="templates">
          <TemplatesTab key={requestedFile || "library"} initialFile={requestedFile} createRequest={createContext === requestedFile ? createRequest : 0} onCreateRequestHandled={consumeCreateRequest} onRun={(filename) => { setRunPreset(filename); playbookTabs.onValueChange("runs"); }} />
        </TabsContent>
        <TabsContent value="runs">
          <RunsTab initialPlaybook={runPreset} />
        </TabsContent>
        <TabsContent value="vars">
          <VarsTab />
        </TabsContent>
        <TabsContent value="schedules">
          <SchedulesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Git Widget
// ═════════════════════════════════════════════════════════════════════════════

function GitWidget({ onGoSettings }: { onGoSettings: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [operationError, setOperationError] = useState("");
  const cfgQuery = useQuery({
    queryKey: ["git-config"],
    queryFn: () => api.getGitConfig() as Promise<Record<string, unknown>>,
  });
  const cfg = cfgQuery.data;
  const branch = (cfg?.branch as string) || "main";
  const configured = !!cfg?.repoUrl;
  const readOnly = cfg?.readOnly === true;

  const pullMut = useMutation({
    mutationFn: () => api.gitPull(),
    onMutate: () => setOperationError(""),
    onSuccess: () => {
      showToast(t("git.pulled"), "success");
      qc.invalidateQueries({ queryKey: ["playbooks"] });
      qc.invalidateQueries({ queryKey: ["git-status"] });
      qc.invalidateQueries({ queryKey: ["git-config"] });
      qc.invalidateQueries({ queryKey: ["git-log"] });
    },
    onError: (e: Error) => { setOperationError(e.message); showToast(t("git.pullFailed", { msg: e.message }), "error"); },
  });
  const pushMut = useMutation({
    mutationFn: () => api.gitPush(),
    onMutate: () => setOperationError(""),
    onSuccess: () => { showToast(t("git.pushed"), "success"); void qc.invalidateQueries({ queryKey: ["git-status"] }); void qc.invalidateQueries({ queryKey: ["git-log"] }); },
    onError: (e: Error) => { setOperationError(e.message); showToast(t("git.pushFailed", { msg: e.message }), "error"); },
  });

  if (cfgQuery.isError) {
    return (
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="sm" onClick={() => void cfgQuery.refetch()}>
          Git status unavailable · Retry
        </Button>
        <Button variant="outline" size="sm" onClick={onGoSettings} title="Git settings">
          <Settings2 className="h-3.5 w-3.5" />
          Git settings
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">
      <div className="flex min-w-0 max-w-[220px] items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium text-muted-foreground">
        <GitBranch className="h-3.5 w-3.5" />
        <span className="truncate">
          {cfgQuery.isPending ? "Loading Git status…" : configured ? `${branch}${readOnly ? " · Remote read-only" : ""}` : t("git.notConfigured")}
        </span>
      </div>
      <Button
        variant="outline"
        size="icon"
        className="h-7 w-7"
        onClick={() => pullMut.mutate()}
        disabled={!configured || cfgQuery.isPending || pullMut.isPending || pushMut.isPending}
        title={t("git.pullRemote")}
        aria-label={t("git.pullRemote")}
      >
        <ArrowDown className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="h-7 w-7"
        onClick={() => pushMut.mutate()}
        disabled={!configured || cfgQuery.isPending || readOnly || pushMut.isPending || pullMut.isPending}
        title={readOnly ? "Publishing is disabled in remote read-only mode" : t("git.pushRemote")}
        aria-label={t("git.pushRemote")}
      >
        <ArrowUp className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-7"
        onClick={onGoSettings}
        title="Git settings"
      >
        <Settings2 className="h-3.5 w-3.5" />
        Git settings
      </Button>
      {(pullMut.isPending || pushMut.isPending) && <span role="status" className="text-xs text-muted-foreground">{pullMut.isPending ? 'Pulling from remote…' : 'Pushing to remote…'}</span>}
      {operationError && <p role="alert" className="w-full text-right text-xs text-destructive">{operationError}</p>}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Tab: Templates (split-pane: list + editor/run)
// ═════════════════════════════════════════════════════════════════════════════
