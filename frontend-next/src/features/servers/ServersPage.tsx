import { hasHostFolderScope } from './folder-scope';
import { deleteHostBatch, type DeleteHostTarget } from './delete-host-batch';
import { BulkDeleteResult } from './BulkDeleteResult';
import { selectHostPage, hostSelectionScope, groupHostIds } from './host-selection';
import { SavedHostViews } from './SavedHostViews';
import { savedViewKey } from './saved-views';
import { Fragment, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import {
  Search,
  Server as ServerIcon,
  Plus,
  RefreshCw,
  FolderPlus,
  Tags,
  FileJson,
  FileSpreadsheet,
  FileUp,
  Download,
  Play,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Pencil,
  Trash2,
  FolderTree,
  Info,
  X,
  CheckCircle2,
  Filter,
} from "lucide-react";
import { api } from "@/lib/api";
import { asArray, formatDateTime } from "@/lib/utils";
import { useUi } from "@/lib/store";
import { useProfile, hasCap } from "@/lib/queries";
import { showToast } from "@/lib/toast";
import { CreateServerDialog } from "@/components/CreateServerDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ActiveFilterChips } from "@/components/ui/filter-chips";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { SkeletonRow } from "@/components/ui/skeleton";
import {
  OverflowMenu,
  OverflowItem,
  OverflowSep,
} from "@/components/ui/overflow-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  inventoryAttentionReason,
  buildGroupTree,
  formatRelativeTime,
  getDescendantIds,
  loadCollapsedGroups,
  normalizeServer,
  parseCsvServers,
  saveCollapsedGroups,
  type GroupNode,
  type ServerGroup,
  type ServerInfo,
  type ServerRow,
} from "./server-list-utils";

function buildAllExceptTargets(excluded: string[]): string {
  const unique = [
    ...new Set(excluded.map((v) => String(v || "").trim()).filter(Boolean)),
  ];
  if (unique.length === 0) return "all";
  return `all:${unique.map((v) => `!${v}`).join(":")}`;
}

// ─── Constants ────────────────────────────────────────────────
const PAGE_SIZE = 20;
const PRESET_COLORS = [
  "#6366f1",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f97316",
];

// ─── useServerInfo hook ───────────────────────────────────────
const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 150;

function useServerInfoMap(serverIds: string[]) {
  const [infoMap, setInfoMap] = useState<Record<string, ServerInfo>>({});
  // Per-server monotonic sequence so older in-flight responses can't overwrite newer ones.
  const seqRef = useRef<Record<string, number>>({});

  const loadBatch = useCallback(
    (ids: string[], force = false, signal?: AbortSignal) => {
      ids.forEach((id, i) => {
        const mySeq = (seqRef.current[id] || 0) + 1;
        seqRef.current[id] = mySeq;
        const delay = Math.floor(i / BATCH_SIZE) * BATCH_DELAY_MS;
        setTimeout(() => {
          if (signal?.aborted) return;
          api
            .getServerInfo(id, force)
            .then((info) => {
              if (signal?.aborted || !info) return;
              // Drop result if a newer request for this server has been issued.
              if (seqRef.current[id] !== mySeq) return;
              setInfoMap((prev) => ({
                ...prev,
                [id]: info as unknown as ServerInfo,
              }));
            })
            .catch(() => {
              /* ignore */
            });
        }, delay);
      });
    },
    [],
  );

  const loadInfos = useCallback(
    (ids: string[], force = false) => {
      if (ids.length === 0) return;
      loadBatch(ids, force);
    },
    [loadBatch],
  );

  useEffect(() => {
    if (serverIds.length === 0) return;
    const controller = new AbortController();
    loadBatch(serverIds, false, controller.signal);
    return () => {
      controller.abort();
    };
  }, [serverIds.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  return { infoMap, loadInfos };
}

// ─── GroupDialog Component ────────────────────────────────────
interface GroupDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    color: string;
    parentId: string | null;
    environmentId: string;
  }) => Promise<unknown>;
  title: string;
  confirmText: string;
  groups: ServerGroup[];
  editId?: string | null;
  defaultName?: string;
  defaultColor?: string;
  defaultParentId?: string | null;
  allowTopLevel: boolean;
  parentScope: string[];
  environmentId: string;
}

