import { formatDateTime } from '@/lib/utils';
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Key,
  Copy,
  Download,
  Upload,
  Send,
  CheckCircle2,
  XCircle,
  Link2,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/api";
import { useUi } from "@/lib/store";
import { showToast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { SettingsRow, SettingsSection } from "../_row";

interface SSHKey {
  publicKey: string;
  algorithm?: string | null;
  fingerprint?: string | null;
  registeredAt?: string | null;
  exists?: boolean;
  name?: string;
}

interface KeyAssignment {
  id: string;
  target_type: "server" | "deployment" | "vm_template";
  target_id: string;
  target_label: string;
}
interface KeyAssignmentTargets {
  servers: Array<{ id: string; label: string }>;
  deployments: Array<{ id: string; label: string }>;
  vm_templates: Array<{ id: string; label: string }>;
}

export function SshTab() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const environmentId = useUi((state) => state.environmentId);

  const { data, isLoading, isError } = useQuery<SSHKey | null>({
    queryKey: ["ssh-key"],
    queryFn: () => api.getSSHKey() as Promise<SSHKey>,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["ssh-key"] });

  return (
    <div className="space-y-4">
      <SettingsSection
        icon={<Key className="h-4 w-4" />}
        title={t("set.sshTitle")}
        description="This installation · shared system key"
      >
        {isLoading ? (
          <SettingsRow label={t("set.sshStatus")} noBorder>
            <Skeleton className="h-4 w-32" />
          </SettingsRow>
        ) : isError ? (
          <QueryErrorState compact title="SSH key status could not be loaded" onRetry={() => void refresh()} />
        ) : data && data.publicKey ? (
          <SshKeyView ssh={data} onChanged={refresh} />
        ) : (
          <SshKeyMissing isError={isError} onChanged={refresh} />
        )}
      </SettingsSection>

      <SettingsSection
        icon={<Link2 className="h-4 w-4" />}
        title="Key assignments"
        description={`Selected environment: ${environmentId}`}
      >
        <KeyAssignments key={environmentId} environmentId={environmentId} />
      </SettingsSection>

      <SettingsSection
        icon={<Send className="h-4 w-4" />}
        title={t("set.sshDistribute")}
        description={`Selected environment: ${environmentId} · install the public key on selected hosts`}
      >
        <DeployForm />
      </SettingsSection>
    </div>
  );
}

