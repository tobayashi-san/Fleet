import { formatDateTime } from '@/lib/utils';
import { DatabaseBackupCard } from '@/features/backup/DatabaseBackupCard';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Unlock, Radiation, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';
import { useUi } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { setToken } from '@/lib/auth';
import { showToast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { SettingsRow, SettingsSection } from '../_row';

type DzKey = 'servers' | 'schedules' | 'playbooks' | 'auth' | 'all';

interface DzAction {
  key: DzKey;
  labelKey: string;
  hintKey: string;
  confirmKey: string;
  icon: React.ReactNode;

  reboot?: boolean;
  variant?: 'destructive';
}

export function DangerTab() {
  const { t } = useTranslation();

  const resetInFlight = useRef(false);
  const [resetRunning, setResetRunning] = useState(false);
  const acquireReset = () => {
    if (resetInFlight.current) return false;
    resetInFlight.current = true;
    setResetRunning(true);
    return true;
  };
  const releaseReset = () => {
    resetInFlight.current = false;
    setResetRunning(false);
  };

  const actions: DzAction[] = [
    {
      key: 'servers',
      labelKey: 'set.delServers',
      hintKey:  'set.delServersHint',
      confirmKey: 'set.confirmServers',
      icon: <Trash2 className="h-4 w-4" />,
    },
    {
      key: 'schedules',
      labelKey: 'set.delSchedules',
      hintKey:  'set.delSchedulesHint',
      confirmKey: 'set.confirmSchedules',
      icon: <Trash2 className="h-4 w-4" />,
    },
    {
      key: 'playbooks',
      labelKey: 'set.delPlaybooks',
      hintKey:  'set.delPlaybooksHint',
      confirmKey: 'set.confirmPlaybooks',
      icon: <Trash2 className="h-4 w-4" />,
    },
    {
      key: 'auth',
      labelKey: 'set.resetAuth',
      hintKey:  'set.resetAuthHint',
      confirmKey: 'set.confirmAuth',
      icon: <Unlock className="h-4 w-4" />,
      reboot: true,
    },
    {
      key: 'all',
      labelKey: 'set.resetAll',
      hintKey:  'set.resetAllHint',
      confirmKey: 'set.confirmAll',
      icon: <Radiation className="h-4 w-4" />,
      reboot: true,
    },
  ];

  return (
    <div className="space-y-4"><DatabaseBackupCard /><SettingsSection
      icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
      title={t('set.danger')}
      description={t('set.dangerHint')}
      className="border-destructive/40"
    >
      {actions.map((a, i) => (
        <DzRow key={a.key} action={a} noBorder={i === actions.length - 1} resetRunning={resetRunning} acquireReset={acquireReset} releaseReset={releaseReset} />
      ))}
    </SettingsSection></div>
  );
}

const resetDetails = {
  servers: { phrase: 'DELETE HOSTS', scope: 'Selected environment', detail: 'Removes host records, groups, cached inventory and host update history in this environment. Remote hosts and virtual machines are not deleted.' },
  schedules: { phrase: 'DELETE SCHEDULES', scope: 'Selected environment', detail: 'Removes schedules and their run history in this environment and prevents future scheduled starts. Runs that have already started are not stopped.' },
  playbooks: { phrase: 'DELETE PLAYBOOKS', scope: 'All environments', detail: 'Deletes shared user playbook files. This affects every environment; bundled playbooks remain.' },
  auth: { phrase: 'RESET ALL ACCOUNTS', scope: 'All environments', detail: 'Deletes every user account and restarts onboarding. All account sessions lose access.' },
  all: { phrase: 'RESET HOSTS SCHEDULES AND ACCOUNTS', scope: 'All environments', detail: 'Removes host records and related data, schedules, accounts and user playbook files; resets authentication and appearance settings. This is not a complete database wipe: other inventories, integration settings and audit records may remain.' },
};

function DzRow({ action, noBorder, resetRunning, acquireReset, releaseReset }: { action: DzAction; noBorder: boolean; resetRunning: boolean; acquireReset: () => boolean; releaseReset: () => void }) {
  const { t } = useTranslation();
  const environmentId = useUi(s => s.environmentId);
  const [targetEnvironment, setTargetEnvironment] = useState(environmentId);
  const [confirmation, setConfirmation] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [backupPassphrase, setBackupPassphrase] = useState('');
  const [backupFormat, setBackupFormat] = useState<'database' | 'application'>('application');
  const [backupApproval, setBackupApproval] = useState<{id: string; expiresAt: string} | null>(null);
  const [verifyingBackup, setVerifyingBackup] = useState(false);
  const details = resetDetails[action.key];
  const scoped = action.key === 'servers' || action.key === 'schedules';
  const [phase, setPhase] = useState<'idle' | 'confirm' | 'busy' | 'done' | 'recovery'>('idle');

  const verifyBackup = async () => {
    if (!backupFile || backupFile.size > 1024 ** 3 || !password || !backupPassphrase || !acquireReset()) return;
    setVerifyingBackup(true); setError(''); setBackupApproval(null);
    try {
      const scope = scoped ? targetEnvironment : 'all-environments';
      const upload = await apiFetch<{id: string}>(`/reset/${action.key}/backup`, {method: 'POST', environmentId: targetEnvironment, body: {password, code, passphrase: backupPassphrase, format: backupFormat, scope}});
      const approval = await apiFetch<{id: string; expiresAt: string}>(`/reset/${action.key}/backup/${upload.id}`, {method: 'PUT', environmentId: targetEnvironment, headers: {'Content-Type': 'application/octet-stream'}, body: backupFile, timeoutMs: 180_000});
      setBackupApproval(approval);
    } catch (error) { setError((error as Error).message); }
    finally { setPassword(''); setCode(''); setBackupPassphrase(''); setVerifyingBackup(false); releaseReset(); }
  };

  const run = async () => {
    if (phase !== 'confirm' || confirmation !== details.phrase || !password || !backupApproval || !acquireReset()) return;
    setError('');
    setPhase('busy');
    try {
      const result = await apiFetch<{warning?: string}>(`/reset/${action.key}`, { method:'DELETE', environmentId:targetEnvironment, body:{confirmation,password,code,backupApproval:backupApproval?.id,scope:scoped ? targetEnvironment : 'all-environments'} });
      if (result.warning) {
        if (action.reboot) setToken(null);
        setWarning(result.warning);
        showToast(result.warning, {kind:'warning',duration:0});
        setPhase('done');
        return;
      }
      if (action.reboot) {
        setToken(null);
        showToast(t('set.resetRestarting'), 'success');
        setTimeout(() => location.reload(), 1200);
      } else {
        showToast(t('common.deleted'), 'success');
        setPhase('done');
      }
    } catch (e) {
      showToast(t('common.errorPrefix', { msg: (e as Error).message }), 'error');
      setError((e as Error).message);
      setPhase(e instanceof ApiError && e.field === 'recovery' ? 'recovery' : 'confirm');
    } finally {
      setBackupApproval(null);
      setBackupFile(null);
      releaseReset();
      setPassword('');
      setCode('');
    }
  };

  return (
    <SettingsRow
      label={action.key === 'all' ? 'Combined reset' : t(action.labelKey)}
      hint={`${details.scope}. ${details.detail}`}
      noBorder={noBorder}
    >
      {phase === 'idle' && (
        <Button variant="destructive" size="sm" disabled={resetRunning} onClick={() => { setTargetEnvironment(environmentId); setConfirmation(''); setError(''); setBackupApproval(null); setBackupFile(null); setBackupPassphrase(''); setPhase('confirm'); }}>
          {action.icon} {action.key === 'all' ? 'Combined reset' : t(action.labelKey)}
        </Button>
      )}
      {phase === 'confirm' && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full space-y-2 text-sm"><p><strong>{details.scope}{scoped ? `: ${targetEnvironment}` : ''}</strong></p><p>{details.detail}</p><p>Select and verify your saved backup before continuing. Resets that remove playbooks require an application archive. Keep the archive and original application key separately; this action has no undo.</p><label className="block">Type <strong>{details.phrase}</strong><Input aria-label={`Confirmation for ${action.key}`} value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="off" className="mt-1"/></label>{error && <p role="alert" className="text-destructive">{error}</p>}</div>
          <fieldset disabled={resetRunning} className="w-full space-y-2 text-sm">
            <label className="block">Saved encrypted backup (maximum 1 GiB)<Input type="file" accept=".backup" onChange={event => {setBackupFile(event.target.files?.[0] || null); setBackupApproval(null);}} /></label>
            <label className="block">Archive type<select className="ml-2 rounded border bg-background p-2" value={backupFormat} onChange={event => {setBackupFormat(event.target.value as 'database' | 'application'); setBackupApproval(null);}}><option value="application">Application database and files</option>{action.key !== 'all' && action.key !== 'playbooks' && <option value="database">Database only</option>}</select></label>
            <label className="block">Archive passphrase<Input type="password" autoComplete="off" value={backupPassphrase} onChange={event => {setBackupPassphrase(event.target.value); setBackupApproval(null);}} /></label>
            {backupFile && backupFile.size > 1024 ** 3 && <p role="alert" className="text-destructive">This archive exceeds the 1 GiB upload limit.</p>}
          </fieldset>
          <label className="block w-full text-sm">Current password<Input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} className="mt-1" /></label>
          <label className="block w-full text-sm">Authenticator code (if MFA is enabled)<Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={event => setCode(event.target.value)} className="mt-1" /></label>
          <Button variant="secondary" size="sm" disabled={resetRunning || !backupFile || backupFile.size > 1024 ** 3 || !backupPassphrase || !password} onClick={verifyBackup}>{verifyingBackup ? 'Uploading and verifying backup…' : 'Verify saved backup'}</Button>
          {backupApproval && <p role="status" className="w-full text-sm">Backup matches the selected reset data. Approval expires at {formatDateTime(backupApproval.expiresAt)}. Enter your account credentials again to confirm the reset. Any changed reset data requires a new backup check.</p>}
          <p className="w-full text-xs text-muted-foreground">Credentials are cleared after each verification or reset attempt. Each backup approval can be used once.</p>
          <Button variant="secondary" size="sm" disabled={resetRunning} onClick={() => {setBackupApproval(null);setBackupPassphrase('');setPassword('');setCode('');setPhase('idle');}}>
            {t('common.cancel')}
          </Button>
          <Button variant="destructive" size="sm" disabled={resetRunning || confirmation !== details.phrase || !password || !backupApproval} onClick={run}>
            {action.key === 'all' ? 'Combined reset' : t(action.labelKey)}
          </Button>
        </div>
      )}
      {phase === 'busy' && (
        <div role="status" aria-live="polite" className="space-y-1 text-sm"><p className="font-medium">{action.key === 'all' ? 'Combined reset' : t(action.labelKey)} in progress…</p><p>{scoped ? `Target environment: ${targetEnvironment}` : 'Scope: all environments'}</p><p className="text-muted-foreground">Wait for the result before starting another reset. Leaving this page does not cancel the operation.</p></div>
      )}
      {phase === 'recovery' && (
        <div className="space-y-2 text-sm"><p role="alert" className="text-destructive">{error}</p><p>Do not delete the remaining staging files or repeat the reset. After your administrator completes recovery, reload this page to review the action again.</p></div>
      )}
      {phase === 'done' && (
        warning ? <div className="space-y-2 text-sm"><p role="alert" className="text-amber-600 dark:text-amber-400">{warning}</p>{action.reboot && <Button variant="secondary" size="sm" onClick={() => location.reload()}>Continue to setup</Button>}</div> :
        <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" /> {t('common.deleted')}
        </span>
      )}
    </SettingsRow>
  );
}
