import { pluginRequest } from '@/lib/plugin-request';
import { startPluginMount } from '@/lib/plugin-mount';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams, useNavigate } from '@tanstack/react-router';
import { Puzzle, RefreshCw, ArrowLeft } from 'lucide-react';
import { api, apiFetch } from '@/lib/api';
import { asArray } from '@/lib/utils';
import { ws } from '@/lib/ws';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { useProfile, useSettings } from '@/lib/queries';
import { showToast as pushToast } from '@/lib/toast';
import { useUi } from '@/lib/store';

interface PluginInfo {
  id: string;
  name?: string;
  description?: string;
  version?: string;
  author?: string;
  enabled?: boolean;
  hasUi?: boolean;
  loaded?: boolean;
}

interface PluginCtxState {
  environmentId: string;
  currentView: string;
  selectedServerId: string | number | null;
  servers: unknown[];
  plugins: PluginInfo[];
  user: unknown;
  whiteLabel: Record<string, unknown>;
}

interface PluginCtx {
  signal: AbortSignal;
  api: { request: typeof apiFetch } & typeof api;
  pluginApi: { request: (path: string, options?: Parameters<typeof apiFetch>[1]) => Promise<unknown> };
  state: PluginCtxState;
  navigate: (to: string) => void;
  refreshServersState: () => Promise<unknown[]>;
  showToast: (msg: string, kind?: string) => void;
  showConfirm: (msg: string, options?: { title?: string; confirmText?: string; danger?: boolean }) => Promise<boolean>;
  onWsMessage: (fn: (data: unknown) => void) => () => void;
}

interface PluginModule {
  mount?: (container: HTMLElement, ctx: PluginCtx) => void | Promise<void>;
  unmount?: () => void | Promise<void>;
}