function GroupDialog({
  open,
  onClose,
  onSubmit,
  title,
  confirmText,
  groups,
  editId,
  defaultName = "",
  defaultColor,
  defaultParentId = null,
  allowTopLevel,
  parentScope,
  environmentId,
}: GroupDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(defaultName);
  const [color, setColor] = useState(defaultColor || PRESET_COLORS[0]);
  const [parentId, setParentId] = useState<string | null>(
    defaultParentId ?? null,
  );

  const [saving,setSaving]=useState(false);
  const [saveError,setSaveError]=useState<string | null>(null);
  const submitting=useRef(false);
  const wasOpen=useRef(false);
  const [openingEnvironment,setOpeningEnvironment]=useState(environmentId);
  const contextChanged=openingEnvironment !== environmentId;
  useEffect(() => {
    if (open && !wasOpen.current) {
      setOpeningEnvironment(environmentId);
      setSaveError(null);
      setName(defaultName);
      setColor(defaultColor || PRESET_COLORS[0]);
      setParentId(defaultParentId ?? null);
    }
    wasOpen.current=open;
  }, [open, defaultName, defaultColor, defaultParentId, environmentId]);

  const excludeIds = editId
    ? getDescendantIds(groups, editId)
    : new Set<string>();
  const parentOptions = groups.filter((g) => !excludeIds.has(g.id) && parentScope.includes(g.id));

  const handleSubmit = async () => {
    if (submitting.current || contextChanged || !name.trim() || (!allowTopLevel && !parentId)) return;
    submitting.current=true;setSaving(true);setSaveError(null);
    try {
      await onSubmit({name:name.trim(),color,parentId:parentId || null,environmentId:openingEnvironment});
      onClose();
    } catch(error) {
      setSaveError(error instanceof Error ? error.message : 'Folder could not be saved.');
    } finally {submitting.current=false;setSaving(false);}
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !submitting.current) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {contextChanged && <p role="alert" className="text-sm text-warning">Environment changed. Close this draft and reopen it in the intended environment.</p>}
        {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
        <fieldset disabled={saving || contextChanged} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="server-group-name">{t("common.name")}</Label>
            <Input
              id="server-group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("srv.groupNamePlaceholder")}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) {e.preventDefault();void handleSubmit();}
              }}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label id="server-group-color-label">{t("srv.groupColor")}</Label>
            <div className="flex flex-wrap gap-1.5 items-center">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  className={`w-6 h-6 rounded-full border-2 ${c === color ? "ring-2 ring-offset-2 ring-offset-background" : "border-transparent"}`}
                  style={{
                    background: c,
                    borderColor: c === color ? c : "transparent",
                  }}
                  type="button"
                  aria-label={`${t("srv.groupColor")}: ${c}`}
                  onClick={() => setColor(c)}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-6 h-6 p-0 border-none rounded-full cursor-pointer bg-transparent"
                title={t("common.customColor")}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="server-group-parent">{t("srv.parentFolder")}</Label>
            <select
              id="server-group-parent"
              value={parentId || ""}
              onChange={(e) => setParentId(e.target.value || null)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {allowTopLevel && <option value="">{t("srv.noneTopLevel")}</option>}
              {parentOptions.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </fieldset>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={saving || contextChanged || !name.trim() || (!allowTopLevel && !parentId)}>{saving ? 'Saving…' : confirmText}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── MoveToGroupDropdown ──────────────────────────────────────
function MoveDropdown({
  groups,
  onSelect,
  onClose,
  anchorRef,
}: {
  groups: ServerGroup[];
  onSelect: (groupId: string | null) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const timer = setTimeout(
      () => document.addEventListener("click", handler),
      0,
    );
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handler);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 z-50 w-48 rounded-md border bg-popover p-1 shadow-md"
    >
      <button
        onClick={() => onSelect(null)}
        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
      >
        <X className="h-3.5 w-3.5 text-muted-foreground" />{" "}
        {t("srv.moveToRoot")}
      </button>
      {groups.map((g) => (
        <button
          key={g.id}
          onClick={() => onSelect(g.id)}
          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
        >
          <Folder
            className="h-3.5 w-3.5"
            style={{ color: g.color || PRESET_COLORS[0] }}
          />{" "}
          {g.name}
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ─── Main ServersPage ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════
export function ServersPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const environmentId = useUi((s) => s.environmentId);
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  useEffect(() => {
    sessionStorage.setItem("shipyard.lastNonDetailRoute", "/servers");
  }, []);

  // ── Data queries ────────────────────────────────────────────
  const {
    data: rawServers,
    isLoading,
    isError: serversFailed,
    error: serversError,
    refetch: refetchServers,
  } = useQuery({
    queryKey: ["servers", environmentId],
    queryFn: () => api.getServers(environmentId) as Promise<Record<string, unknown>[]>,
  });
  const groupsQuery = useQuery({
    // The infrastructure tree and the resource list are two views of the
    // same folder hierarchy. Sharing one query key prevents stale folders
    // after drag-and-drop or a bulk move in either view.
    queryKey: ["server-groups", environmentId],
    queryFn: () =>
      api.getServerGroups(environmentId) as unknown as Promise<ServerGroup[]>,
    staleTime: 30_000,
  });
  const rawGroups = groupsQuery.data;

  const servers = useMemo(() => {
    const allServers = Array.isArray(rawServers) ? rawServers : [];
    return allServers
      .map(normalizeServer)
      .filter(
        (server) =>
          String(
            (server as ServerRow & { environment_id?: string })
              .environment_id || "default",
          ) === environmentId,
      );
  }, [rawServers, environmentId]);
  const groups = useMemo(() => asArray<ServerGroup>(rawGroups), [rawGroups]);

  // ── Local UI state ──────────────────────────────────────────
  const routeSearch = useSearch({ from: "/_protected/servers" });
  const [activeTag, setActiveTag] = useState<string | null>(
    () => localStorage.getItem("shipyard-next.server-tag") || null,
  );
  const [activeStatus, setActiveStatus] = useState<
    "all" | "online" | "offline" | "unknown"
  >(() => {
    if (routeSearch.status) return routeSearch.status;
    const saved = localStorage.getItem("shipyard-next.server-status");
    return saved === "online" || saved === "offline" || saved === "unknown"
      ? saved
      : "all";
  });
  const [needsUpdates, setNeedsUpdates] = useState(() => routeSearch.updates === true);
  const [severity, setSeverity] = useState<'all' | 'critical' | 'warning'>(() => routeSearch.severity || 'all');
  const [needsAttention, setNeedsAttention] = useState(() => routeSearch.attention === true);
  const [activeGroup, setActiveGroup] = useState<string>(
    () => localStorage.getItem("shipyard-next.server-group") || "all",
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [operatingColumns, setOperatingColumns] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('shipyard.ui.servers.operatingColumns') || '{}');
      return { state: saved?.state !== false, contact: saved?.contact !== false, owner: saved?.owner === true };
    } catch { return { state: true, contact: true, owner: false }; }
  });
  const toggleOperatingColumn = (column: 'state' | 'contact' | 'owner') => {
    setOperatingColumns(current => {
      const next = { ...current, [column]: !current[column] };
      try { localStorage.setItem('shipyard.ui.servers.operatingColumns', JSON.stringify(next)); } catch { /* Optional browser preference. */ }
      return next;
    });
  };
  // The navigator already owns the hierarchy.  Keep the main resource area
  // as a flat, scan-friendly inventory unless an administrator explicitly
  // asks to inspect the folder structure in table form.
  const [groupedView, setGroupedView] = useState(
    () => localStorage.getItem("shipyard-next.server-grouped-view") === "true",
  );
  const [search, setSearch] = useState(
    () => localStorage.getItem("shipyard-next.server-search") || "",
  );
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkGroupId, setBulkGroupId] = useState("");
  const [bulkAction, setBulkAction] = useState<{kind:'update'|'move'; environmentId:string; targets:ServerRow[]; groupId?:string|null; groupName?:string} | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(loadCollapsedGroups);
  const [groupDialog, setGroupDialog] = useState<{
    open: boolean;
    title: string;
    confirmText: string;
    name?: string;
    color?: string;
    parentId?: string | null;
    editId?: string | null;
  }>({ open: false, title: "", confirmText: "" });
  const [moveFor, setMoveFor] = useState<string | null>(null);
  const moveRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    if (activeTag) localStorage.setItem("shipyard-next.server-tag", activeTag);
    else localStorage.removeItem("shipyard-next.server-tag");
  }, [activeTag]);
  useEffect(() => {
    localStorage.setItem("shipyard-next.server-search", search);
  }, [search]);
  useEffect(() => {
    localStorage.setItem("shipyard-next.server-status", activeStatus);
  }, [activeStatus]);
  useEffect(() => {
    localStorage.setItem("shipyard-next.server-group", activeGroup);
  }, [activeGroup]);
  useEffect(() => {
    localStorage.setItem(
      "shipyard-next.server-grouped-view",
      String(groupedView),
    );
  }, [groupedView]);
  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey)
        return;
      if (!window.matchMedia("(min-width: 640px)").matches) return;
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, select, [contenteditable="true"]'))
        return;
      event.preventDefault();
      searchInputRef.current?.focus();
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);
  const [sortBy, setSortBy] = useState<"name" | "status" | "ip">(() => {
    const saved = localStorage.getItem("shipyard-next.server-sort");
    return saved === "status" || saved === "ip" ? saved : "name";
  });
  useEffect(() => {
    localStorage.setItem("shipyard-next.server-sort", sortBy);
  }, [sortBy]);

  // A dashboard severity drill-down is an explicit scope, so stale local
  // search/tag/folder preferences must not silently hide counted hosts.
  useEffect(() => {
    if (!routeSearch.severity) return;
    setSeverity(routeSearch.severity);
    setSearch(''); setActiveTag(null); setActiveStatus('all'); setActiveGroup('all');
    setNeedsAttention(false); setNeedsUpdates(false); setPage(1);
  }, [routeSearch.severity]);

  // ── Derived data ────────────────────────────────────────────
  const allTags = useMemo(
    () => [...new Set(servers.flatMap((s) => s.tags || []))].sort(),
    [servers],
  );
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return servers.filter((server) => {
      const matchesTag = !activeTag || (server.tags || []).includes(activeTag);
      const matchesStatus =
        activeStatus === "all" || server.status === activeStatus;
      const matchesUpdates = !needsUpdates || Number(server.updates_count ?? 0) > 0 || Number(server.image_updates_count ?? 0) > 0 || Number(server.custom_updates_count ?? 0) > 0;
      const matchesSeverity = severity === 'all' || server.attention?.severity === severity;
      const matchesAttention = !needsAttention || server.attention?.requiresAttention === true;
      const scopedGroups =
        activeGroup === "all" || activeGroup === "__ungrouped__"
          ? undefined
          : getDescendantIds(groups, activeGroup);
      const matchesGroup =
        activeGroup === "all" ||
        (activeGroup === "__ungrouped__"
          ? !server.group_id
          : scopedGroups?.has(String(server.group_id)));
      const haystack = [server.name, server.ip_address, ...(server.tags || [])]
        .join(" ")
        .toLowerCase();
      return (
        matchesTag &&
        matchesStatus &&
        matchesUpdates &&
        matchesAttention &&
        matchesSeverity &&
        matchesGroup &&
        (!query || haystack.includes(query))
      );
    });
  }, [servers, groups, activeTag, activeStatus, activeGroup, search, needsUpdates, needsAttention, severity]);
  const sortedServers = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        if (sortBy === "status") {
          const rank = (status?: string) =>
            status === "offline" ? 0 : status === "unknown" ? 1 : 2;
          return (
            rank(a.status) - rank(b.status) || a.name.localeCompare(b.name)
          );
        }
        if (sortBy === "ip")
          return (
            String(a.ip_address || "").localeCompare(
              String(b.ip_address || ""),
            ) || a.name.localeCompare(b.name)
          );
        return a.name.localeCompare(b.name);
      }),
    [filtered, sortBy],
  );
  const useGroups = groupedView && groups.length > 0;

  const totalPages = useGroups
    ? 1
    : Math.max(1, Math.ceil(sortedServers.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageServers = useGroups
    ? sortedServers
    : sortedServers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const onlineCount = servers.filter((s) => s.status === "online").length;
  const offlineCount = servers.filter((s) => s.status === "offline").length;
  const showFolderColumn = servers.some((server) => Boolean(server.group_id));
  const showTagColumn = servers.some((server) => (server.tags || []).length > 0);
  const tableColumnCount = 5 + Number(operatingColumns.state) + Number(operatingColumns.contact) + Number(operatingColumns.owner) + Number(showFolderColumn) + Number(showTagColumn);

  // Load server info for visible rows
  const visibleIds = useMemo(() => {
    if (useGroups) return sortedServers.map((s) => s.id);
    return pageServers.map((s) => s.id);
  }, [useGroups, sortedServers, pageServers]);
  const { infoMap, loadInfos } = useServerInfoMap(visibleIds);

  // ── Mutations ───────────────────────────────────────────────
  const invalidateAll = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["servers"] });
    void qc.invalidateQueries({ queryKey: ["server-groups"] });
    // The dashboard owns a separate aggregate request. Keep it in lockstep
    // with inventory changes so deleted or newly imported hosts never remain
    // on the landing page until its periodic refresh happens.
    void qc.invalidateQueries({ queryKey: ["dashboard"] });
  }, [qc]);

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.deleteServer(id),
    onSuccess: () => {
      showToast(t("srv.deleted"), "success");
      invalidateAll();
    },
    onError: (e: Error) =>
      showToast(t("common.errorPrefix", { msg: e.message }), "error"),
  });

  const bulkDeleteMut = useMutation({
    mutationFn: async ({targets, environmentId: targetEnvironment}: {targets:DeleteHostTarget[]; environmentId:string}) => {
      if (targetEnvironment !== useUi.getState().environmentId) throw new Error('Environment changed. Select the hosts again.');
      const outcomes=await deleteHostBatch(targets,id=>api.deleteServer(id,targetEnvironment));
      const deletedIds=outcomes.filter(row=>row.deleted).map(row=>row.id);
      return {environmentId:targetEnvironment, outcomes, completedAt:new Date().toISOString(), deletedIds, deleted:deletedIds.length, failed:outcomes.length-deletedIds.length};
    },
    onSuccess: ({ deleted, failed, deletedIds, environmentId: targetEnvironment }) => {
      if (deleted)
        showToast(
          `${deleted} host${deleted === 1 ? "" : "s"} deleted.${failed ? ` ${failed} could not be deleted.` : ""}`,
          failed ? "warning" : "success",
        );
      else showToast("The selected hosts could not be deleted.", "error");
      if (useUi.getState().environmentId === targetEnvironment) {
        setSelectedIds(previous => new Set([...previous].filter(id=>!deletedIds.includes(id))));
      }
      invalidateAll();
    },
    onError: (error: Error) =>
      showToast(t("common.errorPrefix", { msg: error.message }), "error"),
  });

  const moveMut = useMutation({
    mutationFn: ({
      serverId,
      groupId,
    }: {
      serverId: string;
      groupId: string | null;
    }) => api.setServerGroup(serverId, groupId),
    onSuccess: (_, { groupId }) => {
      if (groupId) {
        const grp = groups.find((g) => g.id === groupId);
        showToast(t("srv.movedTo", { group: grp?.name || groupId }), "success");
      } else {
        showToast(t("srv.movedOut"), "success");
      }
      invalidateAll();
    },
    onError: (e: Error) =>
      showToast(t("common.errorPrefix", { msg: e.message }), "error"),
  });

  const bulkMoveMut = useMutation({
    mutationFn: ({
      serverIds,
      groupId,
      environmentId: targetEnvironment,
    }: {
      serverIds: string[];
      groupId: string | null;
      environmentId: string;
    }) => {
      if (targetEnvironment !== useUi.getState().environmentId) throw new Error('Environment changed. Review the targets again.');
      return api.setServersGroup(serverIds, groupId, targetEnvironment);
    },
    onSuccess: (_, { groupId, serverIds, environmentId: targetEnvironment }) => {
      const group = groups.find((item) => item.id === groupId);
      showToast(
        groupId
          ? `${serverIds.length} managed ${serverIds.length === 1 ? "host" : "hosts"} moved to “${group?.name || groupId}”.`
          : `${serverIds.length} hosts removed from folders.`,
        "success",
      );
      if (useUi.getState().environmentId === targetEnvironment) {
        setSelectedIds(previous=>new Set([...previous].filter(id=>!serverIds.includes(id))));
        setBulkGroupId("");
      }
      invalidateAll();
    },
    onError: (error: Error) =>
      showToast(t("common.errorPrefix", { msg: error.message }), "error"),
  });

  const groupCreateMut = useMutation({
    mutationFn: (data: {
      name: string;
      color: string;
      parentId: string | null;
      environmentId: string;
    }) =>
      api.createServerGroup(
        data.name,
        data.color,
        data.parentId,
        data.environmentId,
      ),
    onSuccess: () => {
      showToast(t("srv.folderCreated"), "success");
      invalidateAll();
    },
    onError: (e: Error) =>
      showToast(t("common.errorPrefix", { msg: e.message }), "error"),
  });

  const groupUpdateMut = useMutation({
    mutationFn: (data: {
      id: string;
      name: string;
      color: string;
      parentId: string | null;
      environmentId: string;
    }) =>
      api.updateServerGroup(data.id, data.name, data.color, data.environmentId, data.parentId),
    onSuccess: () => {
      showToast(t("srv.folderUpdated"), "success");
      invalidateAll();
    },
    onError: (e: Error) =>
      showToast(t("common.errorPrefix", { msg: e.message }), "error"),
  });

  const groupDeleteMut = useMutation({
    mutationFn: (id: string) => api.deleteServerGroup(id),
    onSuccess: () => {
      showToast(t("srv.folderDeleted"), "success");
      invalidateAll();
    },
    onError: (e: Error) =>
      showToast(t("common.errorPrefix", { msg: e.message }), "error"),
  });

  const autoGroupMut = useMutation({
    mutationFn: () =>
      api.autoGroupByTags() as Promise<{ moved: number; matched: number }>,
    onSuccess: (result) => {
      if (result.moved > 0)
        showToast(
          t("srv.autoGroupDone", {
            moved: result.moved,
            matched: result.matched,
          }),
          "success",
        );
      else showToast(t("srv.autoGroupNone"), "info");
      invalidateAll();
    },
    onError: (e: Error) =>
      showToast(t("common.errorPrefix", { msg: e.message }), "error"),
  });

  const importMut = useMutation({
    mutationFn: (servers: Record<string, unknown>[]) =>
      api.importServers(servers) as Promise<{
        created: number;
        skipped: number;
      }>,
    onSuccess: (result) => {
      showToast(
        t("srv.importDone", {
          created: result.created,
          skipped: result.skipped,
        }),
        result.created > 0 ? "success" : "info",
      );
      if (result.created > 0) {
        setPage(1);
        invalidateAll();
      }
    },
    onError: (e: Error) =>
      showToast(t("common.errorPrefix", { msg: e.message }), "error"),
  });

  // ── Playbook run dialog state ─────────────────────────────
  const [playbookDialogOpen, setPlaybookDialogOpen] = useState(false);
  const [selectedPlaybook, setSelectedPlaybook] = useState("");
  const [playbookTargets, setPlaybookTargets] = useState<string[]>([]);
  const [playbookUseAll, setPlaybookUseAll] = useState(false);
  const [playbookExcluded, setPlaybookExcluded] = useState<Set<string>>(
    new Set(),
  );
  const [playbookExtraVars, setPlaybookExtraVars] = useState("");
  const [confirmDeleteServer, setConfirmDeleteServer] =
    useState<ServerRow | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState<{environmentId:string; targets:ServerRow[]} | null>(null);
  useEffect(() => {
    setSelectedIds(new Set());
    setConfirmBulkDelete(null);
    bulkDeleteMut.reset();
    bulkMoveMut.reset();
    setBulkAction(null);
    setPlaybookDialogOpen(false);
    setBulkGroupId('');
  }, [environmentId]);
  const [confirmDeleteGroup, setConfirmDeleteGroup] =
    useState<ServerGroup | null>(null);
  const playbooksQuery = useQuery({
    queryKey: ["playbooks"],
    queryFn: () =>
      api.getPlaybooks() as Promise<
        {
          filename: string;
          description?: string;
          isInternal?: boolean;
          [k: string]: unknown;
        }[]
      >,
    enabled: playbookDialogOpen,
  });
  const playbooks = playbooksQuery.data;

  const handleBulkRunPlaybook = useCallback(async () => {
    if (!selectedPlaybook) return;
    const names = playbookTargets;
    if (!playbookUseAll && !names.length) return;
    try {
      let extraVars: Record<string, unknown> = {};
      if (playbookExtraVars.trim()) {
        try {
          extraVars = JSON.parse(playbookExtraVars);
        } catch {
          showToast(t("run.invalidJson"), "error");
          return;
        }
      }
      const targets = playbookUseAll
        ? buildAllExceptTargets([...playbookExcluded])
        : names.join(",");
      await api.runPlaybook(selectedPlaybook, targets, extraVars);
      showToast(
        t("srv.playbookStarted", {
          playbook: selectedPlaybook,
          count: playbookUseAll
            ? servers.length - playbookExcluded.size
            : names.length,
        }),
        "success",
      );
      setPlaybookDialogOpen(false);
      setSelectedPlaybook("");
      setPlaybookTargets([]);
      setPlaybookUseAll(false);
      setPlaybookExcluded(new Set());
      setPlaybookExtraVars("");
    } catch (e: unknown) {
      showToast(
        t("common.errorPrefix", { msg: (e as Error).message }),
        "error",
      );
    }
  }, [
    playbookTargets,
    playbookUseAll,
    playbookExcluded,
    playbookExtraVars,
    selectedPlaybook,
    servers.length,
    t,
  ]);

  // ── Handlers ────────────────────────────────────────────────
  const toggleCollapsed = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      saveCollapsedGroups(next);
      return next;
    });
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(
    (checked: boolean) => {
      setSelectedIds(previous => selectHostPage(previous, pageServers.map(s=>s.id), checked));
    },
    [pageServers],
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await qc.invalidateQueries({ queryKey: ["servers"] });
      const onlineIds = visibleIds.filter((id) => {
        const s = servers.find((s) => s.id === id);
        return s?.status === "online";
      });
      await Promise.allSettled(
        onlineIds.map((id) => api.getServerInfo(id, true)),
      );
      loadInfos(onlineIds, true);
    } catch {
      /* */
    }
    setRefreshing(false);
  }, [qc, visibleIds, servers, loadInfos]);

  const handleImportFile = useCallback(
    async (file: File) => {
      const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
      const MAX_ROWS = 1000;
      if (file.size > MAX_BYTES) {
        showToast(t("srv.fileTooLarge"), "error");
        return;
      }
      const text = await file.text();
      let rows: Record<string, unknown>[] = [];
      try {
        if (file.name.endsWith(".csv")) {
          rows = parseCsvServers(text);
        } else {
          const parsed = JSON.parse(text);
          rows = Array.isArray(parsed) ? parsed : [];
        }
      } catch {
        showToast(t("srv.fileReadError"), "error");
        return;
      }
      if (rows.length === 0) {
        showToast(t("srv.noValidServers"), "error");
        return;
      }
      if (rows.length > MAX_ROWS) {
        showToast(t("srv.tooManyRows", { max: MAX_ROWS }), "error");
        return;
      }
      importMut.mutate(rows);
    },
    [importMut, t],
  );

  useEffect(() => {
    if (!playbookDialogOpen) return;
    setPlaybookTargets(
      servers.filter((s) => selectedIds.has(s.id)).map((s) => s.name),
    );
    setPlaybookUseAll(false);
    setPlaybookExcluded(new Set());
    setPlaybookExtraVars("");
  }, [playbookDialogOpen, servers, selectedIds]);

  const handleDeleteServer = useCallback(
    (id: string, name: string) => {
      setConfirmDeleteServer(
        servers.find((s) => s.id === id) ?? ({ id, name } as ServerRow),
      );
    },
    [servers],
  );

  const handleDeleteGroup = useCallback(
    (id: string, name: string) => {
      setConfirmDeleteGroup(
        groups.find((g) => g.id === id) ?? ({ id, name } as ServerGroup),
      );
    },
    [groups],
  );

  const selectedUpdateMut = useMutation({
    mutationFn: async (input: {ids:string[]; environmentId:string}) => {
      if (input.environmentId !== useUi.getState().environmentId) throw new Error('Environment changed. Review the targets again.');
      return api.runSelectedUpdates(input.ids, input.environmentId);
    },
    onSuccess: (_, input) => showToast(t('srv.updatesStarted', {count:input.ids.length}), 'success'),
    onError: (error:Error) => showToast(error.message, 'error'),
  });

  // Drag & Drop state
  const [dragItem, setDragItem] = useState<{
    type: "server" | "group";
    id: string;
  } | null>(null);
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null);

  const handleDrop = useCallback(
    async (targetGroupId: string | null) => {
      if (!dragItem) return;
      setDragOverGroup(null);
      if (dragItem.type === "server") {
        moveMut.mutate({ serverId: dragItem.id, groupId: targetGroupId });
      } else if (dragItem.type === "group") {
        if (dragItem.id === targetGroupId) return;
        if (
          targetGroupId &&
          getDescendantIds(groups, dragItem.id).has(targetGroupId)
        ) {
          showToast(t("srv.cantMoveToChild"), "warning");
          return;
        }
        try {
          await api.setGroupParent(dragItem.id, targetGroupId);
          invalidateAll();
        } catch (e: unknown) {
          showToast(
            t("common.errorPrefix", { msg: (e as Error).message }),
            "error",
          );
        }
      }
      setDragItem(null);
    },
    [dragItem, groups, moveMut, invalidateAll, t],
  );

  // ── formatLastSeen ──────────────────────────────────────────
  const fmtLastSeen = useCallback(
    (s: ServerRow): string => {
      // The green status badge already says "Online". Repeating it in the
      // adjacent metadata wastes scan space in the inventory table.
      if (s.status === "online") return "";
      if (!s.last_seen) return "";
      return formatRelativeTime(s.last_seen, t);
    },
    [t],
  );

  // ── Group dialog handler ────────────────────────────────────
  const handleGroupDialogSubmit = useCallback(
    async (data: { name: string; color: string; parentId: string | null; environmentId:string }) => {
      if(data.environmentId !== useUi.getState().environmentId) throw new Error("Environment changed. Reopen the folder form.");
      const editId = groupDialog.editId;
      if (editId) {
        await groupUpdateMut.mutateAsync({
          id: editId,
          name: data.name,
          color: data.color,
          parentId: data.parentId,
          environmentId:data.environmentId,
        });
      } else {
        await groupCreateMut.mutateAsync(data);
      }
    },
    [groupDialog.editId, groups, groupCreateMut, groupUpdateMut],
  );

  // ── Render helpers ──────────────────────────────────────────
  const allSelected =
    pageServers.length > 0 && pageServers.every((s) => selectedIds.has(s.id));
  const selectionScope = hostSelectionScope(selectedIds, pageServers.map(s=>s.id), sortedServers.map(s=>s.id));
  const selectedHosts = servers.filter(s=>selectedIds.has(s.id));
  const someSelected =
    pageServers.some((s) => selectedIds.has(s.id)) && !allSelected;

  function renderOperatingState(server: ServerRow) {
    const counts = [
      ['OS', server.updates_count, server.updates_checked_at],
      ['Images', server.image_updates_count, server.image_updates_checked_at],
      ['Custom', server.custom_updates_count, null],
    ].filter(([, value]) => value !== undefined);
    return <div className="space-y-1 text-xs">
      {server.attention?.requiresAttention && <StatusBadge tone={server.attention.severity === 'critical' ? 'danger' : 'warning'}>Needs attention</StatusBadge>}
      {server.attention?.reasons.filter(reason => !['os_updates', 'image_updates', 'custom_updates'].includes(reason.code)).map(reason => <div key={reason.code}>{inventoryAttentionReason(reason)}</div>)}
      {counts.length > 0 && <div className="flex flex-wrap gap-x-2 gap-y-1">{counts.map(([label, value, checkedAt]) => <span title={label === 'Custom' ? 'Cached custom checks; individual timestamps are in host details.' : checkedAt ? `Cached ${String(label)} check: ${formatDateTime(String(checkedAt))}` : 'No successful check timestamp reported'} key={String(label)} className="text-muted-foreground">{String(label)}: {value === null ? 'Not checked' : String(value)}</span>)}</div>}
      {!server.attention && <span className="text-muted-foreground">Not reported</span>}
    </div>;
  }

  function renderServerRow(
    s: ServerRow,
    depth = 0,
    folderColor?: string | null,
  ) {
    const info = infoMap[s.id];
    const os = info?.os?.split(" ")[0] || "—";
    const lastSeen = fmtLastSeen(s);
    const statusTone =
      s.status === "online"
        ? "success"
        : s.status === "offline"
          ? "danger"
          : "muted";
    const statusLabel =
      s.status === "online"
        ? t("common.online")
        : s.status === "offline"
          ? t("common.offline")
          : t("common.unknown");
    const group = s.group_id
      ? groups.find((item) => item.id === s.group_id)
      : undefined;

    return (
      <tr
        key={s.id}
        data-selected={selectedIds.has(s.id) || undefined}
        className="cursor-pointer border-b border-border bg-background transition-colors hover:bg-accent/45"
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", `server:${s.id}`);
          setDragItem({ type: "server", id: s.id });
        }}
        onDragEnd={() => setDragItem(null)}
        onClick={(e) => {
          if (
            (e.target as HTMLElement).closest(".srv-actions") ||
            (e.target as HTMLElement).closest(".srv-checkbox")
          )
            return;
          navigate({ to: "/servers/$id", params: { id: s.id } });
        }}
      >
        <td
          className="w-12 px-4 py-2 srv-checkbox"
          style={
            folderColor ? { borderLeft: `3px solid ${folderColor}` } : undefined
          }
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            aria-label={`Select ${s.name}`}
            className="rounded"
            checked={selectedIds.has(s.id)}
            onChange={() => toggleSelect(s.id)}
          />
        </td>
        <td
          className="px-3 py-2"
          style={{
            paddingLeft: depth > 0 ? `${14 + (depth - 1) * 14}px` : undefined,
          }}
        >
          <div className="flex items-center gap-2">
            <Link
              to="/servers/$id"
              params={{ id: s.id }}
              className="font-medium hover:underline"
            >
              {s.name}
            </Link>
          </div>
        </td>
        <td className="w-52 px-3 py-2">
          <div className="font-mono text-xs tabular-nums text-foreground/80">
            {s.ip_address || "—"}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{os}</div>
        </td>
        <td className="w-48 px-3 py-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {s.status === "online" ? (
              <span className="text-xs text-muted-foreground">{statusLabel}</span>
            ) : (
              <StatusBadge tone={statusTone} dot>{statusLabel}</StatusBadge>
            )}
            {lastSeen && (
              <span className="text-xs tabular-nums text-muted-foreground">
                {lastSeen}
              </span>
            )}
          </div>
        </td>
        {operatingColumns.state && <td className="min-w-40 px-3 py-2">{renderOperatingState(s)}</td>}
        {operatingColumns.contact && <td className="min-w-36 px-3 py-2 text-xs text-muted-foreground" title={formatDateTime(s.last_seen)}>
          {s.last_seen ? formatRelativeTime(s.last_seen, t) : 'Not reported'}
        </td>}
        {operatingColumns.owner && <td className="min-w-36 px-3 py-2 text-xs">{s.owner || <span className="text-muted-foreground">Not assigned</span>}</td>}
        {showFolderColumn && <td className="w-48 px-3 py-2">
          {group ? (
            <div className="flex min-w-0 items-center gap-1.5">
              <Folder
                className="h-3.5 w-3.5 shrink-0"
                style={{ color: group.color || undefined }}
              />
              <span className="truncate text-xs text-muted-foreground">
                {group.name}
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">No folder</span>
          )}
        </td>}
        {showTagColumn && <td className="w-56 px-3 py-2">
          <div className="flex flex-wrap gap-1">
            {(s.tags || []).length > 0 ? (
              <>
                {s.tags!.slice(0, 2).map((tag) => (
                  <Badge key={tag} variant="secondary" className="max-w-24 truncate px-1.5 py-0 text-[10px]">{tag}</Badge>
                ))}
                {s.tags!.length > 2 && <Badge variant="outline" className="px-1.5 py-0 text-[10px]">+{s.tags!.length - 2}</Badge>}
              </>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </div>
        </td>}
        <td
          className="w-28 px-4 py-2 srv-actions"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-end gap-0.5">
            {groups.length > 0 && hasCap(profile, "canEditServers") && (
              <div
                className="relative"
                ref={moveFor === s.id ? moveRef : undefined}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label={`${t("srv.moveTo")}: ${s.name}`}
                  title={t("srv.moveTo")}
                  onClick={() =>
                    setMoveFor((prev) => (prev === s.id ? null : s.id))
                  }
                >
                  <FolderTree className="h-3.5 w-3.5" />
                </Button>
                {moveFor === s.id && (
                  <MoveDropdown
                    groups={groups.filter(group=>hasHostFolderScope(profile,group.id))}
                    anchorRef={moveRef}
                    onClose={() => setMoveFor(null)}
                    onSelect={(gid) => {
                      setMoveFor(null);
                      moveMut.mutate({ serverId: s.id, groupId: gid });
                    }}
                  />
                )}
              </div>
            )}
            {(hasCap(profile, "canEditServers") || hasCap(profile, "canDeleteServers")) && (
              <OverflowMenu title={`Actions for ${s.name}`} width="w-44">
                {hasCap(profile, "canEditServers") && (
                  <OverflowItem icon={Pencil} onClick={() => navigate({ to: "/servers/$id", params: { id: s.id } })}>
                    {t("srv.edit")}
                  </OverflowItem>
                )}
                {hasCap(profile, "canDeleteServers") && (
                  <>
                    {hasCap(profile, "canEditServers") && <OverflowSep />}
                    <OverflowItem icon={Trash2} danger onClick={() => handleDeleteServer(s.id, s.name)}>
                      {t("srv.delete")}
                    </OverflowItem>
                  </>
                )}
              </OverflowMenu>
            )}
          </div>
        </td>
      </tr>
    );
  }

  function renderGroupRow(
    node: GroupNode,
    depth: number,
    serversByGroup: Record<string, ServerRow[]>,
  ) {
    const members = serversByGroup[node.id] || [];
    const isCollapsed = collapsed.has(node.id);
    const color = node.color || PRESET_COLORS[0];
    const matchingIds = groupHostIds(node, serversByGroup);
    const selectedCount = matchingIds.filter(id=>selectedIds.has(id)).length;
    const total = matchingIds.length;
    const isDragOver = dragOverGroup === node.id;

    return (
      <Fragment key={`group-${node.id}`}><tbody>
        <tr
          className={`group-row cursor-pointer border-y border-border bg-muted/35 hover:bg-accent/30 ${isDragOver ? "!bg-accent/50" : ""}`}
          onClick={() => toggleCollapsed(node.id)}
          draggable={hasCap(profile, "canEditServers")}
          onDragStart={(e) => {
            e.stopPropagation();
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", `group:${node.id}`);
            setDragItem({ type: "group", id: node.id });
          }}
          onDragEnd={() => setDragItem(null)}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            setDragOverGroup(node.id);
          }}
          onDragLeave={(e) => {
            if (
              !(e.currentTarget as HTMLElement).contains(
                e.relatedTarget as Node,
              )
            )
              setDragOverGroup(null);
          }}
          onDrop={(e) => {
            e.preventDefault();
            handleDrop(node.id);
          }}
        >
          <td colSpan={tableColumnCount - 1} style={{ borderLeft: `3px solid ${color}` }}>
            <div
              className="flex items-center gap-2 py-1.5"
              style={{ paddingLeft: `${12 + depth * 20}px` }}
            >
              <input type="checkbox" className="shrink-0" style={{marginInline:0}} aria-label={`Select matching hosts in ${node.name} and subfolders`}
                checked={total > 0 && selectedCount === total} disabled={total === 0}
                ref={element=>{if(element) element.indeterminate=selectedCount > 0 && selectedCount < total;}}
                onClick={event=>event.stopPropagation()}
                onChange={event=>{const checked=event.target.checked;setSelectedIds(previous=>selectHostPage(previous,matchingIds,checked));}}
              />
              <button type="button" className="flex min-w-0 items-center gap-2 text-left" aria-expanded={!isCollapsed}
                aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} folder ${node.name}`}
                onClick={event=>{event.stopPropagation();toggleCollapsed(node.id);}}>
              {isCollapsed ? (
                <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              ) : (
                <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              )}
              {isCollapsed ? (
                <Folder className="h-4 w-4 flex-shrink-0" style={{ color }} />
              ) : (
                <FolderOpen
                  className="h-4 w-4 flex-shrink-0"
                  style={{ color }}
                />
              )}
              <span className="font-medium text-sm">{node.name}</span>
              <Badge variant="secondary" className="text-[10px] ml-1">
                {total}
              </Badge>
              {selectedCount > 0 && <span className="text-xs text-muted-foreground">{selectedCount} selected</span>}
              </button>
            </div>
          </td>
          <td
            className="w-28 px-3 py-1.5 srv-actions"
            onClick={(e) => e.stopPropagation()}
          >
            {hasHostFolderScope(profile,node.id) && (hasCap(profile,'canEditServers') || hasCap(profile,'canDeleteServers')) && <OverflowMenu title={`Actions for ${node.name}`} width="w-52">
              {hasCap(profile, "canEditServers") && hasHostFolderScope(profile,node.id) && (
                <OverflowItem
                  icon={FolderPlus}
                  onClick={() =>
                    setGroupDialog({
                      open: true,
                      title: t("srv.newSubfolderIn", { parent: node.name }),
                      confirmText: t("common.create"),
                      parentId: node.id,
                      editId: null,
                    })
                  }
                >
                  {t("srv.createSubfolder")}
                </OverflowItem>
              )}
              {hasCap(profile, "canEditServers") && (
                <OverflowItem
                  icon={Pencil}
                  onClick={() =>
                    setGroupDialog({
                      open: true,
                      title: t("srv.editFolderTitle"),
                      confirmText: t("common.save"),
                      name: node.name,
                      color: node.color,
                      parentId: node.parent_id,
                      editId: node.id,
                    })
                  }
                >
                  {t("srv.editFolder")}
                </OverflowItem>
              )}
              {hasCap(profile, "canDeleteServers") && (
                <>
                  <OverflowSep />
                  <OverflowItem
                    icon={Trash2}
                    danger
                    onClick={() => handleDeleteGroup(node.id, node.name)}
                  >
                    {t("srv.deleteFolder")}
                  </OverflowItem>
                </>
              )}
            </OverflowMenu>}
          </td>
        </tr>
        {!isCollapsed && (
          <>
            {members.length === 0 && node.children.length === 0 && (
              <tr>
                <td colSpan={tableColumnCount}>
                  <div
                    className="flex items-center gap-1.5 text-muted-foreground text-xs py-1.5"
                    style={{ paddingLeft: `${34 + depth * 20}px` }}
                  >
                    <Info className="h-3 w-3" /> {t("srv.emptyGroup")}
                  </div>
                </td>
              </tr>
            )}
            {members.map((s) => renderServerRow(s, depth + 1, color))}
          </>
        )}
      </tbody>
      {!isCollapsed && node.children.map(child=>renderGroupRow(child,depth+1,serversByGroup))}
      </Fragment>
    );
  }

  // ── Build grouped content ───────────────────────────────────
  const serversByGroup = useMemo(() => {
    const map: Record<string, ServerRow[]> = {};
    const ungrouped: ServerRow[] = [];
    for (const s of sortedServers) {
      const gid = s.group_id;
      if (gid && groups.find((g) => g.id === gid)) {
        (map[gid] = map[gid] || []).push(s);
      } else {
        ungrouped.push(s);
      }
    }
    return { map, ungrouped };
  }, [sortedServers, groups]);

  const tree = useMemo(() => buildGroupTree(groups), [groups]);
  const activeFilterCount =
    Number(activeStatus !== "all") +
    Number(activeGroup !== "all") +
    Number(Boolean(activeTag)) +
    Number(needsUpdates) +
    Number(needsAttention) + Number(severity !== 'all');

  // ═══════════════════════════════════════════════════════════
  // ─── JSX ──────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={t("srv.resourceTitle")}
        description={`${t("srv.count", { total: servers.length, online: onlineCount, offline: offlineCount })}${activeTag ? ` · ${t("srv.filtered", { tag: activeTag })}` : ""}${search || activeFilterCount > 0 ? ` · ${t("srv.results", { count: filtered.length })}` : ""}`}
        actions={
          <>
            {servers.length > 0 && hasCap(profile, "canAddServers") && (
              <CreateServerDialog />
            )}
            <div className="relative hidden w-52 sm:block">
              <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                className="h-8 pl-8 pr-7 text-xs"
                placeholder={t("srv.searchServers")}
                aria-label={t("srv.searchServers")}
              />
              {!search && (
                <span className="pointer-events-none absolute right-2 top-1.5 kbd">
                  /
                </span>
              )}
            </div>
            <Button
              type="button"
              variant={activeFilterCount > 0 ? "secondary" : "outline"}
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => setFiltersOpen((open) => !open)}
              aria-expanded={filtersOpen}
            >
              <Filter className="h-3.5 w-3.5" />
              {t("srv.filters")}{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </Button>
            <OverflowMenu title={t("srv.resourceOptions")}>
              <OverflowItem onClick={() => toggleOperatingColumn('state')}>{operatingColumns.state ? 'Hide' : 'Show'} operating state column</OverflowItem>
              <OverflowItem onClick={() => toggleOperatingColumn('contact')}>{operatingColumns.contact ? 'Hide' : 'Show'} last contact column</OverflowItem>
              <OverflowItem onClick={() => toggleOperatingColumn('owner')}>{operatingColumns.owner ? 'Hide' : 'Show'} owner column</OverflowItem>
              <OverflowSep />
              <OverflowItem icon={RefreshCw} onClick={handleRefresh} disabled={refreshing}>
                {t("common.refresh")}
              </OverflowItem>
              <OverflowSep />
              <OverflowItem
                icon={FolderTree}
                onClick={() => setGroupedView((view) => !view)}
                disabled={groups.length === 0}
              >
                {t(groupedView ? "srv.flatList" : "srv.folderView")}
              </OverflowItem>
              <OverflowSep />
              <div className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t("srv.sort")}
              </div>
              <div className="grid grid-cols-3 gap-1 px-1 pb-1">
                {(
                  [
                    ["name", t("dash.sortName")],
                    ["status", t("dash.sortStatus")],
                    ["ip", t("dash.sortIp")],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setSortBy(value);
                      setPage(1);
                    }}
                    className={`rounded px-1.5 py-1.5 text-xs font-medium ${sortBy === value ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <OverflowSep />
              {hasCap(profile, "canEditServers") && hasHostFolderScope(profile,null) && (
                <OverflowItem
                  icon={FolderPlus}
                  onClick={() =>
                    setGroupDialog({
                      open: true,
                      title: t("srv.createFolder"),
                      confirmText: t("common.create"),
                      editId: null,
                    })
                  }
                >
                  {t("srv.folder")}
                </OverflowItem>
              )}
              {hasCap(profile, "canEditServers") && (
                <OverflowItem icon={Tags} onClick={() => autoGroupMut.mutate()}>
                  {t("srv.autoGroupFromTags")}
                </OverflowItem>
              )}
              {hasCap(profile, "canExportImportServers") && (
                <>
                  <OverflowSep />
                  <OverflowItem
                    icon={FileJson}
                    onClick={() =>
                      api
                        .exportServers("json")
                        .catch((e: Error) =>
                          showToast(
                            t("common.errorPrefix", { msg: e.message }),
                            "error",
                          ),
                        )
                    }
                  >
                    {t("srv.export")} JSON
                  </OverflowItem>
                  <OverflowItem
                    icon={FileSpreadsheet}
                    onClick={() =>
                      api
                        .exportServers("csv")
                        .catch((e: Error) =>
                          showToast(
                            t("common.errorPrefix", { msg: e.message }),
                            "error",
                          ),
                        )
                    }
                  >
                    {t("srv.export")} CSV
                  </OverflowItem>
                  <OverflowItem
                    icon={FileUp}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {t("srv.import")}
                  </OverflowItem>
                </>
              )}
            </OverflowMenu>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImportFile(f);
                e.target.value = "";
              }}
            />
          </>
        }
      />

      {groupsQuery.isError && (
        <QueryErrorState
          compact
          error={groupsQuery.error}
          onRetry={() => {
            void groupsQuery.refetch();
          }}
          title="Host folders could not be loaded"
        />
      )}

      <div className="flex gap-2 sm:hidden">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            className="pl-9"
            placeholder={t("srv.searchServers")}
            aria-label={t("srv.searchServers")}
          />
        </div>
        <Button
          type="button"
          variant={activeFilterCount > 0 ? "secondary" : "outline"}
          size="sm"
          onClick={() => setFiltersOpen((open) => !open)}
          aria-label={t("srv.openFilters")}
          aria-expanded={filtersOpen}
        >
          <Filter className="h-4 w-4" />
          {t("srv.filters")}{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
        </Button>
      </div>

      {profile && (profile.id != null || profile.username) && <SavedHostViews
        key={savedViewKey(String(profile.id ?? profile.username), environmentId)}
        storageKey={savedViewKey(String(profile.id ?? profile.username), environmentId)}
        current={{ search, tag: activeTag, status: activeStatus, group: activeGroup, updates: needsUpdates, attention: needsAttention, severity, grouped: groupedView, sort: sortBy, columns: operatingColumns }}
        onApply={view => {
          setSearch(view.search); setActiveTag(view.tag); setActiveStatus(view.status); setActiveGroup(view.group);
          setNeedsUpdates(view.updates); setNeedsAttention(view.attention); setSeverity(view.severity || 'all'); setGroupedView(view.grouped); setSortBy(view.sort);
          setOperatingColumns(view.columns); setPage(1); setSelectedIds(new Set());
        }}
      />}

      {bulkDeleteMut.isSuccess && bulkDeleteMut.data.environmentId === environmentId && hasCap(profile,'canDeleteServers') && <BulkDeleteResult
        outcomes={bulkDeleteMut.data.outcomes} completedAt={bulkDeleteMut.data.completedAt}
        onDismiss={()=>bulkDeleteMut.reset()}
        onSelectFailed={()=>{
          const available=new Set(servers.map(host=>host.id));
          setSelectedIds(new Set(bulkDeleteMut.data.outcomes.filter(row=>!row.deleted && available.has(row.id)).map(row=>row.id)));
        }}
      />}

      {bulkMoveMut.isError && bulkMoveMut.variables?.environmentId === environmentId && hasCap(profile,'canEditServers') && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/30 p-3 text-sm">
        <p>Last move request failed: {bulkMoveMut.error.message}</p>
        <Button size="sm" variant="ghost" onClick={()=>bulkMoveMut.reset()}>Dismiss move error</Button>
      </div>}

      {/* Bulk bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-panel border border-primary/25 bg-primary/[0.04] px-4 py-2.5 shadow-[0_1px_2px_hsl(var(--foreground)/0.045)] animate-in fade-in slide-in-from-top-1 duration-200">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            {t("srv.selected", { count: selectedIds.size })}
          </span>
          <details className="text-xs">
            <summary className="cursor-pointer">Review {selectedIds.size} selected hosts</summary>
            <p className="mt-2 text-muted-foreground">{selectionScope.onPage} on this page · {selectionScope.otherPages} on other pages · {selectionScope.outsideFilter} outside current filters. Actions use the entire selection.</p>
            <ul className="mt-2 max-h-40 overflow-auto space-y-1">{selectedHosts.map(host=><li key={host.id}>{host.name} · <span className="font-mono">{host.ip_address}</span></li>)}</ul>
            {selectedHosts.length !== selectedIds.size && <p className="text-warning">Some selected hosts are no longer available. Clear the selection and select the current targets.</p>}
          </details>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            {hasCap(profile, "canRunUpdates") && (
              <Button size="sm" disabled={selectedUpdateMut.isPending || selectedHosts.length !== selectedIds.size} onClick={()=>setBulkAction({kind:'update',environmentId,targets:selectedHosts.map(host=>({...host}))})}>
                <Download className="h-3.5 w-3.5 mr-1" />{" "}
                {t("srv.startUpdates")}
              </Button>
            )}
            {hasCap(profile, "canRunPlaybooks") && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPlaybookDialogOpen(true)}
              >
                <Play className="h-3.5 w-3.5 mr-1" /> {t("srv.runPlaybook")}
              </Button>
            )}
            {hasCap(profile, 'canEditServers') && <div className="flex items-center gap-1.5">
              <select
                value={bulkGroupId}
                onChange={(event) => setBulkGroupId(event.target.value)}
                aria-label="Move selected hosts to folder"
                className="h-8 max-w-48 rounded-md border bg-background px-2 text-xs"
              >
                <option value="">Move to folder…</option>
                <option value="__root__">No folder</option>
                {groups.filter(group=>hasHostFolderScope(profile,group.id)).map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                variant="outline"
                disabled={!bulkGroupId || (bulkGroupId !== '__root__' && !groups.some(group=>group.id===bulkGroupId)) || bulkMoveMut.isPending || selectedHosts.length !== selectedIds.size}
                onClick={() =>
                  setBulkAction({kind:'move',environmentId,targets:selectedHosts.map(host=>({...host})),groupId:bulkGroupId === '__root__' ? null : bulkGroupId,groupName:bulkGroupId === '__root__' ? 'No folder' : groups.find(group=>group.id===bulkGroupId)?.name || bulkGroupId})
                }
              >
                <Folder className="h-3.5 w-3.5" />
                Move
              </Button>
            </div>}
            {hasCap(profile, "canDeleteServers") && (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={bulkDeleteMut.isPending || selectedHosts.length !== selectedIds.size}
                onClick={() => setConfirmBulkDelete({environmentId, targets:selectedHosts.map(host=>({...host}))})}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            )}
            <div className="h-5 w-px bg-border" />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds(new Set())}
            >
              <X className="h-3.5 w-3.5 mr-1" /> {t("srv.deselect")}
            </Button>
          </div>
        </div>
      )}

      {/* Filters are intentionally secondary: search remains the default tool. */}
      {filtersOpen && (
        <div
          className="flex flex-wrap items-center gap-2 rounded-panel border border-border-strong/80 bg-card px-3 py-2.5"
          aria-label={t("srv.filterTags")}
        >
          <span className="section-label mr-1 flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5" /> {t("srv.filters")}
          </span>
          <select
            value={activeStatus}
            onChange={(event) => {
              setActiveStatus(event.target.value as typeof activeStatus);
              setPage(1);
            }}
            aria-label={t("srv.filterStatus")}
            className="h-8 rounded-md border bg-background px-2 text-xs text-muted-foreground"
          >
            <option value="all">{t("srv.statusAll")}</option>
            <option value="online">{t("common.online")}</option>
            <option value="offline">{t("common.offline")}</option>
            <option value="unknown">{t("common.unknown")}</option>
          </select>
          <select aria-label="Attention severity" value={severity} onChange={event => { setSeverity(event.target.value as typeof severity); setPage(1); }} className="h-8 rounded-md border bg-background px-2 text-xs text-muted-foreground">
            <option value="all">All severities</option>
            <option value="critical">Critical hosts</option>
            <option value="warning">Warning hosts</option>
          </select>
          <button type="button" aria-pressed={needsAttention} onClick={() => { setNeedsAttention(value => !value); setPage(1); }} className={`h-8 rounded-md border px-2 text-xs ${needsAttention ? "border-primary/35 bg-primary/10 text-foreground" : "bg-background text-muted-foreground"}`}>
            {t("srv.attentionOnly")}
          </button>
          <button type="button" aria-pressed={needsUpdates} onClick={() => { setNeedsUpdates(value => !value); setPage(1); }} className={`h-8 rounded-md border px-2 text-xs ${needsUpdates ? "border-primary/35 bg-primary/10 text-foreground" : "bg-background text-muted-foreground"}`}>
            {t("srv.updatesOnly")}
          </button>
          {groups.length > 0 && (
            <select
              value={activeGroup}
              onChange={(event) => {
                setActiveGroup(event.target.value);
                setPage(1);
              }}
              aria-label={t("srv.filterGroup")}
              className="h-8 max-w-52 rounded-md border bg-background px-2 text-xs text-muted-foreground"
            >
              <option value="all">{t("srv.groupAll")}</option>
              <option value="__ungrouped__">{t("srv.moveToRoot")}</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          )}
          {allTags.length > 0 && (
            <select
              value={activeTag || ""}
              onChange={(event) => {
                setActiveTag(event.target.value || null);
                setPage(1);
              }}
              aria-label={t("srv.filterTags")}
              className="h-8 max-w-52 rounded-md border bg-background px-2 text-xs text-muted-foreground"
            >
              <option value="">{t("srv.allTags")}</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <ActiveFilterChips
        filters={[
          ...(activeStatus !== "all" ? [{
            id: "status",
            label: t("srv.statusFilter", { value: activeStatus === "online" ? t("common.online") : activeStatus === "offline" ? t("common.offline") : t("common.unknown") }),
            onRemove: () => { setActiveStatus("all"); setPage(1); },
          }] : []),
          ...(activeGroup !== "all" ? [{
            id: "group",
            label: t("srv.folderFilter", { value: activeGroup === "__ungrouped__" ? t("srv.moveToRoot") : groups.find((group) => group.id === activeGroup)?.name || activeGroup }),
            onRemove: () => { setActiveGroup("all"); setPage(1); },
          }] : []),
          ...(activeTag ? [{
            id: "tag",
            label: t("srv.tagFilter", { value: activeTag }),
            onRemove: () => { setActiveTag(null); setPage(1); },
          }] : []),
          ...(severity !== 'all' ? [{
            id: 'severity', label: severity === 'critical' ? 'Critical hosts' : 'Warning hosts',
            onRemove: () => { setSeverity('all'); setPage(1); },
          }] : []),
          ...(needsAttention ? [{
            id: "attention",
            label: t("srv.attentionOnly"),
            onRemove: () => { setNeedsAttention(false); setPage(1); },
          }] : []),
          ...(needsUpdates ? [{
            id: "updates",
            label: t("srv.updatesOnly"),
            onRemove: () => { setNeedsUpdates(false); setPage(1); },
          }] : []),
        ]}
        onClear={() => {
          setActiveTag(null);
          setActiveStatus("all");
          setActiveGroup("all");
          setNeedsAttention(false);
          setSeverity('all');
          setNeedsUpdates(false);
          setPage(1);
        }}
        clearLabel={t("srv.resetFilters")}
      />

      {/* Main table card */}
      <Card className="border-strong shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonRow key={i} cols={7} />
              ))}
            </div>
          ) : serversFailed ? (
            <QueryErrorState
              compact
              error={serversError}
              onRetry={() => {
                void refetchServers();
              }}
              title={t("srv.hostsLoadFailed")}
            />
          ) : servers.length === 0 ? (
            <EmptyState
              icon={<ServerIcon className="h-5 w-5" />}
              title={t("srv.noServers")}
              description={t("srv.noServersHint")}
              action={
                hasCap(profile, "canAddServers") ? (
                  <CreateServerDialog />
                ) : undefined
              }
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              compact
              icon={<Search className="h-5 w-5" />}
              title={t("srv.noMatchingServers")}
              description={t("srv.noMatchingServersHint")}
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActiveTag(null);
                    setActiveStatus("all");
                    setActiveGroup("all");
                    setNeedsAttention(false);
          setSeverity('all');
                    setNeedsUpdates(false);
                    setSearch("");
                    setPage(1);
                  }}
                >
                  {t("srv.resetFilters")}
                </Button>
              }
            />
          ) : (
            <>
              {/* Desktop table */}
              <div className="table-scroll hidden max-h-[calc(100vh-18rem)] md:block">
                <table className="w-full text-sm" data-density="compact">
                  <caption className="sr-only">
                    {t("srv.fleetHostInventory")}
                  </caption>
                  <thead className="sticky top-0 z-10 text-left">
                    <tr>
                      <th className="w-12 px-4 py-2.5">
                        <input
                          type="checkbox"
                          aria-label={useGroups ? "Select all hosts matching current filters" : "Select all hosts on this page"}
                          className="rounded"
                          checked={allSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = someSelected;
                          }}
                          onChange={(e) => selectAll(e.target.checked)}
                        />
                      </th>
                      <th className="px-3 py-2.5">{t("srv.colName")}</th>
                      <th className="w-52 px-3 py-2.5">{t("srv.colIp")}</th>
                      <th className="w-48 px-3 py-2.5">{t("common.status")}</th>
                      {operatingColumns.state && <th className="px-3 py-2.5" title="Cached update counts and current attention reasons">Operating state</th>}
                      {operatingColumns.contact && <th className="px-3 py-2.5" title="Last successful host contact; hover over a value for the time and timezone">Last contact</th>}
                      {operatingColumns.owner && <th className="px-3 py-2.5">Owner / team</th>}
                      {showFolderColumn && <th className="w-48 px-3 py-2.5">Folder</th>}
                      {showTagColumn && <th className="w-56 px-3 py-2.5">{t("srv.tags")}</th>}
                      <th className="w-24 px-4 py-2.5 text-right">
                        {t("common.actions")}
                      </th>
                    </tr>
                  </thead>
                  {useGroups ? (
                    <>
                      {/* Ungrouped */}
                      {serversByGroup.ungrouped.length > 0 && (
                        <tbody>
                          <tr
                            className="border-b border-border bg-muted/35 hover:bg-accent/30"
                            onDragOver={(e) => {
                              e.preventDefault();
                              setDragOverGroup("__root__");
                            }}
                            onDragLeave={() => setDragOverGroup(null)}
                            onDrop={(e) => {
                              e.preventDefault();
                              handleDrop(null);
                            }}
                          >
                            <td colSpan={tableColumnCount}>
                              <div
                                className={`flex items-center gap-2 px-4 py-2.5 ${dragOverGroup === "__root__" ? "bg-accent/50" : ""}`}
                              >
                                <ServerIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-muted-foreground text-sm">
                                  {t("srv.moveToRoot")}
                                </span>
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] ml-1"
                                >
                                  {serversByGroup.ungrouped.length}
                                </Badge>
                              </div>
                            </td>
                          </tr>
                          {serversByGroup.ungrouped.map((s) =>
                            renderServerRow(s),
                          )}
                        </tbody>
                      )}
                      {tree.map((node) =>
                        renderGroupRow(node, 0, serversByGroup.map),
                      )}
                    </>
                  ) : (
                    <tbody className="divide-y">
                      {pageServers.map((s) => renderServerRow(s))}
                    </tbody>
                  )}
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden">
                <div className="flex items-center gap-2 px-4 py-2 border-b">
                  <input
                    type="checkbox"
                    aria-label={useGroups ? "Select all hosts matching current filters" : "Select all hosts on this page"}
                    className="rounded"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={(e) => selectAll(e.target.checked)}
                  />
                  <span className="text-xs text-muted-foreground">
                    {useGroups ? 'All matching hosts' : 'This page'}
                  </span>
                </div>
                <div className="divide-y">
                  {pageServers.map((s) => {
                    const info = infoMap[s.id];
                    const group = s.group_id
                      ? groups.find((item) => item.id === s.group_id)
                      : undefined;
                    return (
                      <div
                        key={s.id}
                        className={`px-4 py-3 cursor-pointer hover:bg-accent/40 ${selectedIds.has(s.id) ? "bg-accent/20" : ""}`}
                        onClick={(e) => {
                          if (
                            (e.target as HTMLElement).closest(
                              'input[type="checkbox"]',
                            ) ||
                            (e.target as HTMLElement).closest("button") ||
                            (e.target as HTMLElement).closest("a")
                          )
                            return;
                          navigate({
                            to: "/servers/$id",
                            params: { id: s.id },
                          });
                        }}
                      >
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            aria-label={`Select ${s.name}`}
                            className="rounded mt-1"
                            checked={selectedIds.has(s.id)}
                            onChange={() => toggleSelect(s.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Link
                                to="/servers/$id"
                                params={{ id: s.id }}
                                className="font-medium text-sm truncate hover:underline"
                              >
                                {s.name}
                              </Link>
                              {s.status === "online" ? (
                                <span className="text-xs text-muted-foreground">{t("common.online")}</span>
                              ) : <StatusBadge tone={s.status === "offline" ? "danger" : "muted"}>
                                {s.status === "online"
                                  ? t("common.online")
                                  : s.status === "offline"
                                    ? t("common.offline")
                                    : t("common.unknown")}
                              </StatusBadge>}
                            </div>
                            {operatingColumns.state && <div className="mt-2">{renderOperatingState(s)}</div>}
                            {(s.tags || []).length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {s.tags!.slice(0, 2).map((tag) => (
                                  <Badge
                                    key={tag}
                                    variant="secondary"
                                    className="text-[10px] px-1.5 py-0"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                                {s.tags!.length > 2 && <Badge variant="outline" className="px-1.5 py-0 text-[10px]">+{s.tags!.length - 2}</Badge>}
                              </div>
                            )}
                            <div className={`grid grid-cols-2 gap-2 mt-2 text-xs text-muted-foreground ${operatingColumns.contact ? "sm:grid-cols-3" : ""}`}>
                              <div>
                                <span className="block text-[10px] uppercase">
                                  {t("srv.colIp")}
                                </span>
                                <span className="break-all font-mono">{s.ip_address || "—"}</span>
                              </div>
                              <div>
                                <span className="block text-[10px] uppercase">
                                  {t("srv.colOs")}
                                </span>
                                {info?.os?.split(" ")[0] || "—"}
                              </div>
                              {operatingColumns.contact && <div title={s.last_seen ? formatDateTime(s.last_seen) : 'No successful host contact reported'}>
                                <span className="block text-[10px] uppercase">
                                  Last contact
                                </span>
                                {s.last_seen ? formatRelativeTime(s.last_seen, t) : 'Not reported'}
                              </div>}
                              {operatingColumns.owner && <div>
                                <span className="block text-[10px] uppercase">Owner / team</span>
                                {s.owner || 'Not assigned'}
                              </div>}
                            </div>
                            {group && <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Folder
                                className="h-3.5 w-3.5 shrink-0"
                                style={{ color: group?.color || undefined }}
                              />
                              <span className="truncate">
                                {group.name}
                              </span>
                            </div>}
                          </div>
                          {(hasCap(profile, "canEditServers") || hasCap(profile, "canDeleteServers")) && (
                            <OverflowMenu title={`Actions for ${s.name}`} width="w-44">
                              {hasCap(profile, "canEditServers") && <OverflowItem icon={Pencil} onClick={() => navigate({ to: "/servers/$id", params: { id: s.id } })}>{t("srv.edit")}</OverflowItem>}
                              {hasCap(profile, "canDeleteServers") && <><OverflowSep /><OverflowItem icon={Trash2} danger onClick={() => handleDeleteServer(s.id, s.name)}>{t("srv.delete")}</OverflowItem></>}
                            </OverflowMenu>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pagination (ungrouped only) */}
              {!useGroups && totalPages > 1 && (
                <div className="flex items-center justify-between border-t bg-muted/[0.08] px-4 py-2">
                  <span className="text-xs text-muted-foreground">
                    {t("srv.pageInfo", {
                      from: (safePage - 1) * PAGE_SIZE + 1,
                      to: Math.min(safePage * PAGE_SIZE, sortedServers.length),
                      total: sortedServers.length,
                    })}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={safePage === 1}
                      onClick={() => setPage(safePage - 1)}
                    >
                      ‹
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(
                        (i) =>
                          totalPages <= 7 ||
                          Math.abs(i - safePage) <= 2 ||
                          i === 1 ||
                          i === totalPages,
                      )
                      .map((i, idx, arr) => {
                        const showEllipsis = idx > 0 && i - arr[idx - 1] > 1;
                        return (
                          <span key={i}>
                            {showEllipsis && (
                              <span className="px-1 text-muted-foreground">
                                …
                              </span>
                            )}
                            <Button
                              size="sm"
                              variant={i === safePage ? "default" : "ghost"}
                              onClick={() => setPage(i)}
                            >
                              {i}
                            </Button>
                          </span>
                        );
                      })}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={safePage === totalPages}
                      onClick={() => setPage(safePage + 1)}
                    >
                      ›
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Group dialog */}
      <GroupDialog
        environmentId={environmentId}
        open={groupDialog.open}
        onClose={() => setGroupDialog((prev) => ({ ...prev, open: false }))}
        onSubmit={handleGroupDialogSubmit}
        title={groupDialog.title}
        confirmText={groupDialog.confirmText}
        groups={groups}
        parentScope={groups.filter(group=>hasHostFolderScope(profile,group.id) || (!!groupDialog.editId && group.id===groupDialog.parentId)).map(group=>group.id)}
        editId={groupDialog.editId}
        defaultName={groupDialog.name}
        defaultColor={groupDialog.color}
        defaultParentId={groupDialog.parentId}
        allowTopLevel={!!groupDialog.editId || hasHostFolderScope(profile,null)}
      />

      {/* Playbook run dialog */}
      <Dialog
        open={playbookDialogOpen}
        onOpenChange={(v) => {
          if (!v) {
            setPlaybookDialogOpen(false);
            setSelectedPlaybook("");
            setPlaybookTargets([]);
            setPlaybookUseAll(false);
            setPlaybookExcluded(new Set());
            setPlaybookExtraVars("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("srv.runPlaybook")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("srv.runPlaybookHint", { count: selectedIds.size })}
            </p>
            <div className="space-y-1.5">
              <Label>{t("run.target")}</Label>
              <div className="flex flex-wrap gap-2 rounded-md border p-3">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={playbookUseAll}
                    onChange={(e) => {
                      setPlaybookUseAll(e.target.checked);
                      setPlaybookExcluded(new Set());
                    }}
                  />
                  {t("pb.allServers")}
                </label>
                {!playbookUseAll &&
                  playbookTargets.map((name) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs"
                    >
                      {name}
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                        aria-label={`Remove ${name} from playbook targets`}
                        title={`Remove ${name}`}
                        onClick={() =>
                          setPlaybookTargets((prev) =>
                            prev.filter((v) => v !== name),
                          )
                        }
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                {!playbookUseAll && (
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() =>
                      setPlaybookTargets(servers.map((s) => s.name))
                    }
                  >
                    {t("run.addAll")}
                  </button>
                )}
              </div>
              {playbookUseAll && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">
                    {t("run.excludeHint")}
                  </p>
                  <div className="max-h-44 overflow-y-auto rounded-md border p-2 space-y-1">
                    {servers
                      .filter((s) => s.name !== "localhost")
                      .map((s) => (
                        <label
                          key={s.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={playbookExcluded.has(s.name)}
                            onChange={(e) => {
                              setPlaybookExcluded((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(s.name);
                                else next.delete(s.name);
                                return next;
                              });
                            }}
                          />
                          <span>{s.name}</span>
                          <StatusBadge
                            tone={s.status === "online" ? "success" : "muted"}
                            className="ml-auto"
                          >
                            {s.status === "online"
                              ? t("common.online")
                              : t("common.offline")}
                          </StatusBadge>
                        </label>
                      ))}
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>{t("srv.selectPlaybook")}</Label>
              {playbooksQuery.isError && (
                <QueryErrorState
                  compact
                  error={playbooksQuery.error}
                  onRetry={() => {
                    void playbooksQuery.refetch();
                  }}
                  title="Playbooks could not be loaded"
                />
              )}
              <select
                value={selectedPlaybook}
                onChange={(e) => setSelectedPlaybook(e.target.value)}
                disabled={playbooksQuery.isPending || playbooksQuery.isError}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">{t("srv.choosePlaybook")}</option>
                {asArray<{
                  filename: string;
                  description?: string;
                  isInternal?: boolean;
                }>(playbooks)
                  .filter((p) => !p.isInternal)
                  .map((p) => (
                    <option key={p.filename} value={p.filename}>
                      {p.description || p.filename}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("run.extraVars")}</Label>
              <Input
                value={playbookExtraVars}
                onChange={(e) => setPlaybookExtraVars(e.target.value)}
                placeholder='{"key": "value"}'
                className="font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setPlaybookDialogOpen(false);
                setSelectedPlaybook("");
                setPlaybookTargets([]);
                setPlaybookUseAll(false);
                setPlaybookExcluded(new Set());
                setPlaybookExtraVars("");
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleBulkRunPlaybook}
              disabled={
                playbooksQuery.isPending ||
                playbooksQuery.isError ||
                !selectedPlaybook ||
                (!playbookUseAll && playbookTargets.length === 0)
              }
            >
              {t("srv.runPlaybook")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!bulkAction && bulkAction.environmentId === environmentId}
        onOpenChange={open=>{if (!open) setBulkAction(null);}}
        title={bulkAction?.kind === 'update' ? `Update ${bulkAction.targets.length} hosts?` : `Move ${bulkAction?.targets.length || 0} hosts?`}
        description={<div className="space-y-3">
          <p>{bulkAction?.kind === 'update' ? 'Run system package updates on these hosts. Updates can restart services and require a later reboot.' : `Move these hosts to “${bulkAction?.groupName}”.`}</p>
          <ul className="max-h-48 overflow-auto space-y-1">{bulkAction?.targets.map(host=><li key={host.id}>{host.name} · <span className="font-mono text-xs">{host.ip_address}</span></li>)}</ul>
        </div>}
        confirmLabel={bulkAction?.kind === 'update' ? 'Start updates' : 'Move hosts'}
        variant="warning"
        isPending={selectedUpdateMut.isPending || bulkMoveMut.isPending}
        onConfirm={()=>{
          if (!bulkAction || bulkAction.environmentId !== useUi.getState().environmentId) return;
          const ids=bulkAction.targets.map(host=>host.id);
          if (bulkAction.kind === 'update') selectedUpdateMut.mutate({ids,environmentId:bulkAction.environmentId});
          else if (hasCap(profile,'canEditServers')) bulkMoveMut.mutate({serverIds:ids,groupId:bulkAction.groupId || null,environmentId:bulkAction.environmentId});
        }}
      />
      <ConfirmDialog
        open={!!confirmDeleteServer}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteServer(null);
        }}
        title={t("common.delete")}
        description={
          <>
            <div>
              {t("srv.confirmDelete", {
                name: confirmDeleteServer?.name || "",
              })}
            </div>
            <div className="mt-2 text-xs">{t("srv.cantUndone")}</div>
          </>
        }
        confirmLabel={t("common.delete")}
        variant="destructive"
        confirmTextValue={confirmDeleteServer?.name || ""}
        confirmInputLabel="Confirm host name"
        onConfirm={() => {
          if (!confirmDeleteServer) return;
          deleteMut.mutate(confirmDeleteServer.id);
          setSelectedIds((prev) => {
            const n = new Set(prev);
            n.delete(confirmDeleteServer.id);
            return n;
          });
          setConfirmDeleteServer(null);
        }}
        isPending={deleteMut.isPending}
      />
      <ConfirmDialog
        open={!!confirmBulkDelete && confirmBulkDelete.environmentId === environmentId}
        onOpenChange={(open)=>{if (!open) setConfirmBulkDelete(null);}}
        title={`Delete ${confirmBulkDelete?.targets.length || 0} hosts?`}
        description={
          <>
            The selected hosts will be removed from Shipyard. External
            virtual machines or platforms are <strong>not</strong> deleted.
            <ul className="mt-3 max-h-48 overflow-auto space-y-1">{confirmBulkDelete?.targets.map(host=><li key={host.id}>{host.name} · <span className="font-mono text-xs">{host.ip_address}</span></li>)}</ul>
          </>
        }
        confirmLabel="Delete hosts"
        variant="destructive"
        confirmTextValue={`DELETE ${confirmBulkDelete?.targets.length || 0}`}
        confirmInputLabel="Confirmation"
        confirmInputHelp={
          <>
            Type{" "}
            <span className="font-mono text-foreground">
              DELETE {confirmBulkDelete?.targets.length || 0}
            </span>
            to remove these hosts.
          </>
        }
        onConfirm={() => {
          if (!confirmBulkDelete || confirmBulkDelete.environmentId !== useUi.getState().environmentId) return;
          bulkDeleteMut.mutate({targets:confirmBulkDelete.targets.map(host=>({id:host.id,name:host.name,ip_address:host.ip_address || "—"})), environmentId:confirmBulkDelete.environmentId});
        }}
        isPending={bulkDeleteMut.isPending}
      />
      <ConfirmDialog
        open={!!confirmDeleteGroup}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteGroup(null);
        }}
        title={t("common.delete")}
        description={
          <>
            <div>
              {t("srv.confirmDeleteFolder", {
                name: confirmDeleteGroup?.name || "",
              })}
            </div>
            <div className="mt-2 text-xs">{t("srv.folderNote")}</div>
          </>
        }
        confirmLabel={t("common.delete")}
        variant="destructive"
        confirmTextValue={confirmDeleteGroup?.name || ""}
        confirmInputLabel="Confirm folder name"
        onConfirm={() => {
          if (!confirmDeleteGroup) return;
          groupDeleteMut.mutate(confirmDeleteGroup.id);
          setConfirmDeleteGroup(null);
        }}
        isPending={groupDeleteMut.isPending}
      />
    </div>
  );
}
