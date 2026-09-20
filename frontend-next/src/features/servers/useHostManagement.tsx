import { useServerInfoMap } from '@/features/servers/useServerInfoMap';
import { api } from "@/lib/api";
import { useProfile } from "@/lib/queries";
import { useUi } from "@/lib/store";
import { showToast } from "@/lib/toast";
import { asArray } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { deleteHostBatch, type DeleteHostTarget } from './delete-host-batch';
import { hostSelectionScope, selectHostPage } from './host-selection';
import {
	buildGroupTree,
	formatRelativeTime,
	getDescendantIds,
	loadCollapsedGroups,
	normalizeServer,
	parseCsvServers,
	saveCollapsedGroups,
	type ServerGroup,
	type ServerRow
} from "./server-list-utils";
function buildAllExceptTargets(excluded: string[]): string {
  const unique = [
    ...new Set(excluded.map((v) => String(v || "").trim()).filter(Boolean)),
  ];
  if (unique.length === 0) return "all";
  return `all:${unique.map((v) => `!${v}`).join(":")}`;
}
const PAGE_SIZE = 20;
export function useHostManagement() {
const { t } = useTranslation();
const qc = useQueryClient();
const environmentId = useUi((s) => s.environmentId);
const { data: profile } = useProfile();
const navigate = useNavigate();
useEffect(() => {
    sessionStorage.setItem("shipyard.lastNonDetailRoute", "/servers");
  }, []);
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
useEffect(() => {
    if (!routeSearch.severity) return;
    setSeverity(routeSearch.severity);
    setSearch(''); setActiveTag(null); setActiveStatus('all'); setActiveGroup('all');
    setNeedsAttention(false); setNeedsUpdates(false); setPage(1);
  }, [routeSearch.severity]);
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
const visibleIds = useMemo(() => {
    if (useGroups) return sortedServers.map((s) => s.id);
    return pageServers.map((s) => s.id);
  }, [useGroups, sortedServers, pageServers]);
const { infoMap, loadInfos } = useServerInfoMap(visibleIds);
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
const allSelected =
    pageServers.length > 0 && pageServers.every((s) => selectedIds.has(s.id));
const selectionScope = hostSelectionScope(selectedIds, pageServers.map(s=>s.id), sortedServers.map(s=>s.id));
const selectedHosts = servers.filter(s=>selectedIds.has(s.id));
const someSelected =
    pageServers.some((s) => selectedIds.has(s.id)) && !allSelected;



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
return {
PAGE_SIZE,
t,
environmentId,
profile,
navigate,
isLoading,
serversFailed,
serversError,
refetchServers,
groupsQuery,
servers,
groups,
activeTag,
setActiveTag,
activeStatus,
setActiveStatus,
needsUpdates,
setNeedsUpdates,
severity,
setSeverity,
needsAttention,
setNeedsAttention,
activeGroup,
setActiveGroup,
filtersOpen,
setFiltersOpen,
operatingColumns,
setOperatingColumns,
toggleOperatingColumn,
groupedView,
setGroupedView,
search,
setSearch,
page,
setPage,
selectedIds,
setSelectedIds,
bulkGroupId,
setBulkGroupId,
bulkAction,
setBulkAction,
groupDialog,
setGroupDialog,
fileInputRef,
searchInputRef,
refreshing,
sortBy,
setSortBy,
allTags,
filtered,
sortedServers,
useGroups,
totalPages,
safePage,
pageServers,
onlineCount,
offlineCount,
showFolderColumn,
showTagColumn,
tableColumnCount,
infoMap,
deleteMut,
bulkDeleteMut,
bulkMoveMut,
groupDeleteMut,
autoGroupMut,
playbookDialogOpen,
setPlaybookDialogOpen,
selectedPlaybook,
setSelectedPlaybook,
playbookTargets,
setPlaybookTargets,
playbookUseAll,
setPlaybookUseAll,
playbookExcluded,
setPlaybookExcluded,
playbookExtraVars,
setPlaybookExtraVars,
confirmDeleteServer,
setConfirmDeleteServer,
confirmBulkDelete,
setConfirmBulkDelete,
confirmDeleteGroup,
setConfirmDeleteGroup,
playbooksQuery,
playbooks,
handleBulkRunPlaybook,
toggleSelect,
selectAll,
handleRefresh,
handleImportFile,
handleDeleteServer,
selectedUpdateMut,
dragOverGroup,
setDragOverGroup,
handleDrop,
handleGroupDialogSubmit,
allSelected,
selectionScope,
selectedHosts,
someSelected,
serversByGroup,
tree,
activeFilterCount,
collapsed,
moveFor,
setMoveFor,
moveRef,
moveMut,
toggleCollapsed,
handleDeleteGroup,
setDragItem,
fmtLastSeen
};
}