export function PluginsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: plugins, isLoading } = useQuery<PluginInfo[]>({
    queryKey: ['plugins'],
    queryFn: async () => asArray<PluginInfo>(await api.getPlugins()),
  });

  const disable = useMutation({
    mutationFn: (id: string) => api.disablePlugin(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plugins'] }),
  });
  const reload = useMutation({
    mutationFn: () => api.reloadPlugins(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plugins'] }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('plugins.title')}
        actions={
          <Button variant="outline" size="sm" onClick={() => reload.mutate()} disabled={reload.isPending}>
            <RefreshCw className={`h-4 w-4 ${reload.isPending ? 'animate-spin' : ''}`} />
            {t('plugins.reload')}
          </Button>
        }
      />

      {isLoading ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">{t('common.loading')}</CardContent></Card>
      ) : !plugins || plugins.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <Puzzle className="h-8 w-8 opacity-60" />
            <span className="text-sm">{t('plugins.empty')}</span>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plugins.map((p) => (
            <Card key={p.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-medium">{p.name || p.id}</h3>
                    <p className="text-xs text-muted-foreground">{p.id}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] ${
                      p.enabled
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {p.enabled ? t('common.online') : t('common.offline')}
                  </span>
                </div>
                {p.description && (
                  <p className="line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
                )}
                <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                  {p.version && <span>{t('plugins.version')}: {p.version}</span>}
                  {p.author && <span>{t('plugins.author')}: {p.author}</span>}
                </div>
                <div className="flex gap-2 pt-1">
                  {p.enabled ? (
                    <Button variant="outline" size="sm" onClick={() => disable.mutate(p.id)} disabled={disable.isPending}>
                      {t('plugins.disable')}
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" asChild><Link to="/settings/$tab" params={{tab:'plugins'}}>Review and enable</Link></Button>
                  )}
                  {p.enabled && p.hasUi !== false && (
                    <Link to="/plugins/$id" params={{ id: p.id }}>
                      <Button size="sm">{t('plugins.open')}</Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function PluginHostPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { id } = useParams({ from: '/_protected/plugins/$id' });
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [attempt,setAttempt]=useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { data: profile } = useProfile();
  const { data: settings } = useSettings();
  const environmentId = useUi((state) => state.environmentId);

  const pluginsQuery = useQuery<PluginInfo[]>({
    queryKey: ['plugins'],
    queryFn: async () => asArray<PluginInfo>(await api.getPlugins()),
    refetchInterval:30_000,
  });
  const {data:plugins}=pluginsQuery;
  const { data: servers } = useQuery<unknown[]>({
    queryKey: ['servers', environmentId],
    queryFn: async () => asArray(await api.getServers(environmentId)),
  });
  // Plugin UIs own transient state such as their active workspace or editor.
  // Keep their mount stable when React Query refreshes data in the background.
  // Re-mounting on every server update used to reset OpenTofu back to its
  // dashboard after an init/apply run completed.
  const pluginStateRef = useRef<PluginCtxState>({
    environmentId,
    currentView: 'plugin',
    selectedServerId: null,
    servers: [],
    plugins: [],
    user: null,
    whiteLabel: {},
  });
  pluginStateRef.current = {
    environmentId,
    currentView: 'plugin',
    selectedServerId: null,
    servers: asArray(servers),
    plugins: asArray(plugins),
    user: profile ?? null,
    whiteLabel: settings ?? {},
  };

  const pluginInfo = asArray<PluginInfo>(plugins).find(p => p.id === id);
  const accessState=pluginsQuery.isPending ? 'checking' : pluginsQuery.isError ? 'error' : !pluginInfo ? 'missing' : pluginInfo.loaded===false ? 'unavailable' : !pluginInfo.enabled ? 'disabled' : pluginInfo.hasUi===false ? 'no_ui' : 'allowed';
  const accessMessages={checking:'Checking plugin access…',error:'Plugin access could not be verified. Check again before continuing.',missing:'This plugin is unavailable or your account no longer has access.',unavailable:'This plugin failed to load. An administrator must resolve the package error.',disabled:'Access to this plugin has been disabled.',no_ui:'This package has no web interface.'};


  useEffect(() => {
    ws.connect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setLoading(true);
    if(accessState!=='allowed'){setLoading(false);return;}

    const host=containerRef.current;
    if(!host)return;
    const container=document.createElement('div');
    host.replaceChildren(container);
    const subscriptions=new Set<()=>void>();
    const abort=new AbortController();
    const request=pluginRequest(environmentId,abort.signal);
    const guardedApi=Object.fromEntries(Object.entries(api).map(([name,method])=>[name,(...args:unknown[])=>{
      if(cancelled || useUi.getState().environmentId!==environmentId)return Promise.reject(new DOMException('Plugin view is no longer active','AbortError'));
      return Reflect.apply(method,api,args);
    }])) as typeof api;
        const ctx: PluginCtx = {
          signal:abort.signal,
          api: { ...guardedApi, request },
          pluginApi: {
            request: (path, options) => request(`/plugin/${id}${path}`, options),
          },
          state: pluginStateRef.current,
          navigate: (to: string) => {
            if(cancelled)return;
            // Map legacy shorthand routes to full paths used by the new frontend
            const routeMap: Record<string, string> = {
              dashboard: '/',
              servers: '/servers',
              playbooks: '/playbooks',
              settings: '/settings/git',
            };
            navigate({ to: routeMap[to] ?? to });
          },
          refreshServersState: async () => {
            try {
              const nextServers = asArray(await request(`/servers?environment_id=${encodeURIComponent(environmentId)}`));
              await Promise.all([
                qc.invalidateQueries({ queryKey: ['servers'] }),
                qc.invalidateQueries({ queryKey: ['server'] }),
              ]);
              return nextServers;
            }
            catch { return []; }
          },
          showToast: (msg, kind) => { if(cancelled)return;pushToast(msg, (kind as 'success' | 'error' | 'warning' | 'info' | undefined) ?? 'info'); },
          showConfirm: async (msg, options) => {
            if(cancelled)return false;
            const detail = options?.title ? `${options.title}\n\n${msg}` : msg;
            return window.confirm(detail);
          },
          onWsMessage: (fn) => {
            if(cancelled)return ()=>{};
            const unsubscribe=ws.subscribe(data=>{if(!cancelled)fn(data);});
            const dispose=()=>{unsubscribe();subscriptions.delete(dispose);};
            subscriptions.add(dispose);return dispose;
          },
        };

    const lifecycle=startPluginMount<PluginCtx>({
      load:()=>import(/* @vite-ignore */ `/plugins/${id}/ui.js?v=${Date.now()}`) as Promise<PluginModule>,
      container,context:ctx,
      ready:()=>setLoading(false),
      failed:(reason)=>{
        cancelled=true;
        abort.abort();
        for(const unsubscribe of subscriptions)unsubscribe();
        container.replaceChildren();
        setError(`${t('plugins.loadError')}: ${reason instanceof Error ? reason.message : 'Unknown error'}`);
        setLoading(false);
      },
    });
    return () => {
      cancelled=true;
      abort.abort();
      for(const unsubscribe of subscriptions)unsubscribe();
      container.remove();
      lifecycle.dispose();
    };
  }, [id, navigate, t, qc, attempt, environmentId, accessState]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={pluginInfo?.name || id}
        badge={pluginInfo?.version
          ? <span className="font-mono text-sm font-normal text-muted-foreground">{pluginInfo.version}</span>
          : undefined}
        description={pluginInfo?.description || undefined}
        back={
          <Link to="/settings/$tab" params={{ tab: 'plugins' }}>
            <Button variant="ghost" size="sm" className="-ml-2">
              <ArrowLeft className="h-4 w-4" /> {t('plugins.back')}
            </Button>
          </Link>
        }
      />

      {accessState!=='allowed' && <Card><CardContent className="space-y-3 p-6 text-sm"><p role="status">{accessMessages[accessState]}</p>{accessState!=='checking' && <Button variant="outline" disabled={pluginsQuery.isFetching} onClick={()=>void pluginsQuery.refetch()}>{pluginsQuery.isFetching ? 'Checking…' : 'Check plugin access again'}</Button>}</CardContent></Card>}
      {accessState==='allowed' && loading && !error && (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">{t('common.loading')}</CardContent></Card>
      )}
      {accessState==='allowed' && error && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <Puzzle className="h-8 w-8 opacity-60" />
            <span role="alert" className="text-sm">{error}</span>
            <Button variant="outline" onClick={()=>setAttempt(value=>value+1)}>Retry loading plugin</Button>
          </CardContent>
        </Card>
      )}
      <div ref={containerRef} className="plugin-host" />
    </div>
  );
}
