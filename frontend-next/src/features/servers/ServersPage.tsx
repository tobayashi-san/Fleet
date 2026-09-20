import { CreateServerDialog } from "@/components/CreateServerDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ActiveFilterChips } from "@/components/ui/filter-chips";
import { Input } from "@/components/ui/input";
import {
	OverflowItem,
	OverflowMenu,
	OverflowSep,
} from "@/components/ui/overflow-menu";
import { PageHeader } from "@/components/ui/page-header";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { SkeletonRow } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { VmId } from '@/components/VmId';
import { api } from "@/lib/api";
import { hasCap } from "@/lib/queries";
import { showToast } from "@/lib/toast";
import { formatDateTime } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import {
	CheckCircle2,
	Download,
	FileJson,
	FileSpreadsheet,
	FileUp,
	Filter,
	Folder,
	FolderPlus,
	FolderTree,
	Pencil,
	Play,
	RefreshCw,
	Search,
	Server as ServerIcon,
	Tags,
	Trash2,
	X
} from "lucide-react";
import { BulkDeleteResult } from './BulkDeleteResult';
import { hasHostFolderScope } from './folder-scope';
import { createHostRows } from './HostInventoryRows';
import { HostManagementDialogs } from './HostManagementDialogs';
import { savedViewKey } from './saved-views';
import { SavedHostViews } from './SavedHostViews';
import {
	formatRelativeTime
} from "./server-list-utils";
import { useHostManagement } from './useHostManagement';
export function ServersPage() {
 const controller = useHostManagement();
 const { renderOperatingState, renderServerRow, renderGroupRow } = createHostRows(controller);
 const { PAGE_SIZE, t, environmentId, profile, navigate, isLoading, serversFailed, serversError, refetchServers, groupsQuery, servers, groups, activeTag, setActiveTag, activeStatus, setActiveStatus, needsUpdates, setNeedsUpdates, severity, setSeverity, needsAttention, setNeedsAttention, activeGroup, setActiveGroup, filtersOpen, setFiltersOpen, operatingColumns, setOperatingColumns, toggleOperatingColumn, groupedView, setGroupedView, search, setSearch, setPage, selectedIds, setSelectedIds, bulkGroupId, setBulkGroupId, setBulkAction, setGroupDialog, fileInputRef, searchInputRef, refreshing, sortBy, setSortBy, allTags, filtered, sortedServers, useGroups, totalPages, safePage, pageServers, onlineCount, offlineCount, showFolderColumn, showTagColumn, tableColumnCount, infoMap, bulkDeleteMut, bulkMoveMut, autoGroupMut, setPlaybookDialogOpen, setConfirmBulkDelete, toggleSelect, selectAll, handleRefresh, handleImportFile, handleDeleteServer, selectedUpdateMut, dragOverGroup, setDragOverGroup, handleDrop, allSelected, selectionScope, selectedHosts, someSelected, serversByGroup, tree, activeFilterCount } = controller;
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
                      <th className="min-w-[220px] px-3 py-2.5">{t("srv.colName")}</th>
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
                              <VmId value={s.proxmox_vm_id} />
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

      <HostManagementDialogs controller={controller} />
    </div>
  );
}
