import { Button } from "@/components/ui/button";
import { DateTextInput } from "@/components/ui/date-input";
import { EmptyState } from "@/components/ui/empty-state";
import { ActiveFilterChips } from "@/components/ui/filter-chips";
import { Input } from "@/components/ui/input";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { SkeletonRow } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { TablePagination } from "@/components/ui/table-pagination";
import { api } from "@/lib/api";
import { auditActionLabel, gitPolicyChanges, guestAuditPresentation, normalizeAuditIp, parseAuditDetail } from "@/lib/audit-display";
import { useUi } from "@/lib/store";
import { asArray, formatDateTime, formatDateTimeWithZone } from "@/lib/utils";
import { SettingsSection } from "@/routes/settings/_row";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
	ClipboardList,
	Download,
	RotateCw,
	ScrollText,
	Settings2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { parseRoleChange, RoleAuditDetail } from './RoleAuditDetail';

interface AuditMeta {
  actions?: string[];
  users?: string[];
  count?: number;
}
interface AuditRow {
  action?: string;
  user?: string;
  detail?: string;
  ip?: string;
  success?: 0 | 1 | boolean;
  created_at?: string;
  object_links?: Array<{
    kind: "server" | "deployment" | "network";
    id: string;
    label: string;
    href: string;
  }>;
}

interface Filters {
  q: string;
  action: string;
  user: string;
  success: "" | "0" | "1";
  from: string;
  to: string;
}

const AUDIT_PAGE_SIZE = 25;

const initialFilters: Filters = {
  q: "",
  action: "",
  user: "",
  success: "",
  from: "",
  to: "",
};

function buildFilterParams(filters: Filters): Record<string, string> {
  const out: Record<string, string> = {};
  if (filters.q) out.q = filters.q;
  if (filters.action) out.action = filters.action;
  if (filters.user) out.user = filters.user;
  if (filters.success !== "") out.success = filters.success;
  if (filters.from) out.from = filters.from;
  if (filters.to) out.to = filters.to;
  return out;
}

