import { QueryErrorState } from '@/components/ui/query-error-state';
import { formatDateTime } from '@/lib/utils';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Save, Send } from 'lucide-react';
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
  smtpSecurity?: string;
  smtpPort?: string | number;
  smtpUser?: string;
  hasSmtpPassword?: boolean;
  smtpFrom?: string;
  smtpTo?: string;
  notifDedupeMinutes?: number;
  notifPlaybookFailed?: boolean;
  notifUpdateFailed?: boolean;
  notifResourceAlerts?: boolean;
}

function NotificationSection({title, status, dirty = false, children}: {title:string; status:string; dirty?:boolean; children:React.ReactNode}) {
  return <details className="rounded-md border bg-card" data-notification-section>
    <summary className="cursor-pointer p-4 text-sm marker:text-muted-foreground"><span className="font-semibold">{title}</span><span className="mt-1 block pl-4 text-muted-foreground">{status}</span>{dirty && <span role="status" className="mt-1 block pl-4 font-medium text-warning">Unsaved changes · expand to save or discard</span>}</summary>
    <div className="border-t px-4 pb-3">{children}</div>
  </details>;
}

export function NotificationsTab() {
  const settingsQuery = useSettings();
  const wl = (settingsQuery.data as unknown as WhiteLabel) || {};
  if (settingsQuery.isPending) return <p role="status" className="text-sm text-muted-foreground">Loading notification settings…</p>;
  if (settingsQuery.isError && !settingsQuery.data) return <QueryErrorState title="Notification settings unavailable" error={settingsQuery.error} onRetry={() => void settingsQuery.refetch()} />;

  return (
    <div className="space-y-4">
      {settingsQuery.isError && <QueryErrorState compact title="Notification settings could not be refreshed" error={settingsQuery.error} onRetry={() => void settingsQuery.refetch()} />}
      <section aria-label="Notification overview" className="flex flex-wrap gap-x-4 gap-y-1 rounded-md border px-4 py-3 text-sm">
        <h2 className="font-semibold">Channels</h2>
        <span>Webhook: {wl.webhookUrl ? 'Configured' : 'Not configured'}</span>
        <span>Email: {wl.smtpHost && wl.smtpTo ? 'Configured' : 'Not configured'}</span>
      </section>
      <fieldset disabled={settingsQuery.isError} className="min-w-0 space-y-4">
      <WebhookForm wl={wl} />
      <SmtpForm wl={wl} />
      <NotificationToggles wl={wl} />
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
    <NotificationSection title="Webhook" dirty={dirty} status={`${wl.webhookUrl ? "Configured" : "Not configured"} · ${test.isPending ? "Testing…" : test.isSuccess ? "Last test accepted" : test.isError ? "Last test failed" : "Not tested in this session"} · Configure webhook`}>
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

      <SettingsRow label={t('set.webhookSecret')} hint="Unchanged fields keep the saved secret.">
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

      {dirty && <p role="status" className="text-sm">Unsaved webhook changes</p>}
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
    </NotificationSection>
  );
}

// ─────────────────────────────────────────────────────────────
// SMTP
// ─────────────────────────────────────────────────────────────

