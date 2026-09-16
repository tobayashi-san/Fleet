import { formatDateTime } from '@/lib/utils';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Puzzle, RotateCw, AlertTriangle, CircleAlert } from 'lucide-react';
import { api } from '@/lib/api';
import { showToast } from '@/lib/toast';
import { usePlugins, type PluginInfo } from '@/lib/queries';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { SkeletonRow } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { SettingsRow, SettingsSection } from '../_row';

export function PluginsTab() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: plugins, isLoading, isError, error, refetch } = usePlugins();

  const reload = useMutation({
    mutationFn: () => api.reloadPlugins(),
    onSuccess: (result) => {
      showToast(result.success ? t('set.pluginsReloaded') : `${result.summary.failed.length} plugin(s) failed to load. Review the results below.`, result.success ? 'success' : 'error');
      qc.invalidateQueries({ queryKey: ['plugins'] });
    },
    onError: (e) => showToast(t('common.errorPrefix', { msg: (e as Error).message }), 'error'),
  });

  return (
    <div className="space-y-4">
      <SettingsSection
        icon={<Puzzle className="h-4 w-4" />}
        title={t('set.plugins')}
        description={<>{t('set.pluginsHint')} <code>{t('set.pluginsPath')}</code></>}
      >
        <div className="flex justify-end pt-3">
          <Button variant="secondary" size="sm" onClick={() => reload.mutate()} disabled={reload.isPending}>
            <RotateCw className="h-4 w-4" /> {reload.isPending ? 'Reloading…' : t('set.pluginsReload')}
          </Button>
        </div>
        <details className="mx-3 my-2 rounded-md border p-3 text-sm">
          <summary className="cursor-pointer font-medium">Package updates and rollback</summary>
          <p className="mt-2">Packages are installed on the server. Review the package source and retain the previous package and a data backup before replacement, then reload and verify its workflows. Shipyard does not keep an automatic package rollback copy.</p>
          <p className="mt-2">To roll back, restore the reviewed previous package while the server is stopped and restart it. Replacing code does not undo plugin data changes; those require the corresponding data recovery procedure.</p>
        </details>

        {isLoading && (
          <div className="py-2">
            <SkeletonRow cols={3} />
            <SkeletonRow cols={3} />
            <SkeletonRow cols={3} />
          </div>
        )}
        {isError && <QueryErrorState compact error={error} title="Plugin inventory could not be loaded" onRetry={()=>void refetch()}/>}
        {reload.isError && <p role="alert" className="p-3 text-sm text-destructive">{reload.error.message}</p>}
        {reload.isSuccess && <div role="status" className="m-3 space-y-2 rounded-md border p-3 text-sm">
          <p className="font-medium">Reload result: {reload.data.summary.loaded} loaded · {reload.data.summary.failed.length} failed</p>
          {reload.data.summary.failed.map(plugin=><p key={plugin.id} className="break-words text-destructive"><strong>{plugin.id}</strong>: {plugin.error}</p>)}
          <p className="text-xs text-muted-foreground">Checked {formatDateTime(reload.data.summary.checkedAt)}. Registration does not verify plugin workflows. Reload does not roll back code side effects or restore an earlier package version.</p>
        </div>}
        {!isLoading && !isError && plugins && plugins.length === 0 && (
          <EmptyState
            compact
            icon={<Puzzle className="h-5 w-5" />}
            title={t('set.pluginsEmpty')}
            description="Install a reviewed package on the server, then reload to discover it. No plugins are currently available."
          />
        )}
        {!isLoading && !isError && plugins && plugins.length > 0 && (
          <PluginList plugins={plugins} />
        )}
      </SettingsSection>

      <Alert variant="warning">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{t('set.pluginsWarningTitle')}</AlertTitle>
        <AlertDescription>{t('set.pluginsWarningText')}</AlertDescription>
      </Alert>
    </div>
  );
}

