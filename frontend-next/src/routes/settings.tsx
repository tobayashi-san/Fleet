import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { Lock } from 'lucide-react';
import { useProfile, useSettings } from '@/lib/queries';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { QueryErrorState } from '@/components/ui/query-error-state';

import { AppearanceTab } from './settings/tabs/appearance';
import { SshTab } from './settings/tabs/ssh';
import { SystemTab, CollectionTab } from './settings/tabs/system';
import { NotificationsTab } from './settings/tabs/notifications';
import { GitTab } from './settings/tabs/git';
import { UsersRolesTab } from './settings/tabs/users-roles';
import { BackupTab } from './settings/tabs/backup';
import { DangerTab } from './settings/tabs/danger';

interface TabDef {
  id: string;
  i18nKey: string;
  Component: React.ComponentType;
  /** Console grouping keeps a growing administration surface scannable. */
  section: 'Branding' | 'Access & security' | 'Integrations' | 'System' | 'Application data';
  label?: string;
}

const TABS: TabDef[] = [
  { id: 'backup', i18nKey: 'set.tabBackup', label: 'Application data', Component: BackupTab, section: 'Application data' },
  { id: 'appearance',     i18nKey: 'set.tabAppearance',    Component: AppearanceTab, section: 'Branding' },
  { id: 'system',         i18nKey: 'set.tabSystem',        Component: SystemTab, section: 'System' },
  { id: 'collection', i18nKey: 'set.polling', label: 'Collection', Component: CollectionTab, section: 'System' },
  { id: 'ssh',            i18nKey: 'set.tabSsh',           Component: SshTab, section: 'Access & security' },
  { id: 'users-roles',    i18nKey: 'set.userManagement',   Component: UsersRolesTab, section: 'Access & security' },
  { id: 'git',            i18nKey: 'git.title', label: 'Playbook Git',            Component: GitTab, section: 'Integrations' },
  { id: 'notifications',  i18nKey: 'set.notifications',    Component: NotificationsTab, section: 'Integrations' },
  { id: 'danger',         i18nKey: 'set.danger',           Component: DangerTab, section: 'System' },
];

export function SettingsPage() {
  const { t } = useTranslation();
  const profileQuery = useProfile();
  const profile = profileQuery.data;

  if (profileQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('set.title')} />
      </div>
    );
  }

  if (profileQuery.isError) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('set.title')} />
        <QueryErrorState
          error={profileQuery.error}
          title="Administration access could not be verified"
          onRetry={() => void profileQuery.refetch()}
        />
      </div>
    );
  }

  if (profile?.role !== 'admin') {
    return (
      <div className="space-y-6">
        <PageHeader title={t('set.title')} />
        <EmptyState
          icon={<Lock className="h-5 w-5" />}
          title={t('set.adminOnlyTitle')}
          description={t('set.adminOnlyDescription')}
        />
      </div>
    );
  }

  return <AdminSettingsPage />;
}

function AdminSettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { tab?: string };
  const settingsQuery = useSettings();
  const visibleTabs = TABS.filter((tab) => tab.id !== 'danger');
  const activeId = params.tab === 'danger' ? 'backup' : visibleTabs.find((tab) => tab.id === params.tab)?.id ?? 'system';
  const ActiveComponent = params.tab === 'danger' ? DangerTab : visibleTabs.find((tab) => tab.id === activeId)?.Component;
  const sections = ['System', 'Access & security', 'Integrations', 'Application data', 'Branding'] as const;

  useEffect(() => {
    if (params.tab === 'audit') void navigate({ to: '/operations', search: {section:'audit'}, replace: true });
  }, [navigate, params.tab]);

  if (settingsQuery.isError) {
    return (
      <div className="space-y-5">
        <PageHeader title={t('set.title')} />
        <QueryErrorState
          error={settingsQuery.error}
          title="Administration settings could not be loaded"
          onRetry={() => void settingsQuery.refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title={t('set.title')} />

      <p className="text-xs text-muted-foreground">Administration · settings apply to this installation unless a section explicitly names an environment. Personal preferences are in your profile.</p>
      <div className="flex flex-col gap-5 lg:flex-row">
        <label className="space-y-1.5 lg:hidden">
          <span className="text-[13px] font-medium text-muted-foreground">Administration section</span>
          <select
            value={activeId}
            onChange={(event) => void navigate({ to: '/settings/$tab', params: { tab: event.target.value } })}
            className="h-10 w-full rounded-sm border border-input bg-background px-3 text-sm"
            aria-label="Administration section"
          >
            {sections.map(section => (
              <optgroup key={section} label={section}>
                {visibleTabs.filter(tab => tab.section === section).map(tab => (
                  <option key={tab.id} value={tab.id}>{tab.label || t(tab.i18nKey)}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <nav className="shrink-0 lg:w-60 lg:rounded-panel lg:border lg:border-border-strong/80 lg:bg-card lg:p-2 lg:shadow-[0_1px_2px_hsl(var(--foreground)/0.035)]" aria-label="Administration">
          <div className="hidden px-2 pb-2 pt-1 text-xs font-semibold text-muted-foreground lg:block">Administration</div>
          <div className="hidden lg:flex lg:flex-col lg:gap-3">
            {sections.map(section => {
              const tabs = visibleTabs.filter(tab => tab.section === section);
              if (!tabs.length) return null;
              return <div key={section} className="flex shrink-0 gap-1 lg:block">
                <div className="hidden px-2 pb-1 pt-1 text-[11px] font-semibold tracking-wide text-muted-foreground lg:block">{section}</div>
                <ul className="flex gap-1 lg:block lg:space-y-0.5">
                  {tabs.map(tab => {
                    const isActive = tab.id === activeId;
                    return <li key={tab.id}><Link to="/settings/$tab" params={{ tab: tab.id }} className={cn(
                      'relative block whitespace-nowrap rounded-sm px-2.5 py-1.5 text-[13px] transition-colors',
                      isActive ? 'bg-primary/[0.09] font-semibold text-foreground before:absolute before:inset-y-1 before:left-0 before:w-0.5 before:bg-primary' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                    )}>{tab.label || t(tab.i18nKey)}</Link></li>;
                  })}
                </ul>
              </div>;
            })}
          </div>
        </nav>

        <div className="min-w-0 flex-1">
          {ActiveComponent ? <ActiveComponent /> : null}
        </div>
      </div>
    </div>
  );
}
