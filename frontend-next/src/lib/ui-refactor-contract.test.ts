import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const related: Record<string, string[]> = {
  'features/servers/ServersPage.tsx': ['features/servers/useHostManagement.tsx', 'features/servers/HostInventoryRows.tsx', 'features/servers/GroupDialog.tsx', 'features/servers/HostManagementDialogs.tsx'],
  'routes/networks.tsx': ['features/ipam/IpamSourcesDialog.tsx', 'features/ipam/CreatePrefixDialog.tsx', 'features/ipam/PrefixRows.tsx', 'features/ipam/prefix-model.ts'],
  'routes/operations.tsx': ['features/operations/model.ts', 'features/operations/OperationList.tsx'],
};
const source = (relative: string) => [relative, ...(related[relative] || [])]
  .map(file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')).join('\n');

describe("UI refactor contract", () => {


  it("uses a quiet positive status treatment and accessible secondary text", () => {
    const badge = source("components/ui/status-badge.tsx");
    const genericBadge = source("components/ui/badge.tsx");
    const css = source("index.css");
    expect(badge).toContain("success: 'bg-transparent");
    expect(genericBadge).toContain('success:     "border-success/20 bg-transparent');
    expect(css).toContain("input::placeholder, textarea::placeholder { color: hsl(var(--muted-foreground)); }");
  });

  it("keeps compact switch defaults and supports rounded shadcn switches", () => {
    const uiSwitch = source("components/ui/switch.tsx");
    const hostDialog = source("components/CreateServerDialog.tsx");
    const css = source("index.css");
    expect(uiSwitch).toContain("h-5 w-10");
    expect(uiSwitch).toContain("rounded-[var(--radius-switch,6px)]");
    expect(uiSwitch).toContain("h-3.5 w-3.5 rounded-[var(--radius-switch-thumb,3px)]");
    expect(css).toContain("--radius-switch: 9999px");
    expect(css).toContain("--radius-switch-thumb: 9999px");
    expect(uiSwitch).toContain("data-[state=checked]:translate-x-[22px]");
    expect(uiSwitch).toContain("data-[state=unchecked]:translate-x-[2px]");
    expect(css).toContain('main button:not([role="switch"])');
    expect(uiSwitch).not.toContain("rounded-full");
    expect(hostDialog).toContain('import { Switch } from "@/components/ui/switch"');
    expect(hostDialog).not.toContain('role="switch"');
  });

  it("keeps VM creation guided with an explicit review step", () => {
    const dialog = source("features/deployments/VmFormDialog.tsx");
    expect(dialog).toContain('aria-label="VM setup steps"');
    expect(dialog).toContain('aria-label="Review VM definition"');
    expect(dialog).toContain("if (step < 4) { nextStep(); return; }");
    expect(dialog).toContain("Compute & Storage");
    expect(dialog).toContain("Network & VM access");
    expect(dialog).toContain("Post-deploy workflows");
  });

  it("keeps five fixed main destinations without duplicate inventory navigation", () => {
    const sidebar = source("components/layout/Sidebar.tsx");
    expect(sidebar).not.toContain('WorkspaceSwitcher');
    expect(sidebar).not.toContain('navigationWorkspace');
    for (const label of ['Hosts', 'Deployments', 'Automations', 'Networks', 'Jobs']) expect(sidebar).toContain(`label="${label}"`);
    expect(sidebar).not.toContain("<InfrastructureTree");
    expect(sidebar).toContain('label="Settings"');
  });






  it("keeps comfortable density and flexible navigation user-configurable", () => {
    const store = source("lib/store.ts");
    const sidebar = source("components/layout/Sidebar.tsx");
    const shell = source("components/layout/AppShell.tsx");
    expect(store).toContain("return 'comfortable'");
    expect(store).toContain("sidebarWidth: readSidebarWidth()");
    expect(sidebar).toContain("onPointerDown={startResize}");
    expect(sidebar).not.toContain("fleet_recent_nav");
    expect(shell).toContain("setDensity(value)");
    expect(shell).toContain("lg:hidden\" onClick={openCommandPalette}");
  });


  it("keeps the primary host action clear and secondary actions in overflow", () => {
    const servers = source("features/servers/ServersPage.tsx");
    expect(servers.indexOf("<CreateServerDialog />")).toBeLessThan(servers.indexOf('<OverflowMenu title={t("srv.resourceOptions")}>'));
    expect(servers).toContain("<OverflowItem icon={RefreshCw} onClick={handleRefresh}");
  });

  it("keeps implementation paths out of normal deployment copy and administration actions in menus", () => {
    const deployment = source("features/deployments/DeploymentSettingsDialog.tsx");
    const onboarding = source("routes/onboarding.tsx");
    const users = source("routes/settings/tabs/users-roles.tsx");
    expect(deployment).not.toContain("OpenTofu path");
    expect(deployment).not.toContain("workspace.path");
    expect(onboarding).toContain("changed later in Administration");
    expect(onboarding).not.toContain("changed later in Settings");
    expect(users).toContain("<OverflowMenu title={`Actions for ${shown}`}>");
    expect(users).toContain("<OverflowMenu title={`Actions for ${r.name}`}>");
  });

  it("names fleet selection controls and the command search explicitly", () => {
    const servers = source("features/servers/ServersPage.tsx");
    const palette = source("components/CommandPalette.tsx");
    expect(servers).toContain('aria-label={`Select ${s.name}`}');
    expect(servers.match(/aria-label=\{useGroups \? "Select all hosts matching current filters" : "Select all hosts on this page"\}/g)).toHaveLength(2);
    expect(palette).toContain("aria-label={t('cmd.placeholder')}");
  });

  it("requires the VM name for an immediate force stop", () => {
    const vm = source("routes/proxmox-vm-detail.tsx");
    const dialog = source("features/infrastructure/GuestPowerDialog.tsx");
    expect(vm).toContain('<GuestPowerDialog action={powerAction}');
    expect(dialog).toContain('typed===`STOP ${target.guestName}`');
    expect(dialog).toContain('Unsaved data may be lost.');
    expect(dialog).toContain("variant={force?'destructive':'default'}");
    expect(dialog).toContain('confirm_guest_name:force?target.guestName:undefined');
  });

  it("keeps playbook creation central and targeting reviewable", () => {
    const templates = source("features/playbooks/PlaybookTemplates.tsx");
    const runs = source("features/playbooks/PlaybookRuns.tsx");
    const variables = source("features/playbooks/PlaybookVariables.tsx");
    expect(templates).not.toContain("const startNew");
    expect(runs).toContain('placeholder="Search name, IP, or tag"');
    expect(runs).toContain('aria-label="Filter hosts by group"');
    expect(runs).toContain('aria-label="Filter hosts by tag"');
    expect(runs).toContain("<summary className=\"cursor-pointer text-sm font-medium\">Advanced execution options</summary>");
    expect(variables).toContain('{ label: "Secrets"');
    expect(variables).toContain('v.is_secret ? "••••••••"');
  });

  it("focuses audit on security and configuration changes by default", () => {
    const audit = source("features/operations/AuditLogPanel.tsx");
    expect(audit).toContain('useState<"changes" | "all">("changes")');
    expect(audit).toContain("Security & changes");
    expect(audit).toContain("All events");
  });

  it("never presents failed operations queries as healthy empty activity", () => {
    const operations = source("routes/operations.tsx");
    expect(operations).toContain("operationsQuery.isError ? (");
    expect(operations).toContain('title="Activity could not be loaded"');
  });

  it("distinguishes infrastructure detail failures from confirmed empty inventory", () => {
    const infrastructure = source("routes/infrastructure-detail.tsx");
    const vm = source("routes/proxmox-vm-detail.tsx");
    expect(infrastructure).toContain('title="Infrastructure inventory could not be loaded"');
    expect(vm).toContain('title="Virtual machine inventory could not be loaded"');
    // Resource-specific configuration errors are verified by rendered component tests.
    expect(vm).toContain('title="VM management context could not be loaded"');
    expect(vm).toContain('title="Snapshots could not be loaded"');
    expect(vm).toContain('title="Guest audit activity could not be loaded"');
    expect(vm).toContain('(activeVmSection === "overview" || activeVmSection === "snapshots")');
    expect(vm).toContain('(activeVmSection === "overview" || activeVmSection === "tasks")');
    expect(vm).not.toContain('Connections, declaration, and management for this virtual\n                  virtual machine.');
    const detailPanels = source("features/infrastructure/DetailPanels.tsx");
    const cluster = source("features/infrastructure/ClusterDetail.tsx");
    const node = source("features/infrastructure/NodeDetail.tsx");
    expect(detailPanels).toContain('title="Object tasks could not be loaded"');
    expect(cluster).toContain("showAudit && (");
    expect(node).toContain("showAudit && (");
    expect(cluster).not.toContain("{auditTasks.length}");
    expect(node).not.toContain("{auditTasks.length}");
    const createVm = source("features/deployments/CreateDeploymentDialog.tsx");
    const sourceDialog = source("features/deployments/DeploymentConnectionDialog.tsx");
    expect(createVm).toContain('title="Proxmox platforms could not be loaded"');
    expect(createVm).toContain("connections.length === 0 && connectionsQuery.isSuccess");
    expect(sourceDialog).toContain('title="Infrastructure source could not be loaded"');
  });

  it("keeps icon and context actions keyboard and screen-reader accessible", () => {
    const menu = source("components/ui/overflow-menu.tsx");
    const button = source("components/ui/button.tsx");
    const host = source("features/server-detail/ServerDetailPage.tsx");
    const docker = source("features/server-detail/ServerDockerTab.tsx");
    const overview = source("features/server-detail/ServerOverviewTabs.tsx");
    const summaryCards = source("features/server-detail/components/summary-cards.tsx");
    const servers = source("features/servers/ServersPage.tsx");

    expect(button).toContain("icon: 'h-10 w-10 min-h-9 min-w-9'");
    expect(menu).toContain("<DropdownMenu.Portal>");
    expect(menu).toContain("<DropdownMenu.Trigger asChild>");
    expect(menu).toContain("<DropdownMenu.Separator");
    expect(menu).toContain("flex min-h-9 w-full");
    expect(host).toContain('aria-label={t("common.back")}');
    expect(docker).toContain('aria-label={t("common.refresh")}');
    expect(overview).toContain('aria-label={t("common.refresh")}');
    expect(summaryCards).toContain("aria-label={`${t('common.copy')} ${label}`}");
    expect(servers).toContain("aria-label={`Remove ${name} from playbook targets`}");
  });

  it("never presents failed playbook or administration references as empty data", () => {
    const runs = source("features/playbooks/PlaybookRuns.tsx");
    const schedules = source("features/playbooks/PlaybookSchedules.tsx");
    const history = source("features/playbooks/PlaybookHistory.tsx");
    const variables = source("features/playbooks/PlaybookVariables.tsx");
    const templates = source("features/playbooks/PlaybookTemplates.tsx");
    const users = source("routes/settings/tabs/users-roles.tsx");
    const ssh = source("routes/settings/tabs/ssh.tsx");
    const git = source("routes/settings/tabs/git.tsx");

    expect(runs).toContain('title="Playbook run references could not be loaded"');
    expect(schedules).toContain('title="Scheduled workflows could not be loaded"');
    expect(schedules).toContain('title="Workflow references could not be loaded"');
    expect(history).toContain('title="Playbook run history could not be loaded"');
    expect(variables).toContain('title="Variables and secrets could not be loaded"');
    expect(templates).toContain('title="Playbook targets could not be loaded"');
    expect(templates).toContain('title="Playbook content could not be loaded"');
    expect(templates).toContain('title="Playbook version history could not be loaded"');
    expect(users).toContain('title="Users and roles could not be loaded"');
    expect(users).toContain('title="Role scope references could not be loaded"');
    expect(ssh).toContain('title="Key assignments could not be loaded"');
    expect(ssh).toContain('title="SSH deployment targets could not be loaded"');
    expect(git).toContain('title="Git branches could not be loaded"');
  });

  it("keeps global, host, deployment and IPAM query failures actionable", () => {
    const shell = source("components/layout/AppShell.tsx");
    const palette = source("components/CommandPalette.tsx");
    const login = source("routes/login.tsx");
    const servers = source("features/servers/ServersPage.tsx");
    const audit = source("features/operations/AuditLogPanel.tsx");
    const deployment = source("routes/deployment-detail.tsx");
    const vmForm = source("features/deployments/VmFormDialog.tsx");
    const profile = source("routes/profile.tsx");
    const createHost = source("components/CreateServerDialog.tsx");
    const locale = source("locales/en.json");

    expect(shell).toContain('title="Console permissions could not be loaded"');
    expect(shell).toContain("Environments could not be loaded.");
    expect(palette).toContain("Some search results could not be loaded.");
    expect(login).toContain('title="Fleet could not be reached"');
    expect(servers).toContain('title="Host folders could not be loaded"');
    expect(servers).toContain('title="Playbooks could not be loaded"');
    expect(audit).toContain('title="Audit filters could not be loaded"');
    expect(deployment).toContain('title="Managed VM could not be loaded"');
    expect(deployment).toContain('title="Current Proxmox state could not be loaded"');
    expect(deployment).toContain('title="Independent VM state could not be loaded"');
    expect(deployment).toContain('title="VM run history could not be loaded"');
    expect(deployment).toContain("runStateUnavailable");
    expect(vmForm).toContain('title="VM templates could not be loaded"');
    expect(vmForm).toContain('title="Pre-deploy hosts could not be loaded"');
    expect(profile).toContain('title="Two-factor authentication status could not be loaded"');
    expect(createHost).toContain('title="Environments could not be loaded"');
    expect(locale).toContain('"managedHostReferencesFailed"');
    expect(locale).toContain('"reservationValidationFailed"');
  });

  it("preserves the operational review fixes across narrow and long-form views", () => {
    const networks = source("routes/networks.tsx");
    const sidebar = source("components/layout/Sidebar.tsx");
    const operations = source("routes/operations.tsx");
    const router = source("router.tsx");
    const playbooks = source("features/playbooks/PlaybooksPage.tsx");
    const profile = source("routes/profile.tsx");
    const users = source("routes/settings/tabs/users-roles.tsx");
    const activity = source("components/ActivityCenter.tsx");

    expect(networks).toContain('className="min-w-0 space-y-5"');
    expect(networks).toContain('className="hidden md:block"');
    expect(networks).toContain("function PrefixMobileCard");
    expect(networks).toContain('tr("vlanBridge")');
    expect(networks).toContain('tr("descriptionLabel")');
    expect(sidebar.match(/<NavItem to="\/operations"/g)).toHaveLength(1);
    expect(sidebar).not.toContain("fleet.lastInfrastructureRoute");
    expect(sidebar).toContain('path.startsWith("/servers")');
    expect(operations).not.toContain('| "Audit"');
    expect(operations).not.toContain('<option value="Audit">');
    expect(router).not.toContain("'Workflow' | 'Audit'");
    expect(playbooks).toContain('<OverflowMenu title="Advanced automation settings">');
    expect(playbooks).toContain("<GitTab workspace />");
    expect(profile.indexOf("profile.passwordSection")).toBeLessThan(profile.indexOf("Personal appearance"));
    expect(profile).toContain("More themes");
    expect(users).toContain("flex max-h-[90vh] max-w-4xl flex-col overflow-hidden p-0");
    expect(users).toContain("shrink-0 border-t bg-card px-5 py-3");
    expect(users).toContain("{users.length} {users.length === 1 ? 'user' : 'users'}");
    expect(activity).toContain("serverNames.get(text(data.serverId))");
    expect(activity).not.toContain("`Host ${text(data.serverId)}`");
    expect(activity).toContain("Cause:");
  });

  it("preserves the release-candidate accessibility and operations fixes", () => {
    const operations = source("routes/operations.tsx");
    const network = source("routes/network-detail.tsx");
    const history = source("features/server-detail/ServerOperationsTabs.tsx");
    const templates = source("features/playbooks/PlaybookTemplates.tsx");
    const profile = source("routes/profile.tsx");
    const appearance = source("routes/settings/tabs/appearance.tsx");
    const audit = source("features/operations/AuditLogPanel.tsx");
    const locale = source("locales/en.json");

    expect(operations).not.toContain('type="datetime-local"');
    expect(operations).not.toContain('type="date"');
    expect(operations).toContain('aria-controls="activity-filters"');
    expect(operations).toContain('window.matchMedia("(max-width: 1279px)")');
    expect(operations).toContain('showCompactOperationDialog && selectedOperationId');
    expect(operations).toContain('DialogTitle>Task details</DialogTitle>');
    expect(operations).toContain("target_detail?: string");
    expect(network).toContain('connectionRows.length === 0\n                      ? tr("noProxmoxConnection")');
    expect(history).toContain('import { historyFailureCause } from "@/lib/history-failure"');
    expect(history).not.toContain('h.output && <button');
    expect(templates).toContain('htmlFor="playbook-search"');
    expect(templates).toContain('id="playbook-search"');
    expect(profile).toContain('htmlFor="profile-display-name"');
    expect(profile).toContain('htmlFor="profile-username"');
    expect(profile).toContain('htmlFor="profile-email"');
    expect(appearance).toContain('aria-labelledby="appearance-app-name-label"');
    expect(appearance.match(/aria-labelledby="appearance-accent-color-label"/g)).toHaveLength(2);
    expect(audit).toContain("normalizeAuditIp(ip)");
    expect(audit).toContain("parseAuditDetail(detail)");
    expect(locale).toContain('"reserveSpace": "Reserve address"');
    expect(locale).toContain('"tags": "Tags"');
  });
});