export function AuditLogPanel() {
  const { t } = useTranslation();
  const environmentId = useUi((state) => state.environmentId);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [searchDraft, setSearchDraft] = useState('');
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [focus, setFocus] = useState<"changes" | "all">("changes");
  const filterParams = { ...buildFilterParams(filters), focus };

  const metaQ = useQuery<AuditMeta>({
    queryKey: [
      "audit-meta",
      environmentId,
      filters.q,
      filters.action,
      filters.user,
      filters.success,
      filters.from,
      filters.to,
      focus,
    ],
    queryFn: () =>
      api.getAuditMeta({ ...filterParams, environment_id: environmentId }) as unknown as Promise<AuditMeta>,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const rowsQ = useQuery<AuditRow[]>({
    queryKey: [
      "audit-log",
      environmentId,
      filters.q,
      filters.action,
      filters.user,
      filters.success,
      filters.from,
      filters.to,
      focus,
      page,
    ],
    queryFn: () =>
      api.getAuditLog({
        ...filterParams,
        environment_id: environmentId,
        limit: AUDIT_PAGE_SIZE,
        offset: (page - 1) * AUDIT_PAGE_SIZE,
      }) as unknown as Promise<AuditRow[]>,
    refetchInterval: 60_000,
  });

  const exportParams = {...filterParams,environment_id:environmentId};
  const exportMutation = useMutation({mutationFn: (params: Record<string,string>) => api.exportAuditLog(params)});
  const exportErrorCurrent = JSON.stringify(exportMutation.variables) === JSON.stringify(exportParams);

  const resetAndSet = (patch: Partial<Filters>) => {
    setPage(1);
    setFilters((current) => ({ ...current, ...patch }));
  };

  const meta = metaQ.data || { actions: [], users: [], count: 0 };
  const rows = asArray<AuditRow>(rowsQ.data);
  const total = meta.count || 0;
  const totalPages = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));
  const activeFilters = [
    ...(filters.q ? [{id:"q",label:`Search: ${filters.q}`,onRemove:()=>{setSearchDraft('');resetAndSet({q:''});}}] : []),
    ...(filters.action ? [{ id: "action", label: `${t("set.auditFilterAction")}: ${auditActionLabel(filters.action)}`, onRemove: () => resetAndSet({ action: "" }) }] : []),
    ...(filters.user ? [{ id: "user", label: `${t("set.auditFilterUser")}: ${filters.user}`, onRemove: () => resetAndSet({ user: "" }) }] : []),
    ...(filters.success ? [{ id: "success", label: `${t("set.auditFilterStatus")}: ${filters.success === "1" ? t("set.auditStatusOk") : t("set.auditStatusFailed")}`, onRemove: () => resetAndSet({ success: "" }) }] : []),
    ...(filters.from ? [{ id: "from", label: `${t("set.auditFilterFrom")}: ${filters.from}`, onRemove: () => resetAndSet({ from: "" }) }] : []),
    ...(filters.to ? [{ id: "to", label: `${t("set.auditFilterTo")}: ${filters.to}`, onRemove: () => resetAndSet({ to: "" }) }] : []),
  ];

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  // Search applies while typing, after a short pause.
  useEffect(() => {
    const next = searchDraft.trim();
    if (next === filters.q) return;
    const timer = setTimeout(() => { setPage(1); setFilters(current => ({ ...current, q: next })); }, 300);
    return () => clearTimeout(timer);
  }, [searchDraft, filters.q]);

  useEffect(() => {
    setPage(1);
  }, [environmentId]);

  return (
    <SettingsSection>
      {/* One row: search, focus, filter and export. Count and retention live in the tooltip. */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/70 p-3">
        <Input className="min-w-0 flex-1 sm:max-w-sm" aria-label="Search audit events" placeholder="Search action, user, IP or details" maxLength={200} value={searchDraft} onChange={event=>setSearchDraft(event.target.value)} />
        <div className="flex rounded-md border p-0.5" aria-label="Audit event focus" title={`${metaQ.isError ? "Audit metadata unavailable" : `${total} ${total === 1 ? "entry" : "entries"}`} · ${t("set.auditRetention")}`}>
          <Button size="sm" variant={focus === "changes" ? "secondary" : "ghost"} className="h-7" onClick={() => { setFocus("changes"); setPage(1); }}>
            Security & changes
          </Button>
          <Button size="sm" variant={focus === "all" ? "secondary" : "ghost"} className="h-7" onClick={() => { setFocus("all"); setPage(1); }}>
            All events
          </Button>
        </div>
        <Button
          variant={filtersOpen ? "secondary" : "outline"}
          size="sm"
          onClick={() => setFiltersOpen((open) => !open)}
        >
          <Settings2 className="h-4 w-4" />
          Filter{Object.entries(filters).some(([key, value]) => key !== "q" && value !== "") ? ": active" : ""}
        </Button>
        <Button
          variant="outline"
          size="sm"
          title="CSV of the filtered entries, up to 10,000."
          onClick={() => exportMutation.mutate(exportParams)}
          disabled={exportMutation.isPending || metaQ.isLoading || total > 10_000}
        >
          <Download className="h-4 w-4" />
          {exportMutation.isPending ? "Exporting…" : "Export"}
        </Button>
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">{metaQ.isSuccess ? `${total} ${total === 1 ? "entry" : "entries"}` : ""}</span>
      </div>
      {total > 10_000 && <p role="status" className="px-3 pt-2 text-sm text-warning">{total} entries match. Narrow the filters to 10,000 or fewer before exporting.</p>}
      {exportErrorCurrent && exportMutation.isError && <p role="alert" className="px-3 pt-2 text-sm text-destructive">{exportMutation.error.message}</p>}

      {metaQ.isError && (
        <QueryErrorState
          compact
          error={metaQ.error}
          onRetry={() => {
            void metaQ.refetch();
          }}
          title="Audit filters could not be loaded"
        />
      )}

      {filtersOpen && (
        <div className="grid gap-2 border-b border-border/70 bg-muted/10 p-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label={t("set.auditFilterAction")}>
            <SelectInput
              ariaLabel={t("set.auditFilterAction")}
              value={filters.action}
              onChange={(v) => resetAndSet({ action: v })}
            >
              <option value="">{t("set.auditFilterAll")}</option>
              {filters.action && !asArray<string>(meta.actions).includes(filters.action) && <option value={filters.action}>{auditActionLabel(filters.action)}</option>}
              {asArray<string>(meta.actions).map((a) => (
                <option key={a} value={a}>
                  {auditActionLabel(a)}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label={t("set.auditFilterUser")}>
            <SelectInput
              ariaLabel={t("set.auditFilterUser")}
              value={filters.user}
              onChange={(v) => resetAndSet({ user: v })}
            >
              <option value="">{t("set.auditFilterAll")}</option>
              {filters.user && !asArray<string>(meta.users).includes(filters.user) && <option value={filters.user}>{filters.user}</option>}
              {asArray<string>(meta.users).map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label={t("set.auditFilterStatus")}>
            <SelectInput
              ariaLabel={t("set.auditFilterStatus")}
              value={filters.success}
              onChange={(v) =>
                resetAndSet({ success: v as Filters["success"] })
              }
            >
              <option value="">{t("set.auditFilterAll")}</option>
              <option value="1">{t("set.auditStatusOk")}</option>
              <option value="0">{t("set.auditStatusFailed")}</option>
            </SelectInput>
          </Field>
          <Field label={`${t("set.auditFilterFrom")} · Europe/Zurich`}>
            <DateTextInput
              ariaLabel={t("set.auditFilterFrom")}
              value={filters.from}
              onChange={(value) => resetAndSet({ from: value })}
            />
          </Field>
          <Field label={`${t("set.auditFilterTo")} · Europe/Zurich`}>
            <DateTextInput
              ariaLabel={t("set.auditFilterTo")}
              value={filters.to}
              onChange={(value) => resetAndSet({ to: value })}
            />
          </Field>
        </div>
      )}

      <ActiveFilterChips
        className="rounded-none border-x-0"
        filters={activeFilters}
        onClear={() => {
          setPage(1);
          setFilters(initialFilters);
          setSearchDraft('');
        }}
        clearLabel={t("set.auditFilterReset")}
      />

      {rowsQ.isLoading ? (
        <div className="py-2">
          <SkeletonRow cols={4} />
          <SkeletonRow cols={4} />
          <SkeletonRow cols={4} />
          <SkeletonRow cols={4} />
        </div>
      ) : rowsQ.isError ? (
        <QueryErrorState
          compact
          error={rowsQ.error}
          onRetry={() => {
            void rowsQ.refetch();
          }}
          title="Audit log could not be loaded"
        />
      ) : rows.length === 0 ? (
        <EmptyState
          compact
          icon={<ClipboardList className="h-5 w-5" />}
          title={t("set.auditEmpty")}
        />
      ) : (
        <div>
          <div className="divide-y md:hidden">
            {rows.map((r, i) => (
              <AuditMobileRow
                key={`${r.created_at ?? ""}-${r.action ?? ""}-${r.user ?? ""}-${i}`}
                row={r}
              />
            ))}
          </div>
          <div className="table-scroll hidden md:block">
            <table
              data-density="compact"
              className="w-full min-w-[880px] text-sm"
            >
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Details</th>
                  <th>Triggered by</th>
                  <th>Object</th>
                  <th>Time · Europe/Zurich</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <AuditTableRow
                    key={`${r.created_at ?? ""}-${r.action ?? ""}-${r.user ?? ""}-${i}`}
                    row={r}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {!metaQ.isError && (
            <TablePagination
              page={page}
              pageSize={AUDIT_PAGE_SIZE}
              totalItems={total}
              onPageChange={setPage}
              disabled={rowsQ.isFetching}
              itemLabel="audit entries"
            />
          )}
        </div>
      )}
    </SettingsSection>
  );
}

function auditObjectLabel(link: NonNullable<AuditRow["object_links"]>[number]) {
  if (link.kind === "deployment") return "Deployment: ";
  if (link.kind === "network") return "Prefix: ";
  return "Host: ";
}

function AuditObjectLinks({ links }: { links: AuditRow["object_links"] }) {
  if (!links?.length) return <span className="text-muted-foreground">—</span>;
  return <div className="flex flex-col gap-1">{links.map(link => (
    <a key={`${link.kind}:${link.id}:${link.href}`} href={link.href} className="break-words text-xs font-medium text-primary hover:underline">
      {auditObjectLabel(link)}{link.label}
    </a>
  ))}</div>;
}

export function AuditTableRow({ row }: { row: AuditRow }) {
  const presentation = guestAuditPresentation(row);
  return (
    <tr>
      <td className="text-sm font-medium">
        <span title={row.action}>{presentation.label}</span>
        {presentation.outcome !== "Recorded" && <StatusBadge className="ml-2" tone={presentation.tone} dot>{presentation.outcome}</StatusBadge>}
      </td>
      <td className="max-w-[28rem]">
        <AuditDetail detail={row.detail} action={row.action} />
      </td>
      <td>
        <div className="text-sm">{row.user || "System"}</div>
        <AuditIp ip={row.ip} />
      </td>
      <td>
        <AuditObjectLinks links={row.object_links} />
      </td>
      <td className="whitespace-nowrap text-xs tabular-nums text-muted-foreground" title={formatDateTimeWithZone(row.created_at)}>
        {formatDateTime(row.created_at)}
      </td>
    </tr>
  );
}

export function AuditMobileRow({ row }: { row: AuditRow }) {
  const presentation = guestAuditPresentation(row);
  return (
    <div className="space-y-2 p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="break-words text-xs font-medium">
            <span title={row.action}>{presentation.label}</span>
          </div>
        </div>
        {presentation.outcome !== "Recorded" && <StatusBadge tone={presentation.tone} dot>
          {presentation.outcome}
        </StatusBadge>}
      </div>
      <div className="min-w-0 overflow-x-auto text-xs text-muted-foreground">
        <AuditDetail detail={row.detail} action={row.action} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{row.user || "System"}</span>
        <AuditIp ip={row.ip} />
        <span>{formatDateTimeWithZone(row.created_at)}</span>
      </div>
      <AuditObjectLinks links={row.object_links} />
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function SelectInput({
  value,
  onChange,
  children,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  ariaLabel: string;
}) {
  return (
    <select
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 w-full min-w-0 rounded-md border border-input bg-background px-2 text-xs sm:w-auto sm:min-w-[110px]"
    >
      {children}
    </select>
  );
}

function AuditIp({ ip }: { ip?: string }) {
  const normalized = normalizeAuditIp(ip);
  if (!ip) return <span className="font-mono text-[11px] text-muted-foreground">—</span>;
  // The recorded form (for example an IPv4-mapped IPv6 address) stays available on hover.
  return <span className="font-mono text-[11px] text-muted-foreground" title={normalized === ip ? undefined : `Recorded as ${ip}`}>{normalized}</span>;
}

function AuditDetail({ detail, action }: { detail?: string; action?: string }) {
  const roleChange = parseRoleChange(detail);
  if (roleChange) return <RoleAuditDetail change={roleChange}/>;
  const parsed = parseAuditDetail(detail);
  const policyChanges = action === "git.config_update" || action === "git.settings_update" ? gitPolicyChanges(detail) : null;
  if (!parsed.raw) return <span>—</span>;
  if (parsed.fields.length === 0) {
    return <span className="block truncate" title={parsed.raw}>{parsed.raw}</span>;
  }
  return (
    <div className="min-w-0 space-y-1.5">
      {parsed.summary && <p className="text-xs text-foreground">{parsed.summary}</p>}
      {policyChanges && (policyChanges.length ? <table className="w-full min-w-64 text-left text-xs [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1 [&_td]:align-top"><thead><tr><th>Policy</th><th>Before</th><th>After</th></tr></thead><tbody>{policyChanges.map(change => <tr key={change.label}><td>{change.label}</td><td>{change.before}</td><td>{change.after}</td></tr>)}</tbody></table> : <p className="text-xs">Automation policy unchanged.</p>)}
      <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-2 gap-y-0.5 text-[11px]">
        {parsed.fields.filter(field => !policyChanges || !["before", "after"].includes(field.key)).map((field, index) => (
          <div className="contents" key={`${field.key}-${index}`}>
            <dt>{field.label}</dt>
            <dd className="break-all font-mono text-foreground">{field.value}</dd>
          </div>
        ))}
      </dl>
      <details>
        <summary className="cursor-pointer text-[11px] text-primary">Raw details</summary>
        <code className="mt-1 block break-all text-[11px]">{parsed.raw}</code>
      </details>
    </div>
  );
}
