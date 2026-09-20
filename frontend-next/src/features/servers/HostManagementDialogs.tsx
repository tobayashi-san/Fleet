import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { GroupDialog } from '@/features/servers/GroupDialog';
import { hasCap } from "@/lib/queries";
import { useUi } from "@/lib/store";
import { asArray } from "@/lib/utils";
import {
	X
} from "lucide-react";
import { hasHostFolderScope } from './folder-scope';
import { useHostManagement } from './useHostManagement';
export function HostManagementDialogs({ controller }: { controller: Pick<ReturnType<typeof useHostManagement>, "t" | "environmentId" | "profile" | "servers" | "groups" | "selectedIds" | "setSelectedIds" | "bulkAction" | "setBulkAction" | "groupDialog" | "setGroupDialog" | "deleteMut" | "bulkDeleteMut" | "bulkMoveMut" | "groupDeleteMut" | "playbookDialogOpen" | "setPlaybookDialogOpen" | "selectedPlaybook" | "setSelectedPlaybook" | "playbookTargets" | "setPlaybookTargets" | "playbookUseAll" | "setPlaybookUseAll" | "playbookExcluded" | "setPlaybookExcluded" | "playbookExtraVars" | "setPlaybookExtraVars" | "confirmDeleteServer" | "setConfirmDeleteServer" | "confirmBulkDelete" | "setConfirmBulkDelete" | "confirmDeleteGroup" | "setConfirmDeleteGroup" | "playbooksQuery" | "playbooks" | "handleBulkRunPlaybook" | "selectedUpdateMut" | "handleGroupDialogSubmit"> }) {
const { t, environmentId, profile, servers, groups, selectedIds, setSelectedIds, bulkAction, setBulkAction, groupDialog, setGroupDialog, deleteMut, bulkDeleteMut, bulkMoveMut, groupDeleteMut, playbookDialogOpen, setPlaybookDialogOpen, selectedPlaybook, setSelectedPlaybook, playbookTargets, setPlaybookTargets, playbookUseAll, setPlaybookUseAll, playbookExcluded, setPlaybookExcluded, playbookExtraVars, setPlaybookExtraVars, confirmDeleteServer, setConfirmDeleteServer, confirmBulkDelete, setConfirmBulkDelete, confirmDeleteGroup, setConfirmDeleteGroup, playbooksQuery, playbooks, handleBulkRunPlaybook, selectedUpdateMut, handleGroupDialogSubmit }=controller;
return <>
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
</>;
}
