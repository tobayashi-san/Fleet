import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { hasCap, useProfile } from '@/lib/queries';
import { useUrlTab } from '@/lib/use-url-tab';
import { GitTab } from '@/routes/settings/tabs/git';
import { useLocation } from '@tanstack/react-router';
import { Clock, FileText, GitBranch, Play, Plus, SlidersHorizontal } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RunsTab } from './PlaybookRuns';
import { SchedulesTab } from './PlaybookSchedules';
import { TemplatesTab } from './PlaybookTemplates';
import { VarsTab } from './PlaybookVariables';

export function PlaybooksPage() {
  const { t } = useTranslation();
  const { data: profile } = useProfile();
  const location = useLocation();
  const requestedFile = new URLSearchParams(location.searchStr).get("file") || undefined;
  const isAdmin = profile?.role === "admin";
  const [runPreset, setRunPreset] = useState("");
  const [createRequest, setCreateRequest] = useState(0);
  const [createContext, setCreateContext] = useState<string | undefined>();
  const nextCreateRequest = useRef(0);
  const consumeCreateRequest = useCallback(() => setCreateRequest(0), []);

  const tabs = useMemo<{
    value: string;
    label: string;
    icon: React.ReactNode;
    cap?: string;
  }[]>(() => [
    {
      value: "templates",
      cap: "canViewPlaybooks",
      label: "Playbooks",
      icon: <FileText className="h-4 w-4" />,
    },
    {
      value: "runs",
      cap: "canViewPlaybooks",
      label: "Run automation",
      icon: <Play className="h-4 w-4" />,
    },
    {
      value: "schedules",
      label: t("pb.tabSchedules"),
      icon: <Clock className="h-4 w-4" />,
      cap: "canViewSchedules",
    },
    {
      value: "vars",
      label: "Variables & Secrets",
      icon: <SlidersHorizontal className="h-4 w-4" />,
      cap: "canViewVars",
    },
    ...(isAdmin ? [{value:"git",label:"Git",icon:<GitBranch className="h-4 w-4"/>}] : []),
  ], [t,isAdmin]);
  const allowed = useMemo(() => tabs.filter((tb) => !tb.cap || hasCap(profile, tb.cap)), [profile, tabs]);
  const allowedValues = useMemo(() => allowed.map((item) => item.value), [allowed]);
  const playbookTabs = useUrlTab(!hasCap(profile, "canViewPlaybooks") ? "schedules" : hasCap(profile, "canRunPlaybooks") || hasCap(profile, "canAddSchedules") ? "runs" : "templates", allowedValues);

  // Ensure tab is still allowed after profile changes
  useEffect(() => {
    if (!allowed.find((a) => a.value === playbookTabs.value))
      playbookTabs.onValueChange(allowed[0]?.value ?? "templates");
  }, [allowedValues, playbookTabs.value, playbookTabs.onValueChange]);

  return (
    <div className="space-y-5">
      {/* Header + Git widget */}
      <PageHeader
        title={t("pb.title")}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">

            {playbookTabs.value === "templates" && hasCap(profile, "canEditPlaybooks") && (
              <Button onClick={() => { playbookTabs.onValueChange("templates"); setCreateContext(requestedFile); setCreateRequest(++nextCreateRequest.current); }}>
                <Plus />{t("pb.new")}
              </Button>
            )}
          </div>
        }
      />

      <Tabs value={playbookTabs.value} onValueChange={playbookTabs.onValueChange}>
        <TabsList className="console-tabs">
          {/* Variables and Git are regular tabs: hidden in a menu, operators could not find them. */}
          {[...allowed].sort((a, b) => Number(b.value === "runs") - Number(a.value === "runs")).map((tb) => (
            <TabsTrigger key={tb.value} value={tb.value} className="gap-1.5">
              {tb.icon} {tb.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {isAdmin && <TabsContent value="git"><GitTab workspace /></TabsContent>}
        {hasCap(profile, "canViewPlaybooks") && <TabsContent value="templates">
          <TemplatesTab key={requestedFile || "library"} initialFile={requestedFile} createRequest={createContext === requestedFile ? createRequest : 0} onCreateRequestHandled={consumeCreateRequest} onRun={(filename) => { setRunPreset(filename); playbookTabs.onValueChange("runs"); }} />
        </TabsContent>}
        {hasCap(profile, "canViewPlaybooks") && <TabsContent value="runs">
          <RunsTab initialPlaybook={runPreset} />
        </TabsContent>}
        {hasCap(profile, "canViewVars") && <TabsContent value="vars">
          <VarsTab />
        </TabsContent>}
        {hasCap(profile, "canViewSchedules") && <TabsContent value="schedules">
          <SchedulesTab />
        </TabsContent>}
      </Tabs>
    </div>
  );
}