function SmtpForm({ wl }: { wl: WhiteLabel }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const saved = {security:wl.smtpSecurity || (wl.smtpHost ? (String(wl.smtpPort) === '465' ? 'tls' : 'legacy') : 'starttls'),host:wl.smtpHost || '',port:String(wl.smtpPort || '587'),user:wl.smtpUser || '',from:wl.smtpFrom || '',to:wl.smtpTo || ''};
  const [draft, setDraft] = useState<typeof saved | null>(null);
  const {security,host,port,user,from,to} = draft ?? saved;
  const update = (key:keyof typeof saved,value:string) => setDraft({...draft ?? saved,[key]:value});
  const [pass, setPass] = useState<string | null>(null);
  const dirty = JSON.stringify(draft ?? saved) !== JSON.stringify(saved) || pass !== null;
  useUnsavedChanges(dirty);

  const save = useMutation({
    mutationFn: () => api.saveSettings({
      smtpSecurity: security,
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
      qc.setQueryData(['settings'], (previous:WhiteLabel | undefined) => ({...previous,smtpSecurity:security,smtpHost:host.trim(),smtpPort:port.trim(),smtpUser:user.trim(),smtpFrom:from.trim(),smtpTo:to.trim(),hasSmtpPassword:pass === null ? previous?.hasSmtpPassword : Boolean(pass)}));
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
    <NotificationSection title="Email (SMTP)" dirty={dirty} status={`${wl.smtpHost && wl.smtpTo ? "Configured" : "Not configured"} · ${test.isPending ? "Testing…" : test.isSuccess ? "Last test accepted" : test.isError ? "Last test failed" : "Not tested in this session"} · Configure email`}>
    <form onSubmit={(event) => { event.preventDefault(); if (!save.isPending && !test.isPending && dirty) save.mutate(); }} className="contents">
      <SettingsRow label={t('set.smtpHost')} hint="Hostname and port supplied by your mail provider.">
        <div className="grid w-full max-w-md grid-cols-1 gap-2 sm:grid-cols-[1fr_90px]">
          <Input disabled={save.isPending || test.isPending} aria-label={t('set.smtpHost')} name="smtpHost" value={host} onChange={(e) => update('host',e.target.value)} placeholder="smtp.example.com" />
          <Input disabled={save.isPending || test.isPending} aria-label={`${t('set.smtpHost')} port`} name="smtpPort" value={port} onChange={(e) => update('port',e.target.value)} type="number" min={1} max={65535} step={1} required placeholder="587" />
        </div>
      </SettingsRow>
      <SettingsRow label="SMTP transport" hint="This installation · Required STARTTLS refuses delivery if encryption cannot be established."><select aria-label="SMTP transport" className="h-9 rounded-sm border bg-background px-3 text-sm" disabled={save.isPending || test.isPending} value={security} onChange={e => update('security',e.target.value)}><option value="starttls">Required STARTTLS (usually 587)</option><option value="tls">Implicit TLS (usually 465)</option><option value="plain">Unencrypted lab relay</option>{saved.security === 'legacy' && <option value="legacy">Legacy: STARTTLS when offered</option>}</select>{security === 'plain' && <p className="text-sm text-warning">Mail and credentials may be transmitted without encryption.</p>}{security === 'legacy' && <p className="text-sm text-warning">Existing behavior retained. Select an explicit mode to require encryption.</p>}</SettingsRow>
      <SettingsRow label={t('set.smtpUser')}>
        <Input disabled={save.isPending || test.isPending} aria-label={t('set.smtpUser')} name="smtpUsername" value={user} onChange={(e) => update('user',e.target.value)} placeholder="user@example.com" autoComplete="username" className="max-w-md" />
      </SettingsRow>
      <SettingsRow label={t('set.smtpPass')} hint="Unchanged fields keep the saved password.">
        <Input disabled={save.isPending || test.isPending} aria-label={t('set.smtpPass')} name="smtpPassword" type="password" value={pass ?? ''} onChange={(e) => setPass(e.target.value)} placeholder={wl.hasSmtpPassword ? 'Saved password · leave unchanged to keep' : 'No saved password'} autoComplete="new-password" className="max-w-md" />
      </SettingsRow>
      <SettingsRow label={t('set.smtpFrom')}>
        <Input disabled={save.isPending || test.isPending} aria-label={t('set.smtpFrom')} name="smtpFrom" type="email" value={from} onChange={(e) => update('from',e.target.value)} placeholder="shipyard@example.com" className="max-w-md" />
      </SettingsRow>
      <SettingsRow label={t('set.smtpTo')} hint={t('set.smtpToHint')}>
        <Input disabled={save.isPending || test.isPending} aria-label={t('set.smtpTo')} name="smtpTo" type="email" multiple value={to} onChange={(e) => update('to',e.target.value)} placeholder="admin@example.com" className="max-w-md" />
      </SettingsRow>
      {dirty && <p role="status" className="text-sm">Unsaved email changes</p>}
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
    </NotificationSection>
  );
}

// ─────────────────────────────────────────────────────────────
// Notification toggles
// ─────────────────────────────────────────────────────────────

function NotificationToggles({ wl }: { wl: WhiteLabel }) {
  const qc = useQueryClient();
  const saved = {notifDedupeMinutes:wl.notifDedupeMinutes || 0,notifPlaybookFailed:wl.notifPlaybookFailed !== false,notifUpdateFailed:wl.notifUpdateFailed !== false};
  const [draft,setDraft] = useState<typeof saved | null>(null);
  const values = draft ?? saved;
  const dirty = JSON.stringify(values) !== JSON.stringify(saved);
  useUnsavedChanges(dirty);
  const save = useMutation({mutationFn:()=>api.saveSettings(values),onSuccess:()=>{qc.setQueryData(['settings'],(old:WhiteLabel|undefined)=>({...old,...values}));setDraft(null);void qc.invalidateQueries({queryKey:['settings']});showToast('Notification preferences saved','success');}});
  return <NotificationSection title="Notification events" dirty={dirty} status={`${Number(saved.notifPlaybookFailed) + Number(saved.notifUpdateFailed)} failure events enabled · Edit events and suppression`}><fieldset disabled={save.isPending} className="contents">
    <SettingsRow label="Suppress identical repeats" hint="Identical events within this period are sent once. Test messages are always sent.">
      <select aria-label="Duplicate suppression period" className="h-9 rounded-sm border bg-background px-3 text-sm" value={values.notifDedupeMinutes} onChange={e=>setDraft({...values,notifDedupeMinutes:Number(e.target.value)})}>{[...new Set([0,1,5,15,30,60,saved.notifDedupeMinutes])].sort((a,b)=>a-b).map(v=><option key={v} value={v}>{v ? `${v} minutes` : 'Disabled'}</option>)}</select>
    </SettingsRow>
    {([
      ['notifPlaybookFailed','Playbook failures','Send failed playbook execution events to configured channels.'],
      ['notifUpdateFailed','Update failures','Send failed update execution events to configured channels.'],
    ] as const).map(([key,label,hint])=><SettingsRow key={key} label={label} hint={hint}><Switch aria-label={label} checked={values[key]} onCheckedChange={value=>setDraft({...values,[key]:value})}/></SettingsRow>)}
    {dirty && <p role="status" className="text-sm">Unsaved changes</p>}
    {save.isError && <p role="alert" className="text-sm text-destructive">{save.error.message}</p>}
    <SettingsRow noBorder><Button disabled={!dirty} onClick={()=>save.mutate()}>Save notification preferences</Button><Button variant="outline" disabled={!dirty} onClick={()=>setDraft(null)}>Discard changes</Button></SettingsRow>
  </fieldset></NotificationSection>;
}


function DeliveryHistory() {
  const [page, setPage] = useState(1);
  const history = useQuery({
    queryKey: ['notification-deliveries', page],
    queryFn: () => apiFetch<{ items: Array<{ id: string; channel: string; destination: string; event_title: string; status: string; status_code: number | null; duration_ms: number; created_at: string }>; total: number; total_pages: number }>(`/system/notification-deliveries?page=${page}`),
    refetchInterval: 30_000,
  });
  return <details className="rounded-md border bg-card"><summary className="cursor-pointer p-4 text-sm font-semibold">Delivery history<span className="mt-1 block pl-4 font-normal text-muted-foreground">{history.isPending ? "Loading…" : history.isError ? "History unavailable" : `${history.data.total} recorded attempts`} · Inspect delivery results</span></summary><SettingsSection className="border-0" icon={<Bell className="h-4 w-4" />} title="Delivery history" description="Last 30 days, up to 1,000 attempts. Accepted means the endpoint took the request.">
    <div className="space-y-3 py-3">
      <Button type="button" variant="outline" size="sm" disabled={history.isFetching} onClick={() => void history.refetch()}>Refresh history</Button>
      {history.isPending ? <p role="status" className="text-sm">Loading delivery attempts…</p> : history.isError ? <QueryErrorState compact error={history.error} title="Delivery history unavailable" onRetry={() => void history.refetch()} /> : <>
        {!history.data.items.length ? <p className="text-sm text-muted-foreground">No recorded attempts on this page. History begins with this feature; earlier deliveries are not reconstructed.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr>{['Time', 'Channel / destination', 'Event', 'Result'].map(label => <th key={label} className="border-b px-2 py-2">{label}</th>)}</tr></thead><tbody>{history.data.items.map(item => <tr key={item.id}><td className="border-b px-2 py-2">{formatDateTime(item.created_at)}</td><td className="border-b px-2 py-2">{item.channel.toUpperCase()}<span className="block text-muted-foreground">{item.destination}</span></td><td className="border-b px-2 py-2">{item.event_title}</td><td className="border-b px-2 py-2"><span className={['failed','partial'].includes(item.status) ? 'text-destructive' : 'text-muted-foreground'}>{item.status === 'maintenance' ? 'Suppressed (maintenance)' : item.status === 'suppressed' ? 'Duplicate suppressed' : item.status === 'partial' ? 'Some recipients rejected' : item.status === 'failed' ? 'Failed' : item.status === 'accepted' ? 'Accepted' : 'Unknown'}</span>{item.status_code ? ` · HTTP ${item.status_code}` : ''}<span className="block text-muted-foreground">{item.duration_ms} ms</span></td></tr>)}</tbody></table></div>}
        {(history.data.total > 0 || page > 1) && <div className="flex items-center justify-between gap-3 text-xs"><Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><span>Page {page} / {history.data.total_pages} · {history.data.total} attempts</span><Button type="button" size="sm" variant="outline" disabled={page >= history.data.total_pages} onClick={() => setPage(page + 1)}>Next</Button></div>}
      </>}
    </div>
  </SettingsSection></details>;
}