function PluginList({ plugins }: { plugins: PluginInfo[] }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [confirmTarget, setConfirmTarget] = useState<PluginInfo | null>(null);
  const [actionError, setActionError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const apply = async (p: PluginInfo, enable: boolean) => {
    setBusyId(p.id);
    setActionError('');
    try {
      if (enable) {
        if(!p.trust?.digest || !p.trust?.scheme)throw new Error('Reload the plugin inventory to obtain package review metadata.');
        await api.enablePlugin(p.id,{digest:p.trust.digest,scheme:p.trust.scheme});
      }
      else await api.disablePlugin(p.id);
      showToast(
        enable
          ? t('set.pluginsEnabledToast', { name: p.name || p.id })
          : t('set.pluginsDisabledToast', { name: p.name || p.id }),
        'success'
      );
      if (enable) setConfirmTarget(null);
      await qc.invalidateQueries({ queryKey: ['plugins'] });
    } catch (err) {
      setActionError(`${p.name || p.id}: ${(err as Error).message}`);
      showToast(t('common.errorPrefix', { msg: (err as Error).message }), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const onToggle = (p: PluginInfo, v: boolean) => {
    if (v) {
      setActionError('');
      setConfirmTarget(p);
    } else {
      void apply(p, false);
    }
  };

  return (
    <>
      {actionError && <p role="alert" className="p-3 text-sm text-destructive">{actionError}</p>}
      {plugins.map((p, i) => (
        <SettingsRow
          key={p.id}
          className="sm:grid-cols-[minmax(0,1fr)_auto]"
          noBorder={i === plugins.length - 1}
          label={
            <span className="flex items-center gap-2">
              {p.name || p.id}
              {p.version && (
                <span className="text-xs font-normal text-muted-foreground">v{String(p.version)}</span>
              )}
            </span>
          }
          hint={
            <>
              {p.description && <span className="block">{p.description}</span>}
              <span className="mt-1 block">Package ID: <code>{p.id}</code> · Source: local installation</span>
              <span className="block">Runtime: {p.loaded ? 'Loaded' : 'Not loaded'} · User access: {p.enabled ? 'Allowed' : 'Blocked'}</span>
              <details className="mt-2"><summary className="cursor-pointer">Technical details</summary>
              {p.packageStatus && <span className="block">Installed version: {p.packageStatus.installedVersion || 'unavailable'} · Last registered version: {p.packageStatus.loadedVersion || 'unavailable'}<span className={p.packageStatus.state === 'reload-required' || p.packageStatus.state === 'unreadable' ? 'block text-amber-600 dark:text-amber-400' : 'block'}>{p.packageStatus.state === 'reload-required' ? 'Installed version differs. Review the package before reloading.' : p.packageStatus.state === 'unreadable' ? 'Installed manifest cannot be read. Review the server package.' : p.packageStatus.state === 'version-unavailable' ? 'Version comparison unavailable: a package version is not declared.' : 'Version labels match; this does not verify unchanged package contents.'} Checked {formatDateTime(p.packageStatus.checkedAt)}.</span></span>}
              <span className="block">Runtime: {p.loaded ? 'Loaded' : 'Not loaded'} · Requirements: {p.compatibility?.status === 'compatible' ? 'Declared version ranges satisfied' : p.compatibility?.status === 'incompatible' ? 'Incompatible — loading blocked' : p.compatibility?.status === 'invalid' ? 'Invalid declaration — loading blocked' : 'Not declared; compatibility is unverified'}</span>
              {p.compatibility?.requirements.map(requirement=><span key={requirement.name} className="block">{requirement.name}: {requirement.current} · Requires {requirement.range} · {requirement.matches ? 'Matches' : 'Does not match'}</span>)}
              {p.loaded && p.hasUi === false && <span className="block">Backend-only package · No web interface</span>}
              {p.loaded && <span className="block">Registration succeeded; plugin workflows still require verification.</span>}
              {p.trust ? <span className="block">Trust: {p.trust.trusted ? 'Digest matches configured allowlist' : 'No matching allowlist entry'} · Policy: {p.trust.policy}<span className="block">Digest scope: {p.trust.scope || 'Not reported by this server'} · Scheme: {p.trust.scheme || 'Unspecified'}</span><code className="mt-1 block break-all text-[10px]">SHA-256 {p.trust.digest}</code></span> : <span className="block">Trust metadata unavailable.</span>}
              </details>
              <span className="mt-1 block">Access: server process privileges. Disabling plugin access does not unload registered server code.</span>
              {!p.loaded && (
                <span className="mt-1 flex items-center gap-1 text-destructive">
                  <CircleAlert className="h-3 w-3" />
                  {p.error || t('set.pluginsLoadError')}
                </span>
              )}
            </>
          }
        >
          {p.enabled && p.hasUi !== false && (
            <Link to="/plugins/$id" params={{ id: p.id }}>
              <Button variant="outline" size="sm">{t('plugins.open')}</Button>
            </Link>
          )}
          <label className="flex items-center gap-2 text-xs">Allow user access<Switch
            checked={!!p.enabled}
            disabled={!p.loaded || busyId !== null}
            aria-label={`Enable access to ${p.name || p.id}`}
            onCheckedChange={(v) => onToggle(p, v)}
          /></label>
          <StatusBadge tone={p.enabled ? 'success' : 'muted'} dot>
            {p.enabled ? t('set.pluginsEnabled') : t('set.pluginsDisabled')}
          </StatusBadge>
        </SettingsRow>
      ))}

      <Dialog
        open={confirmTarget !== null}
        onOpenChange={(v) => { if (!v && busyId === null) setConfirmTarget(null); }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('set.pluginsEnableTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('set.pluginsEnableWarningPre')}{' '}
            <strong>{confirmTarget?.name || confirmTarget?.id || ''}</strong>{' '}
            {t('set.pluginsEnableWarningPost')}
          </p>
          {confirmTarget?.trust && <div className="rounded-md border p-3 text-xs"><p>{confirmTarget.trust.trusted ? 'This package matches the configured digest allowlist.' : 'This package has no matching digest allowlist entry.'}</p><p className="mt-1 break-all font-mono">{confirmTarget.trust.digest}</p><p className="mt-2">The digest describes files checked at load time; it does not monitor later changes. Code runs with the server process privileges. This enables user access; it does not establish a sandbox.</p></div>}
          {actionError && <p role="alert" className="text-sm text-destructive">{actionError}</p>}
          <DialogFooter>
            <Button variant="secondary" disabled={busyId !== null} onClick={() => setConfirmTarget(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              disabled={busyId !== null}
              onClick={() => {
                const p = confirmTarget;
                if (p && busyId === null) void apply(p, true);
              }}
            >
              {busyId !== null ? 'Enabling…' : t('set.pluginsEnableConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
