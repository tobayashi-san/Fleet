import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Plus, Save, Settings2, SlidersHorizontal, Trash2 } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { api, apiFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { SkeletonRow } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { hasCap, useProfile } from "@/lib/queries";
import { useUi } from "@/lib/store";
import { useUnsavedChanges } from "@/lib/use-unsaved-changes";
import { showToast } from "@/lib/toast";
import type { AnsibleVar } from "./playbook-types";

export function VarsTab() {
  const { t } = useTranslation();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const environmentId = useUi((state) => state.environmentId);
  const { data: vars, isLoading, isError, error: queryError, refetch } = useQuery<AnsibleVar[]>({
    queryKey: ["ansibleVars", environmentId],
    queryFn: () => api.getAnsibleVars(environmentId) as unknown as Promise<AnsibleVar[]>,
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [desc, setDesc] = useState("");
  const [valueType, setValueType] = useState("string");
  const [rotationDue, setRotationDue] = useState("");
  const [isSecret, setIsSecret] = useState(true);
  const [formEnvironment, setFormEnvironment] = useState(environmentId);
  const [baseline, setBaseline] = useState('');
  const draft = JSON.stringify({key,value,desc,isSecret,rotationDue,valueType});
  const dirty = formOpen && draft !== baseline;
  useUnsavedChanges(dirty);
  const likelySecret = /(?:password|passwd|token|secret|private[_-]?key|api[_-]?key|credential)/i.test(key) || /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(value);
  const keyError = !/^[a-zA-Z_][a-zA-Z0-9_]{0,99}$/.test(key) ? 'Use 1–100 letters, digits or underscores; start with a letter or underscore.' : null;
  const [deleteItem, setDeleteItem] = useState<AnsibleVar | null>(null);
  const today = new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Zurich'}).format(new Date());
  const plainVariables = (vars || []).filter((variable) => !variable.is_secret);
  const secretVariables = (vars || []).filter((variable) => variable.is_secret);

  const clearDraft = () => {
    setFormOpen(false);
    setEditId(null);
    setKey("");
    setValue("");
    setDesc("");
    setRotationDue("");
    setValueType("string");
    setIsSecret(true);
    setBaseline("");
  };

  const openNew = () => {
    if (saveMut.isPending) return;
    if (dirty && !window.confirm('Discard the current variable draft?')) return;
    saveMut.reset();
    setFormEnvironment(environmentId);
    setBaseline(JSON.stringify({key:'',value:'',desc:'',isSecret:true,rotationDue:'',valueType:'string'}));
    setValueType("string");
    setRotationDue("");
    setEditId(null);
    setKey("");
    setValue("");
    setDesc("");
    setIsSecret(true);
    setFormOpen(true);
  };
  const openEdit = (v: AnsibleVar) => {
    if (saveMut.isPending) return;
    if (dirty && !window.confirm('Discard the current variable draft?')) return;
    saveMut.reset();
    setFormEnvironment(environmentId);
    setBaseline(JSON.stringify({key:v.key,value:v.is_secret?'':v.value,desc:v.description??'',isSecret:Boolean(v.is_secret),rotationDue:v.rotation_due || '',valueType:v.value_type || 'string'}));
    setValueType(v.value_type || "string");
    setRotationDue(v.rotation_due || "");
    setEditId(v.id);
    setKey(v.key);
    setValue(v.is_secret ? "" : v.value);
    setDesc(v.description ?? "");
    setIsSecret(Boolean(v.is_secret));
    setFormOpen(true);
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      if (formEnvironment !== environmentId) throw new Error('Switch back to the draft environment before saving.');
      if (keyError) throw new Error(keyError);
      if (!key.trim() || (!value && !(editId && isSecret))) throw new Error(t("common.error"));
      if (editId)
        return api.updateAnsibleVar(editId, { key, value, description: desc, is_secret: isSecret, value_type: valueType, rotation_due: rotationDue || null });
      return api.createAnsibleVar({ key, value, description: desc, is_secret: isSecret, value_type: valueType, rotation_due: rotationDue || null, environment_id: environmentId });
    },
    onSuccess: () => {
      showToast(t("vars.saved"), "success");
      clearDraft();
      qc.invalidateQueries({ queryKey: ["ansibleVars", environmentId] });
      qc.invalidateQueries({ queryKey: ["variable-history", environmentId] });
    },
    onError: (e: Error) => showToast(e.message, "error"),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => api.deleteAnsibleVar(id),
    onSuccess: () => {
      showToast(t("vars.deleted"), "success");
      setDeleteItem(null);
      qc.invalidateQueries({ queryKey: ["ansibleVars", environmentId] });
      qc.invalidateQueries({ queryKey: ["variable-history", environmentId] });
    },
    onError: (e: Error) => showToast(e.message, "error"),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <SlidersHorizontal className="h-4 w-4" /> {t("vars.title")}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Scoped to environment <code className="rounded bg-muted px-1">{environmentId}</code>. Secrets are encrypted at rest and masked in this list.
              </p>
            </div>
            {hasCap(profile, "canAddVars") && (
              <Button size="sm" onClick={openNew} disabled={saveMut.isPending}>
                <Plus className="h-4 w-4" /> {t("vars.add")}
              </Button>
            )}
          </div>
          {isLoading ? (
            <div className="space-y-1">
              <SkeletonRow cols={4} />
              <SkeletonRow cols={4} />
              <SkeletonRow cols={4} />
              <SkeletonRow cols={4} />
            </div>
          ) : isError ? (
            <QueryErrorState
              compact
              error={queryError}
              title="Variables and secrets could not be loaded"
              onRetry={() => void refetch()}
            />
          ) : !vars || vars.length === 0 ? (
            <EmptyState
              compact
              icon={<KeyRound className="h-5 w-5" />}
              title={t("vars.noVars")}
            />
          ) : (
            <div className="table-scroll">
              <table className="w-full text-sm" data-density="compact">
                <thead>
                  <tr>
                    <th className="px-3">{t("vars.key")}</th>
                    <th className="px-3">{t("vars.value")}</th>
                    <th className="px-3">{t("vars.description")}</th>
                    <th className="w-20 px-3">
                      <span className="sr-only">{t("common.actions")}</span>
                    </th>
                  </tr>
                </thead>
                {[
                  { label: "Variables", description: "Plain values returned to authorized users", items: plainVariables },
                  { label: "Secrets", description: "Encrypted values; saved values cannot be revealed", items: secretVariables },
                ].map((group) => (
                  <tbody key={group.label}>
                    <tr className="bg-muted/35">
                      <td colSpan={4} className="px-3 py-2">
                        <span className="font-medium">{group.label}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{group.items.length} · {group.description}</span>
                      </td>
                    </tr>
                    {group.items.length === 0 ? (
                      <tr><td colSpan={4} className="px-3 py-3 text-xs text-muted-foreground">No {group.label.toLowerCase()} configured.</td></tr>
                    ) : group.items.map((v) => (
                      <tr key={v.id}>
                        <td className="px-3 font-mono text-xs font-medium">
                          {v.key}<span className="ml-2 text-muted-foreground">{v.value_type || "string"}</span>
                        </td>
                        <td className="max-w-[200px] truncate px-3 font-mono text-xs">
                          {v.is_secret ? "••••••••" : v.value}
                        </td>
                        <td className="px-3 text-xs text-muted-foreground">
                          {v.description || "—"}
                          {Boolean(v.is_secret) && <div className="mt-1"><p>Last value change: {formatDateTime(v.value_updated_at)}</p><p className={v.rotation_due && v.rotation_due < today ? 'text-warning' : ''}>Rotation due: {v.rotation_due || 'Not scheduled'}{v.rotation_due && v.rotation_due < today ? ' · Overdue' : ''} · advisory</p></div>}
                        </td>
                        <td className="px-3 text-right">
                          <div className="flex justify-end gap-1">
                            {hasCap(profile, "canEditVars") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                aria-label={`Edit ${v.key}`}
                                title={`Edit ${v.key}`}
                                disabled={saveMut.isPending}
                                onClick={() => openEdit(v)}
                              >
                                <Settings2 className="h-4 w-4" />
                              </Button>
                            )}
                            {hasCap(profile, "canDeleteVars") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                aria-label={`Delete ${v.key}`}
                                title={`Delete ${v.key}`}
                                onClick={() => setDeleteItem(v)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                ))}
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {formOpen && (
        <Card>
          <CardContent className="p-4">
            <fieldset disabled={saveMut.isPending} aria-busy={saveMut.isPending} className="min-w-0 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              {editId ? (
                <Settings2 className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {editId ? t("vars.edit") : t("vars.add")}
            </div>
            <p className="text-xs text-muted-foreground">Draft environment: <code>{formEnvironment}</code>. Values are supplied using their selected type. Reference a key in YAML as <code>{'{{ my_variable }}'}</code>. Variables supplied to a run override stored environment variables with the same key.</p>
            {formEnvironment !== environmentId && <p role="alert" className="text-xs text-destructive">This draft belongs to another environment. Switch back before saving, or cancel it.</p>}
            <div className="space-y-1">
              <Label htmlFor="ansible-var-key">{t("vars.key")}</Label>
              <Input
                id="ansible-var-key"
                value={key}
                maxLength={100}
                aria-invalid={Boolean(key && keyError)}
                aria-describedby="variable-key-feedback"
                onChange={(e) => setKey(e.target.value)}
                placeholder="my_variable"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {t("vars.keyHint")}
              </p>
            </div>
            <p id="variable-key-feedback" className="text-xs text-destructive">{key && keyError}</p>
            <label className="block space-y-1 text-xs">Value type<select aria-label="Value type" className="block h-9 rounded-md border bg-background px-2" disabled={isSecret} value={valueType} onChange={event=>setValueType(event.target.value)}><option value="string">Text</option><option value="number">Number</option><option value="boolean">Boolean · true / false</option><option value="json">JSON · object, array or value</option></select>{isSecret && <span className="text-muted-foreground">Secrets use text values.</span>}</label>
            <div className="space-y-1">
              <Label htmlFor="ansible-var-value">{t("vars.value")}</Label>
              {valueType === "json" ? <Textarea id="ansible-var-value" rows={5} maxLength={10000} value={value} onChange={event=>setValue(event.target.value)} className="font-mono" /> : <Input id="ansible-var-value" maxLength={10000} type={isSecret ? "password" : "text"} value={value} onChange={(e) => setValue(e.target.value)} placeholder={editId && isSecret ? "Leave empty to keep the existing secret" : undefined} autoComplete="new-password" />}
            </div>
            <label className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
              <span><span className="block font-medium">Secret value</span><span className="text-xs text-muted-foreground">Encrypted at rest and masked in API responses. Playbooks can still use the value; avoid printing secrets in task output.</span></span>
              <Switch aria-label="Secret value" checked={isSecret} onCheckedChange={(checked) => { setIsSecret(checked); if (checked) setValueType("string"); }} />
            </label>
            {!isSecret && likelySecret && <p role="alert" className="text-xs text-warning">This looks like a credential. Enable Secret value to encrypt and mask it; a normal variable is visible to users with variable read access.</p>}
            <div className="space-y-1">
              <Label htmlFor="ansible-var-description">{t("vars.description")}</Label>
              <Input id="ansible-var-description" value={desc} onChange={(e) => setDesc(e.target.value)} />
            </div>
            {isSecret && <div className="space-y-1"><Label htmlFor="variable-rotation-due">Rotation due · optional</Label><Input id="variable-rotation-due" type="date" value={rotationDue} onChange={event=>setRotationDue(event.target.value)} /><p className="text-xs text-muted-foreground">An advisory date shown in this list; no automatic notification. Rotate the credential at its source, then replace the stored value and choose the next date. Shipyard does not revoke credentials or block runs at this date.</p></div>}
            {saveMut.isError && <p role="alert" className="text-xs text-destructive">{saveMut.error.message}</p>}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { if (!dirty || window.confirm('Discard unsaved variable changes?')) { clearDraft(); saveMut.reset(); } }}>
                {t("common.cancel")}
              </Button>
              <Button
                onClick={() => saveMut.mutate()}
                disabled={saveMut.isPending || !dirty || Boolean(keyError) || formEnvironment !== environmentId}
              >
                <Save className="h-4 w-4" /> {saveMut.isPending ? "Saving…" : t("common.save")}
              </Button>
            </div>
            </fieldset>
          </CardContent>
        </Card>
      )}
      <VariableHistory key={environmentId} environmentId={environmentId} />
      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={(open) => {
          if (!open) setDeleteItem(null);
        }}
        title={t("common.delete")}
        description={t("vars.confirmDelete", { key: deleteItem?.key ?? "" })}
        confirmLabel={t("common.delete")}
        variant="destructive"
        confirmTextValue={deleteItem?.key ?? ""}
        confirmInputLabel="Confirm variable key"
        onConfirm={() => {
          if (deleteItem) delMut.mutate(deleteItem.id);
        }}
        isPending={delMut.isPending}
      />
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Tab: Schedules
// ═════════════════════════════════════════════════════════════════════════════

function VariableHistory({ environmentId }: { environmentId: string }) {
  const [page,setPage]=useState(1);
  const [open,setOpen]=useState(false);
  const history=useQuery({queryKey:['variable-history',environmentId,page],enabled:open,queryFn:()=>apiFetch<{items:{id:number;variable_key:string;action:string;fields:string[];actor:string|null;created_at:string}[];total:number}>(`/ansible-vars/history?environment_id=${encodeURIComponent(environmentId)}&page=${page}`)});
  return <details className="rounded-md border p-4 text-xs" onToggle={event=>setOpen(event.currentTarget.open)}><summary className="cursor-pointer font-medium">Variable change history</summary>
    <p className="my-2 text-muted-foreground">Latest 1,000 changes in this environment, including deleted variables. Values and description contents are never recorded. History starts when this feature is installed.</p>
    {history.isError?<QueryErrorState compact error={history.error} title="Variable history unavailable" onRetry={()=>void history.refetch()} />:history.isLoading?<p>Loading history…</p>:!history.data?.items.length?<p>No changes recorded.</p>:<ul className="divide-y">{history.data.items.map(event=><li key={event.id} className="py-2"><p><strong>{event.action} · {event.variable_key}</strong> · {event.actor || 'Unknown user'} · {formatDateTime(event.created_at)}</p><p className="text-muted-foreground">{event.fields.join(', ') || 'Variable removed'}</p></li>)}</ul>}
    {history.data && history.data.total>25 && <div className="mt-2 flex items-center gap-2"><Button size="sm" variant="outline" disabled={page<=1} onClick={()=>setPage(page-1)}>Previous</Button><span>Page {page}</span><Button size="sm" variant="outline" disabled={page*25>=history.data.total} onClick={()=>setPage(page+1)}>Next</Button></div>}
  </details>;
}
