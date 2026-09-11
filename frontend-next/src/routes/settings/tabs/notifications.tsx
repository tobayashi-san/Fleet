import { QueryErrorState } from '@/components/ui/query-error-state';
import { formatDateTime } from '@/lib/utils';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Globe, Mail, Bell, Save, Send } from 'lucide-react';
import { api, apiFetch } from '@/lib/api';
import { showToast } from '@/lib/toast';
import { useSettings } from '@/lib/queries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { SettingsRow, SettingsSection } from '../_row';
import { useUnsavedChanges } from '@/lib/use-unsaved-changes';

interface WhiteLabel {
  webhookUrl?: string;
  webhookSecret?: string;
  smtpHost?: string;
  smtpPort?: string | number;
  smtpUser?: string;
  hasSmtpPassword?: boolean;
  smtpFrom?: string;
  smtpTo?: string;
  notifDedupeMinutes?: number;
  notifSuppressMaintenance?: boolean;
  notifPlaybookFailed?: boolean;
  notifUpdateFailed?: boolean;
  notifResourceAlerts?: boolean;
}

export function NotificationsTab() {
  const { t } = useTranslation();
  const settingsQuery = useSettings();
  const wl = (settingsQuery.data as unknown as WhiteLabel) || {};
  if (settingsQuery.isPending) return <p role="status" className="text-sm text-muted-foreground">Loading notification settings…</p>;
  if (settingsQuery.isError && !settingsQuery.data) return <QueryErrorState title="Notification settings unavailable" error={settingsQuery.error} onRetry={() => void settingsQuery.refetch()} />;

  return (
    <div className="space-y-4">
      {settingsQuery.isError && <QueryErrorState compact title="Notification settings could not be refreshed" error={settingsQuery.error} onRetry={() => void settingsQuery.refetch()} />}
      <fieldset disabled={settingsQuery.isError} className="contents">
      <SettingsSection icon={<Globe className="h-4 w-4" />} title={t('set.webhooks')}>
        <WebhookForm wl={wl} />
      </SettingsSection>

      <SettingsSection icon={<Mail className="h-4 w-4" />} title={t('set.smtp')}>
        <SmtpForm wl={wl} />
      </SettingsSection>

      <SettingsSection
        icon={<Bell className="h-4 w-4" />}
        title={t('set.notificationEvents')}
        description={t('set.notificationEventsHint')}
      >
        <NotificationToggles wl={wl} />
      </SettingsSection>
      <DeliveryHistory />
      </fieldset>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Webhook
// ─────────────────────────────────────────────────────────────

function WebhookForm({ wl }: { wl: WhiteLabel }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [urlDraft, setUrl] = useState<string | null>(null);
  const url = urlDraft ?? wl.webhookUrl ?? '';
  const [secret, setSecret] = useState<string | null>(null);
  const dirty = url !== (wl.webhookUrl || '') || secret !== null;
  useUnsavedChanges(dirty);


  const save = useMutation({
    mutationFn: () => api.saveSettings({ webhookUrl: url.trim(), ...(secret !== null ? {webhookSecret: secret} : {}) }),
    onSuccess: () => {
      qc.setQueryData(['settings'], (previous:WhiteLabel | undefined) => ({...previous,webhookUrl:url.trim(),webhookSecret:secret === null ? previous?.webhookSecret : secret ? '••••••••' : ''}));
      setUrl(null);
      setSecret(null);
      test.reset();
      showToast(t('set.webhookSaved'), 'success');
      qc.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: () => showToast(t('set.toastErrorSave'), 'error'),
  });

  const test = useMutation({
    mutationFn: () => api.testWebhook(),
    onSuccess: () => showToast(t('set.webhookTestOk'), 'success'),
    onError: (e) => showToast(t('set.webhookTestFail') + ((e as Error).message ? ': ' + (e as Error).message : ''), 'error'),
  });

  return (
    <form onSubmit={(event) => { event.preventDefault(); if (!save.isPending && !test.isPending && dirty) save.mutate(); }} className="contents">
      <SettingsRow label={t('set.webhookUrl')} hint={t('set.webhookUrlHint')}>
        <Input
          aria-label={t('set.webhookUrl')}
          name="webhookUrl"
          type="url"
          disabled={save.isPending || test.isPending}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://discord.com/api/webhooks/…"
          className="max-w-md"
        />
      </SettingsRow>

      <SettingsRow label={t('set.webhookSecret')} hint="Leave unchanged to keep the saved secret. Enter a replacement or explicitly remove it.">
        <Input
          aria-label={t('set.webhookSecret')}
          name="webhookSecret"
          type="password"
          disabled={save.isPending || test.isPending}
          value={secret ?? ''}
          onChange={(e) => setSecret(e.target.value)}
          placeholder={wl.webhookSecret ? 'Saved secret · leave unchanged to keep' : 'Optional secret'}
          autoComplete="new-password"
          className="max-w-md"
        />
      </SettingsRow>

      {secret === '' && <p role="status" className="text-sm text-warning">The saved webhook secret will be removed when you save.</p>}
      {save.isError && <p role="alert" className="text-sm text-destructive">{save.error.message}</p>}
      <SettingsRow noBorder>
        <Button type="submit" size="sm" disabled={save.isPending || test.isPending || !dirty}>
          <Save className="h-4 w-4" /> Save webhook
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => test.mutate()} disabled={test.isPending || save.isPending || dirty || !url.trim()}>
          <Send className="h-4 w-4" /> Test webhook
        </Button>
        {wl.webhookSecret && <Button type="button" variant="outline" size="sm" disabled={save.isPending || test.isPending || secret === ''} onClick={() => setSecret('')}>Remove saved secret</Button>}
        {dirty && <Button type="button" variant="outline" size="sm" disabled={save.isPending || test.isPending} onClick={() => {setUrl(null);setSecret(null);}}>Discard webhook changes</Button>}
      </SettingsRow>
      <SettingsRow label="Test status" hint="Tests use the saved channel configuration.">
        <p role="status" className="text-xs text-muted-foreground">{dirty ? 'Save your changes before testing this channel.' : test.isPending ? 'Sending test notification…' : test.isSuccess ? `Test from ${formatDateTime(test.submittedAt)} accepted by the channel. Verify receipt at the destination.` : test.isError ? `Test failed at ${formatDateTime(test.submittedAt)}: ${(test.error as Error).message}` : 'No test performed in this session.'}</p>
      </SettingsRow>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────
// SMTP
// ─────────────────────────────────────────────────────────────

function SmtpForm({ wl }: { wl: WhiteLabel }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const saved = {host:wl.smtpHost || '',port:String(wl.smtpPort || '587'),user:wl.smtpUser || '',from:wl.smtpFrom || '',to:wl.smtpTo || ''};
  const [draft, setDraft] = useState<typeof saved | null>(null);
  const {host,port,user,from,to} = draft ?? saved;
  const update = (key:keyof typeof saved,value:string) => setDraft({...draft ?? saved,[key]:value});
  const [pass, setPass] = useState<string | null>(null);
  const dirty = JSON.stringify(draft ?? saved) !== JSON.stringify(saved) || pass !== null;
  useUnsavedChanges(dirty);

  const save = useMutation({
    mutationFn: () => api.saveSettings({
      smtpHost: host.trim(),
      smtpPort: port.trim(),
      smtpUser: user.trim(),
      smtpFrom: from.trim(),
      smtpTo:   to.trim(),
      ...(pass !== null ? { smtpPass: pass } : {}),
    }),
    onSuccess: () => {
      test.reset();
      showToast(t('set.smtpSaved'), 'success');
      qc.setQueryData(['settings'], (previous:WhiteLabel | undefined) => ({...previous,smtpHost:host.trim(),smtpPort:port.trim(),smtpUser:user.trim(),smtpFrom:from.trim(),smtpTo:to.trim(),hasSmtpPassword:pass === null ? previous?.hasSmtpPassword : Boolean(pass)}));
      setPass(null);
      setDraft(null);
      qc.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: () => showToast(t('set.toastErrorSave'), 'error'),
  });

  const test = useMutation({
    mutationFn: () => api.testSmtp(),
    onSuccess: () => showToast(t('set.smtpTestOk'), 'success'),
    onError: (e) => showToast(t('set.smtpTestFail') + ((e as Error).message ? ': ' + (e as Error).message : ''), 'error'),
  });

  return (
    <form onSubmit={(event) => { event.preventDefault(); if (!save.isPending && !test.isPending && dirty) save.mutate(); }} className="contents">
      <SettingsRow label={t('set.smtpHost')} hint="Enter a hostname or IP address. Port 465 uses implicit TLS; other ports use STARTTLS when offered by the server.">
        <div className="grid w-full max-w-md grid-cols-1 gap-2 sm:grid-cols-[1fr_90px]">
          <Input disabled={save.isPending || test.isPending} aria-label={t('set.smtpHost')} name="smtpHost" value={host} onChange={(e) => update('host',e.target.value)} placeholder="smtp.example.com" />
          <Input disabled={save.isPending || test.isPending} aria-label={`${t('set.smtpHost')} port`} name="smtpPort" value={port} onChange={(e) => update('port',e.target.value)} type="number" min={1} max={65535} step={1} required placeholder="587" />
        </div>
      </SettingsRow>
      <SettingsRow label={t('set.smtpUser')}>
        <Input disabled={save.isPending || test.isPending} aria-label={t('set.smtpUser')} name="smtpUsername" value={user} onChange={(e) => update('user',e.target.value)} placeholder="user@example.com" autoComplete="username" className="max-w-md" />
      </SettingsRow>
      <SettingsRow label={t('set.smtpPass')} hint="Leave unchanged to retain the stored password. Enter a replacement or explicitly remove it.">
        <Input disabled={save.isPending || test.isPending} aria-label={t('set.smtpPass')} name="smtpPassword" type="password" value={pass ?? ''} onChange={(e) => setPass(e.target.value)} placeholder={wl.hasSmtpPassword ? 'Saved password · leave unchanged to keep' : 'No saved password'} autoComplete="new-password" className="max-w-md" />
      </SettingsRow>
      <SettingsRow label={t('set.smtpFrom')}>
        <Input disabled={save.isPending || test.isPending} aria-label={t('set.smtpFrom')} name="smtpFrom" type="email" value={from} onChange={(e) => update('from',e.target.value)} placeholder="shipyard@example.com" className="max-w-md" />
      </SettingsRow>
      <SettingsRow label={t('set.smtpTo')} hint={t('set.smtpToHint')}>
        <Input disabled={save.isPending || test.isPending} aria-label={t('set.smtpTo')} name="smtpTo" type="email" multiple value={to} onChange={(e) => update('to',e.target.value)} placeholder="admin@example.com" className="max-w-md" />
      </SettingsRow>
      {pass === '' && <p role="status" className="text-sm text-warning">The saved SMTP password will be removed when you save.</p>}
      {save.isError && <p role="alert" className="text-sm text-destructive">{save.error.message}</p>}
      <SettingsRow noBorder>
        <Button type="submit" size="sm" disabled={save.isPending || test.isPending || !dirty}>
          <Save className="h-4 w-4" /> Save email settings
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => test.mutate()} disabled={test.isPending || save.isPending || dirty || !host.trim() || !to.trim()}>
          <Send className="h-4 w-4" /> Test email
        </Button>
        {wl.hasSmtpPassword && <Button type="button" size="sm" variant="outline" disabled={save.isPending || test.isPending || pass === ''} onClick={() => setPass('')}>Remove SMTP password</Button>}
        {dirty && <Button type="button" size="sm" variant="outline" disabled={save.isPending || test.isPending} onClick={() => {setDraft(null);setPass(null);}}>Discard email changes</Button>}
      </SettingsRow>
      <SettingsRow label="Test status" hint="Tests use the saved channel configuration.">
        <p role="status" className="text-xs text-muted-foreground">{dirty ? 'Save your changes before testing this channel.' : test.isPending ? 'Sending test notification…' : test.isSuccess ? `Test from ${formatDateTime(test.submittedAt)} accepted by the channel. Verify receipt at the destination.` : test.isError ? `Test failed at ${formatDateTime(test.submittedAt)}: ${(test.error as Error).message}` : 'No test performed in this session.'}</p>
      </SettingsRow>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────
// Notification toggles
// ─────────────────────────────────────────────────────────────

function NotificationToggles({ wl }: { wl: WhiteLabel }) {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const items: { key: 'notifPlaybookFailed' | 'notifUpdateFailed' | 'notifResourceAlerts'; label: string; hint: string; inactive?: boolean }[] = [
    { key: 'notifPlaybookFailed', label: t('set.notifyPlaybookFailure'), hint: t('set.notifyPlaybookFailureHint') },
    { key: 'notifUpdateFailed',   label: t('set.notifyUpdateFailure'),   hint: t('set.notifyUpdateFailureHint') },
    { key: 'notifResourceAlerts', label: t('set.notifyResourceAlerts'), hint: 'Monitoring is inactive in this build. This retained preference does not send alerts.', inactive: true },
  ];

  const save = useMutation({
    mutationFn: (patch: Partial<WhiteLabel>) => api.saveSettings(patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
    onError: () => showToast(t('set.toastErrorSave'), 'error'),
  });

  return (
    <>
      <SettingsRow label="Suppress identical repeats" hint="After channel acceptance, suppress identical events in the same known environment for this period. Changed messages and later attempts after failed delivery are not suppressed. Tests bypass suppression. The cache resets when Shipyard restarts.">
        <select aria-label="Duplicate suppression period" className="h-9 rounded-sm border border-input bg-background px-3 text-sm" disabled={save.isPending} value={wl.notifDedupeMinutes || 0} onChange={event => save.mutate({notifDedupeMinutes:Number(event.target.value)})}>
          {[...new Set([0,1,5,15,30,60,wl.notifDedupeMinutes || 0])].sort((a,b)=>a-b).map(minutes=><option key={minutes} value={minutes}>{minutes ? `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}` : 'Disabled'}</option>)}
        </select>
      </SettingsRow>
      <SettingsRow label="Suppress during maintenance" hint="Suppress host-related notifications only when all recorded hosts are covered by active maintenance in their environment. Entire-environment windows cover all current hosts; impact notes do not narrow scope. Unknown targets and channel tests are still sent. Suppressed events remain in delivery history.">
        <Switch aria-label="Suppress during maintenance" checked={wl.notifSuppressMaintenance === true} disabled={save.isPending} onCheckedChange={value => save.mutate({notifSuppressMaintenance:value})} />
      </SettingsRow>
      {items.map((it, i) => (
        <SettingsRow
          key={it.key}
          label={it.label}
          hint={it.hint}
          noBorder={i === items.length - 1}
        >
          <Switch
            aria-label={it.label}
            disabled={save.isPending || it.inactive}
            checked={wl[it.key] !== false}
            onCheckedChange={(v) => save.mutate({ [it.key]: v })}
          />
        </SettingsRow>
      ))}
      {save.isPending && <p role="status" className="py-2 text-xs text-muted-foreground">Saving notification preferences…</p>}
      {save.isError && <p role="alert" className="py-2 text-sm text-destructive">Notification preferences were not saved: {(save.error as Error).message}</p>}
    </>
  );
}


function DeliveryHistory() {
  const [page, setPage] = useState(1);
  const history = useQuery({
    queryKey: ['notification-deliveries', page],
    queryFn: () => apiFetch<{ items: Array<{ id: string; channel: string; destination: string; event_title: string; status: string; status_code: number | null; duration_ms: number; created_at: string }>; total: number; total_pages: number }>(`/system/notification-deliveries?page=${page}`),
    refetchInterval: 30_000,
  });
  return <SettingsSection icon={<Bell className="h-4 w-4" />} title="Delivery history" description="Global notification channels · up to 1,000 attempts from the last 30 days. Duplicate suppressed means no new send was attempted. Accepted means the endpoint accepted the request, not that a person read it.">
    <div className="space-y-3 py-3">
      <Button type="button" variant="outline" size="sm" disabled={history.isFetching} onClick={() => void history.refetch()}>Refresh history</Button>
      {history.isPending ? <p role="status" className="text-sm">Loading delivery attempts…</p> : history.isError ? <QueryErrorState compact error={history.error} title="Delivery history unavailable" onRetry={() => void history.refetch()} /> : <>
        {!history.data.items.length ? <p className="text-sm text-muted-foreground">No recorded attempts on this page. History begins with this feature; earlier deliveries are not reconstructed.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr>{['Time', 'Channel / destination', 'Event', 'Result'].map(label => <th key={label} className="border-b px-2 py-2">{label}</th>)}</tr></thead><tbody>{history.data.items.map(item => <tr key={item.id}><td className="border-b px-2 py-2">{formatDateTime(item.created_at)}</td><td className="border-b px-2 py-2">{item.channel.toUpperCase()}<span className="block text-muted-foreground">{item.destination}</span></td><td className="border-b px-2 py-2">{item.event_title}</td><td className="border-b px-2 py-2"><span className={['failed','partial'].includes(item.status) ? 'text-destructive' : 'text-muted-foreground'}>{item.status === 'maintenance' ? 'Maintenance suppressed' : item.status === 'suppressed' ? 'Duplicate suppressed' : item.status === 'partial' ? 'Some recipients rejected' : item.status === 'failed' ? 'Failed' : item.status === 'accepted' ? 'Accepted' : 'Unknown'}</span>{item.status_code ? ` · HTTP ${item.status_code}` : ''}<span className="block text-muted-foreground">{item.duration_ms} ms</span></td></tr>)}</tbody></table></div>}
        <div className="flex items-center justify-between gap-3 text-xs"><Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><span>Page {page} / {history.data.total_pages} · {history.data.total} attempts</span><Button type="button" size="sm" variant="outline" disabled={page >= history.data.total_pages} onClick={() => setPage(page + 1)}>Next</Button></div>
      </>}
    </div>
  </SettingsSection>;
}
