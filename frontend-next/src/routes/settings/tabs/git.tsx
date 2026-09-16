import { Link } from '@tanstack/react-router';
import { GitSyncState, type GitComparison } from '@/features/git/GitSyncState';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  GitBranch, GitCommit, ArrowDown, ArrowUp, Plug, Unplug, Save, RotateCw, User,
} from 'lucide-react';
import { api, apiFetch } from '@/lib/api';
import { asArray, formatDateTime } from '@/lib/utils';
import { showToast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton, SkeletonRow } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { SettingsRow, SettingsSection } from '../_row';
import { useUnsavedChanges } from '@/lib/use-unsaved-changes';

interface GitConfig {
  repoUrl?: string;
  branch?: string;
  autoPull?: boolean;
  autoPush?: boolean;
  readOnly?: boolean;
  userName?: string;
  userEmail?: string;
  hasToken?: boolean;
  hasSshKey?: boolean;
}

export function GitTab({ workspace = false }: {workspace?:boolean}) {
  const [setupWarning, setSetupWarning] = useState<string | null>(null);
  const setupWarningRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (setupWarning) setupWarningRef.current?.focus(); }, [setupWarning]);
  const cfgQ = useQuery<GitConfig>({
    queryKey: ['git-config'],
    queryFn: () => api.getGitConfig() as Promise<GitConfig>,
  });

  if (cfgQ.isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    );
  }
  if (cfgQ.isError && !cfgQ.data) {
    return <QueryErrorState error={cfgQ.error} title="Git configuration could not be loaded" onRetry={() => void cfgQ.refetch()} />;
  }
  const cfg = cfgQ.data || {};
  return <div className="space-y-4">
    {cfgQ.isError && <QueryErrorState compact error={cfgQ.error} title="Git refresh failed. Showing the last loaded configuration; your drafts are retained." onRetry={() => void cfgQ.refetch()} />}
    {setupWarning && <div ref={setupWarningRef} tabIndex={-1} role="alert" className="space-y-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
      <p className="font-medium">Connection saved; initial synchronization did not complete.</p>
      <p className="whitespace-pre-wrap break-words">{setupWarning}</p>
      <p>Review the branch and local changes below, then retry Pull. This message describes the initial connection attempt.</p>
      <Button type="button" variant="outline" size="sm" onClick={() => setSetupWarning(null)}>Dismiss initial sync message</Button>
    </div>}
    {cfg.repoUrl ? <GitDashboard key="configured" cfg={cfg} workspace={workspace} /> : workspace ? <p>Connect a repository in <Link to="/settings/$tab" params={{tab:'git'}} className="text-primary">Playbook Git settings</Link>.</p> : <GitSetup key="setup" onSetupResult={setSetupWarning} />}
  </div>;
}

// ─────────────────────────────────────────────────────────────
// Setup (no repo connected)
// ─────────────────────────────────────────────────────────────