function KeyAssignments({ environmentId }: { environmentId: string }) {
  const qc = useQueryClient();
  const [type, setType] = useState<KeyAssignment["target_type"]>("server");
  const assignments = useQuery<KeyAssignment[]>({
    queryKey: ["ssh-key-assignments", environmentId],
    queryFn: () =>
      api.getSSHKeyAssignments(environmentId) as Promise<KeyAssignment[]>,
  });
  const targets = useQuery<KeyAssignmentTargets>({
    queryKey: ["ssh-key-assignment-targets", environmentId],
    queryFn: () =>
      api.getSSHKeyAssignmentTargets(
        environmentId,
      ) as Promise<KeyAssignmentTargets>,
    staleTime: 30_000,
  });
  const choices =
    targets.data?.[
      type === "server"
        ? "servers"
        : type === "deployment"
          ? "deployments"
          : "vm_templates"
    ] || [];
  const [targetId, setTargetId] = useState("");
  const refresh = () => {
    void qc.invalidateQueries({
      queryKey: ["ssh-key-assignments", environmentId],
    });
  };
  const save = useMutation({
    mutationFn: () =>
      api.saveSSHKeyAssignment({
        environment_id: environmentId,
        target_type: type,
        target_id: targetId,
      }),
    onSuccess: () => {
      setTargetId("");
      refresh();
      showToast("Key assignment saved.", "success");
    },
    onError: (error: Error) => showToast(error.message, "error"),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.deleteSSHKeyAssignment(id),
    onSuccess: refresh,
    onError: (error: Error) => showToast(error.message, "error"),
  });
  const labels: Record<KeyAssignment["target_type"], string> = {
    server: "Host",
    deployment: "Deployment",
    vm_template: "VM template",
  };

  return (
    <div className="space-y-3 py-3.5">
      <p className="text-sm text-muted-foreground">
        Define which resources should use the central Shipyard key. Private keys
        are not duplicated. Removing an assignment does not revoke the public key on a host.
      </p>
      <div className="grid gap-2 sm:grid-cols-[150px_minmax(0,1fr)_auto]">
        <select
          value={type}
          onChange={(event) => {
            setType(event.target.value as KeyAssignment["target_type"]);
            setTargetId("");
          }}
          className="h-9 rounded-sm border border-input bg-background px-2.5 text-[13px]"
          aria-label="Target type"
        >
          <option value="server">Host</option>
          <option value="deployment">Deployment</option>
          <option value="vm_template">VM template</option>
        </select>
        <select
          value={targetId}
          onChange={(event) => setTargetId(event.target.value)}
          className="h-9 min-w-0 rounded-sm border border-input bg-background px-2.5 text-[13px]"
          aria-label="Select target"
        >
          <option value="">
            {targets.isLoading
              ? "Loading targets…"
              : targets.isError
                ? "Targets unavailable"
              : choices.length
                ? "Select target"
                : "No targets available"}
          </option>
          {choices.map((choice) => (
            <option key={choice.id} value={choice.id}>
              {choice.label}
            </option>
          ))}
        </select>
        <Button
          type="button"
          size="sm"
          className="h-9 px-3"
          onClick={() => save.mutate()}
          disabled={!targetId || !choices.some(choice => choice.id === targetId) || targets.isFetching || targets.isError || save.isPending}
        >
          Assign
        </Button>
      </div>
      {targets.isError && (
        <QueryErrorState
          compact
          className="py-3"
          error={targets.error}
          title="Assignment targets could not be loaded"
          onRetry={() => void targets.refetch()}
        />
      )}
      {assignments.isLoading ? (
        <Skeleton className="h-12 w-full" />
      ) : assignments.isError ? (
        <QueryErrorState
          compact
          error={assignments.error}
          title="Key assignments could not be loaded"
          onRetry={() => void assignments.refetch()}
        />
      ) : assignments.data?.length ? (
        <div className="divide-y rounded-md border">
          {assignments.data.map((assignment) => (
            <div
              className="flex items-center gap-3 px-3 py-2"
              key={assignment.id}
            >
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {assignment.target_label}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {labels[assignment.target_type]}
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => remove.mutate(assignment.id)}
                disabled={remove.isPending}
                aria-label={`Remove ${assignment.target_label}`}
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-dashed px-3 py-3 text-sm text-muted-foreground">
          No intended-use assignments recorded. Hosts may already trust this key; this list is not a scan of remote authorized_keys.
        </p>
      )}
    </div>
  );
}

function SshKeyView({
  ssh,
  onChanged,
}: {
  ssh: SSHKey;
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const escapedKey = ssh.publicKey.replace(/'/g, "'\\''");
  const installCmd = `mkdir -p ~/.ssh && echo '${escapedKey}' >> ~/.ssh/authorized_keys && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys`;
  const [exportOpen, setExportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  const copy = (text: string, msg: string) => {
    navigator.clipboard.writeText(text).then(() => showToast(msg, "success"));
  };

  const onPickImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      setImportFile(file);
    };
    input.click();
  };

  return (
    <>
      <SettingsRow label={t("set.sshName")}>
        <span className="font-mono text-sm">{ssh.name || "shipyard"}</span>
      </SettingsRow>
      <SettingsRow label={t("set.sshType")}>
        <span className="font-mono text-sm">{ssh.algorithm || ssh.publicKey.trim().split(/\s+/)[0] || "Unavailable"}</span>
      </SettingsRow>
      <SettingsRow label={t("set.sshStatus")}>
        {ssh.exists !== false ? (
          <StatusBadge tone="success">
            <CheckCircle2 className="h-3 w-3" /> {t("set.sshActive")}
          </StatusBadge>
        ) : (
          <StatusBadge tone="muted">
            <XCircle className="h-3 w-3" /> {t("set.sshNotFound")}
          </StatusBadge>
        )}
      </SettingsRow>

      <SettingsRow label="SHA-256 fingerprint" hint="Compare this fingerprint with the trusted key on your hosts.">
        <span className="break-all font-mono text-xs">{ssh.fingerprint || 'Unavailable'}</span>
      </SettingsRow>
      <SettingsRow label="Registered in Shipyard" hint="Registration or replacement time; an imported key may have been created earlier.">
        <span className="text-sm">{formatDateTime(ssh.registeredAt)}</span>
      </SettingsRow>
      <SettingsRow label={t("set.sshPublicKey")} align="start">
        <div className="w-full min-w-0 rounded-md border bg-muted/40 p-3">
          <div className="font-mono text-xs leading-relaxed break-all">
            {ssh.publicKey}
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="mt-2"
            onClick={() => copy(ssh.publicKey, t("set.keyCopied"))}
          >
            <Copy className="h-3.5 w-3.5" /> {t("common.copy")}
          </Button>
        </div>
      </SettingsRow>

      <SettingsRow
        label={t("set.sshManualAdd")}
        hint={t("set.sshManualHint")}
        align="start"
      >
        <div className="w-full min-w-0 rounded-md border bg-muted/40 p-3">
          <div className="font-mono text-xs leading-relaxed break-all">
            {installCmd}
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="mt-2"
            onClick={() => copy(installCmd, t("set.cmdCopied"))}
          >
            <Copy className="h-3.5 w-3.5" /> {t("common.copy")}
          </Button>
        </div>
      </SettingsRow>

      <details className="py-3"><summary className="cursor-pointer text-sm font-medium">Advanced: export or replace the system key</summary>
      <SettingsRow
        label={t("set.manageKey")}
        hint={t("set.manageKeyHint")}
        noBorder
      >
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setExportOpen(true)}
        >
          <Download className="h-4 w-4" /> {t("set.exportKeyTitle")}
        </Button>
        <Button variant="secondary" size="sm" onClick={onPickImport}>
          <Upload className="h-4 w-4" /> {t("set.importKeyTitle")}
        </Button>
      </SettingsRow>

      </details>
      <ExportKeyDialog open={exportOpen} onOpenChange={setExportOpen} />
      <ImportKeyDialog
        file={importFile}
        onClose={() => setImportFile(null)}
        onImported={() => {
          setImportFile(null);
          onChanged();
        }}
      />
    </>
  );
}

function SshKeyMissing({
  isError,
  onChanged,
}: {
  isError?: boolean;
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  const generate = async () => {
    setBusy(true);
    try {
      await api.generateSSHKey("shipyard");
      showToast(t("set.sshGenerated"), "success");
      onChanged();
    } catch (err) {
      showToast(
        t("common.errorPrefix", { msg: (err as Error).message }),
        "error",
      );
    } finally {
      setBusy(false);
    }
  };

  const onPickImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      setImportFile(file);
    };
    input.click();
  };

  return (
    <>
      <SettingsRow label={t("set.sshStatus")} noBorder>
        <span className="text-sm text-muted-foreground">
          {isError ? t("common.error") : t("set.sshNone")}
        </span>
        <Button size="sm" onClick={generate} disabled={busy}>
          <Key className="h-4 w-4" /> {t("set.sshGenerate")}
        </Button>
        <Button variant="secondary" size="sm" onClick={onPickImport}>
          <Upload className="h-4 w-4" /> {t("set.importKeyTitle")}
        </Button>
      </SettingsRow>
      <ImportKeyDialog
        file={importFile}
        onClose={() => setImportFile(null)}
        onImported={() => {
          setImportFile(null);
          onChanged();
        }}
      />
    </>
  );
}

function ExportKeyDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const clear = () => {setPass("");setPass2("");setPassword("");setCode("");};
  const close = (value: boolean) => {if (busy) return; if (!value) {clear();setError(null);} onOpenChange(value);};
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    if (!password) return;
    setError(null);
    if (pass !== pass2) {
      setError(t("set.exportKeyMismatch"));
      return;
    }
    setBusy(true);
    try {
      const res = (await api.exportSSHKey(pass, password, code)) as { privateKey: string };
      const blob = new Blob([res.privateKey], { type: "text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "shipyard_id_ed25519";
      a.click();
      URL.revokeObjectURL(a.href);
      onOpenChange(false);
      setPass("");
      setPass2("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      clear();
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-sm">
        <form onSubmit={(event) => { event.preventDefault(); void submit(); }} className="contents">
        <DialogHeader>
          <DialogTitle>{t("set.exportKeyTitle")}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Confirm with your current account password. If MFA is enabled, also enter your authenticator code. The optional export passphrase protects the downloaded file; leaving it empty exports an unprotected private key.</p>
        <Input aria-label="Current account password" placeholder="Current account password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required disabled={busy}/>
        <Input aria-label="Authenticator code" placeholder="Authenticator code (if enabled)" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={event => setCode(event.target.value)} disabled={busy}/>
        <Input
          aria-label={t("set.exportKeyPlaceholder")}
          name="exportKeyPassphrase"
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          placeholder={t("set.exportKeyPlaceholder")}
          autoComplete="new-password"
        />
        <Input
          aria-label={t("set.exportKeyConfirm")}
          name="exportKeyPassphraseConfirmation"
          type="password"
          value={pass2}
          onChange={(e) => setPass2(e.target.value)}
          placeholder={t("set.exportKeyConfirm")}
          autoComplete="new-password"
        />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="secondary" disabled={busy} onClick={() => close(false)}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={busy || !password}>
            <Download className="h-4 w-4" /> {t("set.exportKeyBtn")}
          </Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ImportKeyDialog({file,onClose,onImported}: {file:File|null;onClose:()=>void;onImported:()=>void}) {
  const {t}=useTranslation();
  const [pass,setPass]=useState('');
  const [busy,setBusy]=useState(false);
  const [copied,setCopied]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [review,setReview]=useState<Awaited<ReturnType<typeof api.previewSSHKeyImport>>|null>(null);
  const clear=()=>{setPass('');setReview(null);setError(null);setCopied(false);};
  const close=()=>{if(!busy){clear();onClose();}};
  const submit=async()=>{
    if(!file || busy)return;
    setBusy(true);setError(null);
    try {
      if(file.size>65536)throw new Error('Select a private key file of at most 64 KiB.');
      const content=await file.text();
      if(!review){setCopied(false);setReview(await api.previewSSHKeyImport(content,pass));return;}
      await api.importSSHKey(content,pass,{expectedKeyId:review.current?.id || null,expectedFingerprint:review.candidate.fingerprint});
      clear();showToast(t('set.importKeySuccess'),'success');onImported();
    }catch(error){setError((error as Error).message);setReview(null);setPass('');}
    finally{setBusy(false);}
  };
  return <Dialog open={file!==null} onOpenChange={value=>{if(!value)close();}}>
    <DialogContent className="flex max-w-lg flex-col overflow-hidden" disableMotion>
      <form onSubmit={event=>{event.preventDefault();void submit();}} className="flex min-h-0 flex-col gap-4">
        <DialogHeader className="shrink-0"><DialogTitle>{review?'Review SSH key replacement':t('set.importKeyTitle')}</DialogTitle></DialogHeader>
        <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
        <p className="break-all text-xs text-muted-foreground">{file?.name}</p>
        {review ? <>
          <dl className="space-y-3 text-sm [overflow-wrap:anywhere]">
            <div><dt className="font-medium">Current key</dt><dd>{review.current ? `${review.current.algorithm} · ${review.current.fingerprint}` : 'No active key'}</dd></div>
            <div><dt className="font-medium">Selected key</dt><dd>{review.candidate.algorithm} · {review.candidate.fingerprint}</dd></div>
          </dl>
          <details className="rounded-md border p-3 text-sm">
            <summary className="cursor-pointer font-medium">Prepare the new public key</summary>
            <p className="my-2 text-xs text-muted-foreground">Add this public key to the intended remote account before activation. This does not change Shipyard's active key or contact any host.</p>
            <textarea readOnly aria-label="Selected public key" value={review.candidate.publicKey} rows={3} className="w-full resize-y rounded-md border bg-background p-2 font-mono text-xs"/>
            <Button type="button" size="sm" variant="secondary" className="mt-2" onClick={()=>{void navigator.clipboard.writeText(review.candidate.publicKey).then(()=>setCopied(true)).catch(()=>setError('Could not copy. Select and copy the public key from the field.'));}}>{copied?'Copied':'Copy public key'}</Button>
          </details>
          <p className="text-sm text-warning">Import replaces the central key used for new Shipyard SSH connections across environments. Hosts that do not trust the selected key can become unreachable. Existing remote authorized_keys entries are neither updated nor revoked.</p>
          <p className="text-sm text-muted-foreground">Prepare access using the new public key and retain a recovery copy of the old key before replacing it. Intended-use assignments do not prove which hosts trust the key.</p>
        </> : <>
          <p className="text-sm text-muted-foreground">Validate the selected file and compare fingerprints before activating it. Preview does not replace the current key.</p>
          <Input aria-label={t('set.importKeyPlaceholder')} name="importKeyPassphrase" type="password" value={pass} onChange={event=>setPass(event.target.value)} placeholder={t('set.importKeyPlaceholder')} autoComplete="off" disabled={busy}/>
        </>}
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter className="shrink-0">
          <Button type="button" variant="secondary" disabled={busy} onClick={close}>{t('common.cancel')}</Button>
          {review && <Button type="button" variant="secondary" disabled={busy} onClick={()=>setReview(null)}>Back</Button>}
          <Button type="submit" variant={review?.current ? "destructive" : "default"} disabled={busy}>{busy?'Working…':review?(review.current?'Replace key':'Activate key'):'Preview key'}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

function DeployForm() {
  const { t } = useTranslation();
  const environmentId = useUi((state) => state.environmentId);
  const [ip, setIp] = useState("");
  const [user, setUser] = useState("root");
  const [port, setPort] = useState("22");
  const [pw, setPw] = useState("");
  const [busyOne, setBusyOne] = useState(false);
  const [busyAll, setBusyAll] = useState(false);
  const [confirmOne, setConfirmOne] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);
  const hostsQuery = useQuery<Array<{ id: string; name: string; ip_address?: string }>>({
    queryKey: ["servers", environmentId],
    queryFn: () => api.getServers(environmentId) as unknown as Promise<Array<{ id: string; name: string; ip_address?: string }>>,
    enabled: confirmAll,
  });
  const deployTargets = Array.isArray(hostsQuery.data) ? hostsQuery.data : [];

  const deployOne = async () => {
    setBusyOne(true);
    try {
      await api.deploySSHKey({
        ip_address: ip,
        ssh_user: user || "root",
        ssh_port: parseInt(port, 10) || 22,
        password: pw,
      });
      showToast(t("set.sshDistributed"), "success");
      setPw("");
      setConfirmOne(false);
    } catch (err) {
      showToast(
        t("common.errorPrefix", { msg: (err as Error).message }),
        "error",
      );
    } finally {
      setBusyOne(false);
    }
  };

  const deployAll = async () => {
    setBusyAll(true);
    try {
      const result = (await api.deploySSHKeyAll({ password: pw })) as {
        succeeded: number;
        failed: number;
      };
      showToast(
        t("set.sshDistributedAllResult", {
          succeeded: result.succeeded,
          failed: result.failed,
        }),
        result.failed ? "warning" : "success",
      );
      setPw("");
    } catch (err) {
      showToast(
        t("common.errorPrefix", { msg: (err as Error).message }),
        "error",
      );
    } finally {
      setBusyAll(false);
      setConfirmAll(false);
    }
  };

  return (
    <>
      <form onSubmit={(event) => { event.preventDefault(); if (ip) setConfirmOne(true); }} className="contents">
      <SettingsRow label={t("set.sshTarget")} hint={t("set.sshTargetHint")}>
        <div className="grid w-full max-w-md grid-cols-1 gap-2 sm:grid-cols-[1fr_90px_70px]">
          <Input
            aria-label="SSH host address"
            name="sshHost"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            placeholder="192.168.1.100"
          />
          <Input
            aria-label="SSH username"
            name="sshUsername"
            autoComplete="username"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            placeholder="root"
          />
          <Input
            aria-label="SSH port"
            name="sshPort"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            type="number"
            placeholder="22"
          />
        </div>
      </SettingsRow>

      <SettingsRow label={t("set.sshPassword")} hint={t("set.sshPasswordHint")}>
        <Input
          aria-label={t("set.sshPassword")}
          name="sshPassword"
          value={pw}
          type="password"
          onChange={(e) => setPw(e.target.value)}
          placeholder={t("set.serverPasswordPlaceholder")}
          autoComplete="new-password"
          className="max-w-md"
        />
      </SettingsRow>

      <SettingsRow label={null} hint={t("set.sshDistributeAllHint")} noBorder>
        <Button type="submit" size="sm" disabled={busyOne || !ip}>
          <Key className="h-4 w-4" />{" "}
          {busyOne ? t("set.deploying") : t("set.sshDistributeBtn")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            if (!pw) {
              showToast(t("set.passwordRequired"), "error");
              return;
            }
            setConfirmAll(true);
          }}
          disabled={busyAll}
        >
          <Key className="h-4 w-4" />{" "}
          {busyAll ? t("set.deploying") : t("set.sshDistributeAllBtn")}
        </Button>
      </SettingsRow>
      </form>

      <Dialog open={confirmOne} onOpenChange={setConfirmOne}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Install SSH key on this host?</DialogTitle>
          </DialogHeader>
          <div className="rounded-md border bg-muted/20 p-3 text-sm">
            <div className="font-medium">{user || "root"}@{ip}</div>
            <div className="mt-1 text-xs text-muted-foreground">Port {parseInt(port, 10) || 22} · the password is used only for this installation request.</div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmOne(false)}>{t("common.cancel")}</Button>
            <Button onClick={deployOne} disabled={busyOne || !ip}>{busyOne ? t("set.deploying") : t("set.sshDistributeBtn")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmAll} onOpenChange={setConfirmAll}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("set.sshDistributeAllBtn")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm">{t("set.sshDeployAllConfirm")}</p>
          <div className="max-h-48 overflow-y-auto rounded-md border bg-muted/20 p-2 text-sm">
            {hostsQuery.isLoading ? (
              <span className="text-muted-foreground">Loading target preview…</span>
            ) : hostsQuery.isError ? (
              <QueryErrorState
                compact
                className="py-3"
                error={hostsQuery.error}
                title="SSH deployment targets could not be loaded"
                onRetry={() => void hostsQuery.refetch()}
              />
            ) : deployTargets.length ? (
              <>
                <div className="mb-1 px-1 text-xs font-semibold text-muted-foreground">{deployTargets.length} hosts</div>
                {deployTargets.slice(0, 8).map((host) => <div key={host.id} className="flex justify-between gap-3 rounded-sm px-1 py-1"><span className="truncate">{host.name}</span><span className="font-mono text-xs text-muted-foreground">{host.ip_address || "—"}</span></div>)}
                {deployTargets.length > 8 && <div className="px-1 pt-1 text-xs text-muted-foreground">+{deployTargets.length - 8} more hosts</div>}
              </>
            ) : <span className="text-muted-foreground">No hosts in this environment.</span>}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmAll(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={deployAll}
              disabled={busyAll || hostsQuery.isLoading || deployTargets.length === 0}
            >
              {t("set.sshDistributeAllBtn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
