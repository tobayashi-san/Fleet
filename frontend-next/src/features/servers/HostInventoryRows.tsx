import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	OverflowItem,
	OverflowMenu,
	OverflowSep,
} from "@/components/ui/overflow-menu";
import { StatusBadge } from "@/components/ui/status-badge";
import { VmId } from "@/components/VmId";
import { MoveDropdown, PRESET_COLORS } from '@/features/servers/GroupDialog';
import { hasCap } from "@/lib/queries";
import { formatDateTime } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import {
	ChevronDown,
	ChevronRight,
	Folder,
	FolderOpen,
	FolderPlus,
	FolderTree,
	Info,
	Pencil,
	Trash2
} from "lucide-react";
import { Fragment } from "react";
import { hasHostFolderScope } from './folder-scope';
import { groupHostIds, selectHostPage } from './host-selection';
import {
	formatRelativeTime,
	inventoryAttentionReason,
	type GroupNode,
	type ServerRow
} from "./server-list-utils";
import type { useHostManagement } from './useHostManagement';
export function createHostRows(context: Pick<ReturnType<typeof useHostManagement>, "t" | "profile" | "navigate" | "servers" | "groups" | "severity" | "operatingColumns" | "selectedIds" | "setSelectedIds" | "collapsed" | "setGroupDialog" | "moveFor" | "setMoveFor" | "moveRef" | "showFolderColumn" | "showTagColumn" | "tableColumnCount" | "infoMap" | "moveMut" | "toggleCollapsed" | "toggleSelect" | "handleDeleteServer" | "handleDeleteGroup" | "setDragItem" | "dragOverGroup" | "setDragOverGroup" | "handleDrop" | "fmtLastSeen" | "serversByGroup">) {
const { t, profile, navigate, groups, operatingColumns, selectedIds, setSelectedIds, collapsed, setGroupDialog, moveFor, setMoveFor, moveRef, showFolderColumn, showTagColumn, tableColumnCount, infoMap, moveMut, toggleCollapsed, toggleSelect, handleDeleteServer, handleDeleteGroup, setDragItem, dragOverGroup, setDragOverGroup, handleDrop, fmtLastSeen }=context;
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
            <VmId value={s.proxmox_vm_id} />
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
return { renderOperatingState, renderServerRow, renderGroupRow };
}