function GitSetup({ onSetupResult }: { onSetupResult: (warning: string | null) => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [repoUrl, setRepoUrl] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [sshKey, setSshKey] = useState('');
  const [authMode, setAuthMode] = useState<'https' | 'ssh'>('https');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [autoPull, setAutoPull] = useState(true);
  const [autoPush, setAutoPush] = useState(false);
  const [readOnly, setReadOnly] = useState(true);
  const [branch, setBranch] = useState('main');
  const dirty = Boolean(repoUrl || authToken || sshKey || userName || userEmail || !autoPull || autoPush || !readOnly || branch !== 'main' || authMode !== 'https');
  useUnsavedChanges(dirty);

  const connectionInput = { repoUrl: repoUrl.trim(), authToken: authMode === 'https' ? authToken.trim() : '', sshKey: authMode === 'ssh' ? sshKey.trim() : '', branch: branch.trim() };
  const connectionTest = useMutation({ mutationFn: (input: typeof connectionInput) => api.testGitConnection(input) });
  const testMatches = JSON.stringify(connectionTest.variables) === JSON.stringify(connectionInput);

  const setup = useMutation({
    mutationFn: () => api.gitSetup({
      repoUrl: repoUrl.trim(),
      authToken: authMode === 'https' ? authToken.trim() : '',
      sshKey: authMode === 'ssh' ? sshKey.trim() : '',
      userName: userName.trim(),
      userEmail: userEmail.trim(),
      autoPull,
      autoPush,
      readOnly,
      branch: branch.trim(),
    }) as Promise<{ synchronized?: boolean; pullOutput?: string }>,
    onSuccess: (result) => {
      onSetupResult(result.synchronized === false ? result.pullOutput || 'Check local changes and branch access.' : null);
      showToast(result.synchronized === false ? `Connection saved, but initial synchronization did not complete: ${result.pullOutput || 'Check local changes and branch access.'}` : t('git.connected'), result.synchronized === false ? 'error' : 'success');
      qc.invalidateQueries({ queryKey: ['git-config'] });
    },
    onError: (e) => showToast(t('common.errorPrefix', { msg: (e as Error).message }), 'error'),
  });

  return (
    <SettingsSection
      icon={<GitBranch className="h-4 w-4" />}
      title={t('git.title')}
      description={t('git.setupHint')}
    >
      <form onSubmit={(event) => { event.preventDefault(); if (repoUrl.trim() && !setup.isPending) setup.mutate(); }} className="contents">
      <fieldset disabled={setup.isPending} className="contents">
      <SettingsRow label={t('git.repoUrl')} hint={t('git.repoUrlSmallHint')}>
        <Input aria-label={t('git.repoUrl')} name="repositoryUrl" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="https://github.com/user/repo.git" className="max-w-md" />
      </SettingsRow>
      <SettingsRow label="Branch" hint="Use the existing remote branch that contains your playbooks.">
        <Input aria-label="Initial Git branch" value={branch} onChange={(event) => setBranch(event.target.value)} required className="max-w-xs" />
      </SettingsRow>
      <SettingsRow label="Initial synchronization" hint="Connection saves the repository configuration and attempts to import the selected branch. Existing local edits must be resolved before synchronization; they are never discarded automatically."><span className="text-xs text-muted-foreground">Resolve local edits before importing remote content.</span></SettingsRow>
      <SettingsRow label="Authentication" hint="Choose exactly one credential method for the remote repository.">
        <div className="inline-flex rounded-sm border p-0.5" role="radiogroup" aria-label="Git authentication method">
          <button type="button" role="radio" aria-checked={authMode === 'https'} onClick={() => setAuthMode('https')} className={`rounded-sm px-3 py-1.5 text-xs font-medium ${authMode === 'https' ? 'bg-accent text-foreground' : 'text-muted-foreground'}`}>HTTPS token</button>
          <button type="button" role="radio" aria-checked={authMode === 'ssh'} onClick={() => setAuthMode('ssh')} className={`rounded-sm px-3 py-1.5 text-xs font-medium ${authMode === 'ssh' ? 'bg-accent text-foreground' : 'text-muted-foreground'}`}>SSH key</button>
        </div>
      </SettingsRow>
      {authMode === 'https' ? (
        <SettingsRow label={t('git.authToken')} hint={t('git.authTokenHint')}>
          <Input aria-label={t('git.authToken')} name="repositoryToken" type="password" value={authToken} onChange={(e) => setAuthToken(e.target.value)} placeholder="ghp_xxxxxxxxxxxx" autoComplete="new-password" className="max-w-md" />
        </SettingsRow>
      ) : (
        <SettingsRow label={t('git.sshKey')} hint={t('git.sshKeyHint')} align="start">
          <Textarea aria-label={t('git.sshKey')} name="repositorySshKey" value={sshKey} onChange={(e) => setSshKey(e.target.value)} rows={5} placeholder={'-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----'} className="max-w-md font-mono text-xs" />
        </SettingsRow>
      )}
      <SettingsRow label={t('git.userName')} hint={t('git.userNameHint')}>
        <Input aria-label={t('git.userName')} name="gitUserName" maxLength={200} autoComplete="name" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Shipyard" className="max-w-xs" />
      </SettingsRow>
      <SettingsRow label={t('git.userEmail')} hint={t('git.userEmailHint')}>
        <Input aria-label={t('git.userEmail')} name="gitUserEmail" maxLength={254} type="email" autoComplete="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} placeholder="shipyard@localhost" className="max-w-sm" />
      </SettingsRow>
      <SettingsRow label={t('git.autoPull')} hint={t('git.autoPullHint')}>
        <Switch aria-label={t('git.autoPull')} checked={autoPull} onCheckedChange={setAutoPull} />
      </SettingsRow>
      <SettingsRow label="Remote read-only" hint="Pull and local edits remain available. Manual and automatic pushes are blocked by the server. Use a read-only repository credential for additional protection.">
        <Switch aria-label="Remote read-only" checked={readOnly} onCheckedChange={(value) => { setReadOnly(value); if (value) setAutoPush(false); }} />
      </SettingsRow>
      <SettingsRow label={t('git.autoPush')} hint="Opt in to automatically commit and push saved playbook changes to the selected remote branch.">
        <Switch aria-label={t('git.autoPush')} checked={autoPush} disabled={readOnly} onCheckedChange={setAutoPush} />
      </SettingsRow>
      <SettingsRow label="Connection test" hint="Checks repository read access and branches with the entered credentials. Does not save configuration or import files.">
        <div className="space-y-2 text-xs">
          <Button type="button" variant="outline" size="sm" disabled={!repoUrl.trim() || !branch.trim() || connectionTest.isPending || setup.isPending} onClick={() => connectionTest.mutate(connectionInput)}>{connectionTest.isPending ? 'Checking repository…' : 'Test connection'}</Button>
          {testMatches && connectionTest.isError && <p role="alert" className="text-destructive">{connectionTest.error.message}</p>}
          {testMatches && connectionTest.data && <div role="status">
            <p className={connectionTest.data.branchExists ? 'text-muted-foreground' : 'text-warning'}>{connectionTest.data.branchExists ? `Read access verified; branch ${branch} exists.` : `Read access verified, but branch ${branch} does not exist. Choose an existing branch or initialize the remote repository.`}</p>
            <p>Checked: {formatDateTime(connectionTest.data.checkedAt)} · Default branch: {connectionTest.data.defaultBranch || 'None reported'}</p>
            <p className="break-all">Available branches: {connectionTest.data.branches.join(', ') || 'Empty repository'}</p>
          </div>}
        </div>
      </SettingsRow>
      {dirty && <p role="status" className="text-sm">Unsaved repository configuration</p>}
      <SettingsRow noBorder>
        <Button type="submit" size="sm" disabled={setup.isPending || !repoUrl.trim()}>
          <Plug className="h-4 w-4" /> {setup.isPending ? t('git.connecting') : t('git.connectRepo')}
        </Button><Button type="button" variant="outline" disabled={!dirty || setup.isPending || connectionTest.isPending} onClick={()=>{setRepoUrl('');setAuthToken('');setSshKey('');setAuthMode('https');setUserName('');setUserEmail('');setAutoPull(true);setAutoPush(false);setReadOnly(true);setBranch('main');connectionTest.reset();setup.reset();}}>Discard configuration</Button>
      </SettingsRow>
      {setup.isError && <p role="alert" className="px-4 pb-4 text-sm text-destructive">{setup.error.message}</p>}
      </fieldset>
      </form>
    </SettingsSection>
  );
}

// ─────────────────────────────────────────────────────────────
// Dashboard (repo connected)
// ─────────────────────────────────────────────────────────────

interface GitStatus { initialized: boolean; conflicts?: string[]; comparison?: GitComparison; lastFetchAt?: string | null; branch?: string; revision?: string | null; lastPullAt?: string | null; changed?: { status: string; file: string }[] }

interface GitBranches { local?: string[]; remote?: string[] }

function GitDashboard({ cfg, workspace }: { cfg: GitConfig; workspace:boolean }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [statusMsg, setStatusMsg] = useState('');
  const savedSettings = { autoPull: cfg.autoPull !== false, autoPush: cfg.autoPush === true, readOnly: cfg.readOnly === true };
  const [settingsDraft, setSettingsDraft] = useState<typeof savedSettings | null>(null);
  const { autoPull, autoPush, readOnly } = settingsDraft ?? savedSettings;
  const setAutoPull = (value: boolean) => setSettingsDraft(draft => ({ ...(draft ?? savedSettings), autoPull: value }));
  const setAutoPush = (value: boolean) => setSettingsDraft(draft => ({ ...(draft ?? savedSettings), autoPush: value }));
  const setReadOnly = (value: boolean) => setSettingsDraft(draft => ({ ...(draft ?? savedSettings), readOnly: value }));
  const initialAuthMode: 'https' | 'ssh' = /^(?:ssh:\/\/|[A-Za-z0-9_.-]+@[A-Za-z0-9.-]+:)/.test(cfg.repoUrl || '') ? 'ssh' : 'https';
  const [authModeDraft, setAuthMode] = useState<'https' | 'ssh' | null>(null);
  const authMode = authModeDraft ?? initialAuthMode;
  const [authToken, setAuthToken] = useState('');
  const [sshKey, setSshKey] = useState('');
  const settingsDirty = readOnly !== (cfg.readOnly === true) || autoPull !== (cfg.autoPull !== false) || autoPush !== (cfg.autoPush === true);
  const credentialDirty = authMode !== initialAuthMode || Boolean(authToken.trim() || sshKey.trim());
  useUnsavedChanges(settingsDirty || credentialDirty);
  const [selectedBranch, setSelectedBranch] = useState(cfg.branch || 'main');
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  useEffect(() => {
    setSelectedBranch(cfg.branch || 'main');
  }, [cfg.branch]);

  const statusQ = useQuery<GitStatus>({
    queryKey: ['git-status'],
    queryFn: () => api.getGitStatus() as unknown as Promise<GitStatus>,
    refetchInterval: 30_000,
  });
  const hasConflicts = Boolean(statusQ.data?.conflicts?.length);
  const hasLocalChanges = Boolean(statusQ.data?.changed?.length);

  const branchesQ = useQuery<GitBranches>({
    queryKey: ['git-branches'],
    queryFn: () => api.getGitBranches() as unknown as Promise<GitBranches>,
  });

  const allBranches = (() => {
    const b = branchesQ.data;
    if (!b) return [];
    const list = new Set<string>([
      ...asArray<string>(b.local),
      ...asArray<string>(b.remote).map((x) => x.replace(/^origin\//, '')),
    ]);
    return Array.from(list);
  })();

  const disconnect = useMutation({
    mutationFn: () => api.gitDisconnect(),
    onSuccess: () => {
      setConfirmDisconnect(false);
      showToast(t('git.disconnected'), 'success');
      qc.invalidateQueries({ queryKey: ['git-config'] });
    },
  });

  const fetchRemote = useMutation({
    mutationFn: () => apiFetch('/playbooks-git/fetch', {method:'POST'}),
    onSuccess: () => {
      void qc.invalidateQueries({queryKey:['git-status']});
      void qc.invalidateQueries({queryKey:['git-branches']});
    },
  });

  const refreshImportedPlaybooks = () => Promise.all([
    qc.invalidateQueries({ queryKey: ['playbooks'] }),
    qc.invalidateQueries({ queryKey: ['playbook'] }),
    qc.invalidateQueries({ queryKey: ['git-branches'] }),
  ]);

  const pull = useMutation({
    mutationFn: () => api.gitPull(),
    onMutate: () => setStatusMsg(t('git.pulling')),
    onSuccess: () => { void refreshImportedPlaybooks(); setStatusMsg(t('git.pullSuccess')); qc.invalidateQueries({ queryKey: ['git-log'] }); qc.invalidateQueries({ queryKey: ['git-status'] }); },
    onError: (e) => setStatusMsg(t('git.pullFailed', { msg: (e as Error).message })),
  });

  const push = useMutation({
    mutationFn: () => api.gitPush(),
    onMutate: () => setStatusMsg(t('git.pushing')),
    onSuccess: () => { setStatusMsg(t('git.pushSuccess')); qc.invalidateQueries({ queryKey: ['git-log'] }); qc.invalidateQueries({ queryKey: ['git-status'] }); },
    onError: (e) => setStatusMsg(t('git.pushFailed', { msg: (e as Error).message })),
  });

  const checkout = useMutation({
    mutationFn: (branch: string) => api.gitCheckout(branch),
    onMutate: (branch) => setStatusMsg(t('git.switchingTo', { branch })),
    onSuccess: (_d, branch) => {
      void refreshImportedPlaybooks();
      setStatusMsg(t('git.switchedTo', { branch }));
      qc.invalidateQueries({ queryKey: ['git-config'] });
      qc.invalidateQueries({ queryKey: ['git-log'] }); qc.invalidateQueries({ queryKey: ['git-status'] });
    },
    onError: (e) => setStatusMsg(t('git.checkoutFailed') + (e as Error).message),
  });

  const saveSettings = useMutation({
    mutationFn: () => api.saveGitSettings({ autoPull, autoPush, readOnly }),
    onSuccess: () => {
      qc.setQueryData<GitConfig>(['git-config'], current => current ? {...current, autoPull, autoPush, readOnly} : current);
      setSettingsDraft(null);
      showToast(t('git.saved'), 'success');
      qc.invalidateQueries({ queryKey: ['git-config'] });
    },
    onError: (e) => showToast(t('common.errorPrefix', { msg: (e as Error).message }), 'error'),
  });
  const saveCredentials = useMutation({
    mutationFn: () => api.saveGitConfig({
      credentialMode: authMode,
      authToken: authMode === 'https' ? authToken.trim() : undefined,
      sshKey: authMode === 'ssh' ? sshKey.trim() : undefined,
    }),
    onSuccess: () => {
      setAuthToken('');
      setSshKey('');
      showToast('Git credentials updated.', 'success');
      qc.invalidateQueries({ queryKey: ['git-config'] });
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });

  return (
    <div className="space-y-4">
      <SettingsSection icon={<GitBranch className="h-4 w-4" />} title={workspace ? 'Playbook Git workspace' : 'Playbook Git configuration'} description="This installation · shared playbook repository across environments">
        {!workspace && <div className="flex justify-end pt-3">
          <Button variant="destructive" size="sm" onClick={() => setConfirmDisconnect(true)}>
            <Unplug className="h-4 w-4" /> {t('git.disconnectBtn')}
          </Button>
        </div>}

        <SettingsRow label={t('git.connectedRemote')} hint={t('git.connectedRemoteSmall')}>
          <code className="break-all text-xs text-muted-foreground">{cfg.repoUrl}</code>
        </SettingsRow>

        {workspace && <>
        <SettingsRow label="Working copy" hint="Local status is refreshed every 30 seconds. Last pull is the last successful import, not a check of the remote repository.">
          {statusQ.isError ? <QueryErrorState compact title="Git status unavailable" error={statusQ.error} onRetry={() => void statusQ.refetch()} /> : statusQ.isLoading ? <SkeletonRow /> : <div className="min-w-0 space-y-1 text-xs">
            <p>Branch: {statusQ.data?.branch || 'Not initialized'} · Revision: <code>{statusQ.data?.revision?.slice(0, 12) || 'No commits'}</code></p>
            <p className="text-muted-foreground">Last successful pull: {formatDateTime(statusQ.data?.lastPullAt)}</p>
            <p className={hasLocalChanges ? 'text-warning' : 'text-muted-foreground'}>{hasConflicts ? 'Local merge conflicts require resolution before synchronization.' : hasLocalChanges ? `${statusQ.data?.changed?.length} local ${statusQ.data?.changed?.length === 1 ? 'change' : 'changes'} — commit/push or resolve before pulling or switching branches.` : 'No local changes reported.'}</p>
            <GitSyncState comparison={statusQ.data?.comparison} lastFetchAt={statusQ.data?.lastFetchAt} conflicts={statusQ.data?.conflicts} />
            <Button variant="outline" size="sm" disabled={fetchRemote.isPending || pull.isPending || push.isPending || checkout.isPending} onClick={() => fetchRemote.mutate()}>{fetchRemote.isPending ? 'Checking remote…' : 'Check remote'}</Button>
            <p className="text-muted-foreground">Refreshes remote references only. Does not import, commit or publish files.</p>
            {fetchRemote.isError && <p role="alert" className="text-destructive">Remote check failed: {fetchRemote.error.message}</p>}

            {hasLocalChanges && <details><summary className="cursor-pointer">Changed files</summary><ul className="max-h-40 overflow-auto font-mono">{statusQ.data?.changed?.map((change) => <li key={change.file}>{change.status} {change.file}</li>)}</ul></details>}
          </div>}
        </SettingsRow>

        </>}
        {!workspace && <>
        <SettingsRow label="Authentication" hint="The repository URL determines the authentication transport. Configure a matching remote URL to change transport. Saved credentials remain masked.">
          <div className="space-y-2">
            <div className="inline-flex rounded-sm border p-0.5" role="radiogroup" aria-label="Git authentication method">
              <button type="button" role="radio" disabled={saveCredentials.isPending || initialAuthMode !== 'https'} aria-checked={authMode === 'https'} onClick={() => setAuthMode('https')} className={`rounded-sm px-3 py-1.5 text-xs font-medium ${authMode === 'https' ? 'bg-accent text-foreground' : 'text-muted-foreground'}`}>HTTPS token</button>
              <button type="button" role="radio" disabled={saveCredentials.isPending || initialAuthMode !== 'ssh'} aria-checked={authMode === 'ssh'} onClick={() => setAuthMode('ssh')} className={`rounded-sm px-3 py-1.5 text-xs font-medium ${authMode === 'ssh' ? 'bg-accent text-foreground' : 'text-muted-foreground'}`}>SSH key</button>
            </div>
            {authMode === 'https' ? (
              <Input aria-label="New HTTPS token" disabled={saveCredentials.isPending} type="password" autoComplete="new-password" value={authToken} onChange={(event) => { setAuthMode(authMode); setAuthToken(event.target.value); }} placeholder={cfg.hasToken ? 'Saved token · enter a replacement' : 'Enter HTTPS token'} className="max-w-md" />
            ) : (
              <Textarea aria-label="New SSH private key" disabled={saveCredentials.isPending} value={sshKey} onChange={(event) => { setAuthMode(authMode); setSshKey(event.target.value); }} rows={5} autoComplete="new-password" placeholder={cfg.hasSshKey ? 'Saved SSH key · enter a replacement' : 'Paste an OpenSSH private key'} className="max-w-md font-mono text-xs" />
            )}
            <Button type="button" variant="outline" size="sm" onClick={() => saveCredentials.mutate()} disabled={!credentialDirty || saveCredentials.isPending || authMode !== initialAuthMode || (authMode !== initialAuthMode && !(authMode === 'https' ? authToken.trim() : sshKey.trim()))}>
              <Save /> Save credentials
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled={!credentialDirty || saveCredentials.isPending} onClick={() => {setAuthMode(null);setAuthToken('');setSshKey('');saveCredentials.reset();}}>Discard credential changes</Button>
            {saveCredentials.isError && <p role="alert" className="text-sm text-destructive">{saveCredentials.error.message}</p>}
          </div>
        </SettingsRow>

        </>}
        {workspace && <>
        <SettingsRow label={t('git.branch')} hint={t('git.activeBranchSmall')}>
          {branchesQ.isError ? (
            <QueryErrorState
              compact
              className="py-3"
              error={branchesQ.error}
              title="Git branches could not be loaded"
              onRetry={() => void branchesQ.refetch()}
            />
          ) : (
            <>
              <select
                aria-label="Git branch"
                disabled={branchesQ.isFetching || checkout.isPending || pull.isPending || push.isPending}
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="h-9 w-full min-w-0 rounded-md border border-input bg-background px-2 text-sm sm:w-auto sm:min-w-[160px]"
              >
                {!allBranches.includes(selectedBranch) && <option value={selectedBranch} disabled>{branchesQ.isLoading ? 'Loading branches…' : `${selectedBranch || 'Selected branch'} — unavailable`}</option>}
                {allBranches.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              <Button variant="secondary" size="sm" onClick={() => checkout.mutate(selectedBranch)} disabled={!allBranches.includes(selectedBranch) || branchesQ.isFetching || (selectedBranch === cfg.branch && selectedBranch === statusQ.data?.branch) || fetchRemote.isPending || checkout.isPending || branchesQ.isLoading || hasLocalChanges || statusQ.isError || statusQ.isLoading || pull.isPending || push.isPending}>
                {checkout.isPending ? t('git.switchingTo', {branch:selectedBranch}) : t('git.switchBranch')}
              </Button>
            </>
          )}
        </SettingsRow>

        <SettingsRow label={t('git.syncManual')} hint="Pull imports only a clean fast-forward. Push commits pending local files and publishes them to the selected branch.">
          <Button variant="secondary" size="sm" onClick={() => pull.mutate()} disabled={fetchRemote.isPending || pull.isPending || push.isPending || checkout.isPending || hasLocalChanges || statusQ.isError || statusQ.isLoading}>
            <ArrowDown className="h-4 w-4" /> {t('git.pull')}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => push.mutate()} disabled={fetchRemote.isPending || push.isPending || pull.isPending || checkout.isPending || cfg.readOnly || settingsDirty || hasConflicts || statusQ.isError || statusQ.isLoading}>
            <ArrowUp className="h-4 w-4" /> {t('git.push')}
          </Button>
          {statusMsg && <span role="status" className="ml-1 text-xs text-muted-foreground">{statusMsg}</span>}
        </SettingsRow>

        </>}
        {!workspace && <>
        <SettingsRow label={t('git.autoPull')} hint={t('git.autoPullHint')}>
          <Switch aria-label={t('git.autoPull')} checked={autoPull} disabled={saveSettings.isPending} onCheckedChange={setAutoPull} />
        </SettingsRow>
        <SettingsRow label="Remote read-only" hint="Pull and local edits remain available. Manual and automatic pushes are blocked by the server. Use a read-only repository credential for additional protection.">
        <Switch aria-label="Remote read-only" checked={readOnly} disabled={saveSettings.isPending} onCheckedChange={(value) => { setReadOnly(value); if (value) setAutoPush(false); }} />
      </SettingsRow>
      <SettingsRow label={t('git.autoPush')} hint="Opt in to automatically commit and push saved playbook changes to the selected remote branch.">
          <Switch aria-label={t('git.autoPush')} checked={autoPush} disabled={readOnly || saveSettings.isPending} onCheckedChange={setAutoPush} />
        </SettingsRow>
        <SettingsRow noBorder>
          {settingsDirty && <p role="status" className="text-sm">Unsaved Git settings</p>}
          <Button size="sm" onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending || !settingsDirty}>
            <Save className="h-4 w-4" /> {t('git.saveSettings')}
          </Button>
          <Button size="sm" variant="ghost" disabled={!settingsDirty || saveSettings.isPending} onClick={() => {setSettingsDraft(null);saveSettings.reset();}}>Discard settings changes</Button>
          {saveSettings.isError && <p role="alert" className="text-sm text-destructive">{saveSettings.error.message}</p>}
        </SettingsRow>
        <p className="py-2 text-sm">{readOnly ? 'Push is blocked.' : autoPush ? 'Saved playbook changes are automatically committed and pushed.' : 'Manual push is allowed.'} {autoPull ? 'Automatic pull is enabled.' : 'Pull is manual.'}</p><Link to="/playbooks" hash="tab=git" className="text-sm text-primary hover:underline">Open Git workspace: synchronize, switch branches and view commits</Link>
        </>}
      </SettingsSection>

      {workspace && <GitLogPanel />}

      <Dialog open={confirmDisconnect} onOpenChange={(open) => { if (!disconnect.isPending) setConfirmDisconnect(open); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t('git.disconnectBtn')}</DialogTitle></DialogHeader>
          <p className="text-sm">{t('git.disconnectConfirm')}</p>
          {disconnect.isError && <p role="alert" className="text-sm text-destructive">{disconnect.error.message}</p>}
          <DialogFooter>
            <Button variant="secondary" disabled={disconnect.isPending} onClick={() => setConfirmDisconnect(false)}>{t('common.cancel')}</Button>
            <Button
              variant="destructive"
              disabled={disconnect.isPending}
              onClick={() => disconnect.mutate()}
            >{t('git.disconnectBtn')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Git log (paginated)
// ─────────────────────────────────────────────────────────────

interface GitCommitItem {
  hash: string;
  message: string;
  author: string;
  date: string;
}
interface GitLogResp {
  items?: GitCommitItem[];
  pagination?: {
    page?: number; limit?: number; total?: number; total_pages?: number;
    has_prev?: boolean; has_next?: boolean;
  };
}

function GitLogPanel() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const logQ = useQuery<GitLogResp>({
    queryKey: ['git-log', page, limit],
    queryFn: () => api.getGitLog(page, limit) as unknown as Promise<GitLogResp>,
  });

  const commits = asArray<NonNullable<GitLogResp['items']>[number]>(logQ.data?.items);
  const pag = logQ.data?.pagination || { has_prev: false, has_next: false, total: 0 };
  const displayedPage = pag.page ?? page;

  let metaText = '';
  if (logQ.isLoading) metaText = t('git.loadingCommits');
  else if (logQ.isError) metaText = t('git.loadFailed');
  else if (!pag.total) metaText = '';
  else {
    const start = (displayedPage - 1) * limit + 1;
    const end = start + commits.length - 1;
    metaText = t('git.showingRange', { start, end, total: pag.total });
  }

  return (
    <SettingsSection icon={<GitCommit className="h-4 w-4" />} title={t('git.recentCommits')}>
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 pb-2">
        <span className="text-xs text-muted-foreground">{metaText}</span>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{t('git.perPage')}</span>
            <select
              value={limit}
              onChange={(e) => { setLimit(parseInt(e.target.value, 10) || 10); setPage(1); }}
              className="h-7 rounded-md border border-input bg-background px-1.5 text-xs"
            >
              {[10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <Button variant="secondary" size="sm" onClick={() => setPage(Math.max(1, displayedPage - 1))} disabled={logQ.isFetching || !pag.has_prev}>
            {t('git.prev')}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setPage(displayedPage + 1)} disabled={logQ.isFetching || !pag.has_next}>
            {t('git.next')}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => logQ.refetch()} disabled={logQ.isFetching}>
            <RotateCw className="h-4 w-4" /> {t('git.refresh')}
          </Button>
        </div>
      </div>

      {logQ.isError ? (
        <QueryErrorState compact error={logQ.error} title={t('git.loadFailed')} onRetry={() => void logQ.refetch()} />
      ) : logQ.isLoading && commits.length === 0 ? (
        <div className="py-2">
          <SkeletonRow cols={3} />
          <SkeletonRow cols={3} />
          <SkeletonRow cols={3} />
        </div>
      ) : commits.length === 0 ? (
        <EmptyState
          compact
          icon={<GitCommit className="h-5 w-5" />}
          title={t('git.noCommitsYet')}
        />
      ) : (
        <div className="font-mono text-xs">
          {commits.map((c, i) => (
            <div key={c.hash + i} className="flex items-start gap-2.5 border-b border-border/60 py-2 last:border-b-0">
              <code className="flex-shrink-0 text-[11px] text-primary">{c.hash}</code>
              <div className="min-w-0 flex-1">
                <div className="whitespace-pre-wrap break-words text-xs text-foreground">{c.message}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-1 break-words text-[11px] text-muted-foreground">
                  <User className="h-2.5 w-2.5" /> {c.author} · Authored {formatDateTime(c.date)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </SettingsSection>
  );
}
