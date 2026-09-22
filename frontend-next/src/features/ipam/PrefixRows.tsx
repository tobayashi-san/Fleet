import { Badge } from "@/components/ui/badge";
import { Prefix, statusVariant, tr } from '@/features/ipam/prefix-model';
import { Link } from "@tanstack/react-router";
import {
	ChevronRight,
	Network
} from "lucide-react";
import { statusLabel } from './prefix-model';

/** A bridge named after its VLAN (vlan10 for VLAN 10) repeats information. */
export function distinctBridge(prefix: Prefix) {
  const bridge = prefix.bridge || '';
  return bridge && !(prefix.vlan_id && bridge.toLowerCase() === `vlan${prefix.vlan_id}`) ? bridge : '';
}

export function PrefixRow({
  prefix,
  depth,
  checked,
  onToggle,
  canSelect,
  showDescription = true,
}: {
  prefix: Prefix;
  depth: number;
  checked: boolean;
  onToggle: () => void;
  canSelect: boolean;
  showDescription?: boolean;
}) {
  return (
    <tr data-selected={checked || undefined}>
      {canSelect && <td className="px-3">
        <input
          type="checkbox"
          aria-label={tr("selectPrefix", { cidr: prefix.cidr })}
          checked={checked}
          onChange={onToggle}
        />
      </td>}
      <td className="px-3">
        <Link
          to="/networks/$id"
          params={{ id: prefix.id }}
          className="flex min-w-0 items-center gap-2 hover:text-primary"
          style={{ paddingLeft: `${Math.min(depth, 6) * 20}px` }}
        >
          <Network className="h-4 w-4 shrink-0 text-brand" />
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-semibold text-foreground">
              {prefix.name || prefix.cidr}
            </span>
            <span className="mt-0.5 flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">
                {prefix.cidr}
              </span>
              {prefix.child_prefix_count > 0 && (
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {tr("childCount", { count: prefix.child_prefix_count })}
                </span>
              )}
            </span>
          </span>
        </Link>
      </td>
      <td className="px-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <Badge variant={statusVariant(prefix.status)}>
            {statusLabel[prefix.status] || prefix.status}
          </Badge>
          {prefix.role && (
            <span className="truncate text-xs text-muted-foreground">
              {prefix.role}
            </span>
          )}
        </div>
      </td>
      <td className="px-3">
        <span>{prefix.vlan_id ? `VLAN ${prefix.vlan_id}` : distinctBridge(prefix) ? "" : "—"}</span>
        {distinctBridge(prefix) && <span className="ml-1.5 font-mono text-xs text-muted-foreground">
          {distinctBridge(prefix)}
        </span>}
        {prefix.dhcp_start && prefix.dhcp_end && (
          <div className="mt-1 flex items-center gap-1.5 text-xs">
            <Badge variant="outline">{tr("dhcp")}</Badge>
            <span className="font-mono text-muted-foreground">
              {prefix.dhcp_start} – {prefix.dhcp_end}
            </span>
          </div>
        )}
      </td>
      {showDescription && <td className="max-w-[250px] px-3">
        <span className="block truncate text-muted-foreground">
          {prefix.description || "—"}
        </span>
      </td>}
      <td className="px-3">
        <Link
          to="/networks/$id"
          params={{ id: prefix.id }}
          aria-label={tr("openPrefix", { cidr: prefix.cidr })}
          className="inline-flex text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </td>
    </tr>
  );
}

export function PrefixMobileCard({
  prefix,
  depth,
  checked,
  onToggle,
  canSelect,
}: {
  prefix: Prefix;
  depth: number;
  checked: boolean;
  onToggle: () => void;
  canSelect: boolean;
}) {
  const networkLabel = [
    prefix.vlan_id ? `VLAN ${prefix.vlan_id}` : null,
    distinctBridge(prefix) || null,
  ].filter(Boolean).join(" · ") || "—";

  return (
    <article
      className="min-w-0 p-3"
      data-selected={checked || undefined}
      style={{ paddingLeft: `${12 + Math.min(depth, 4) * 12}px` }}
    >
      <div className="flex min-w-0 items-start gap-3">
        {canSelect && (
          <input
            type="checkbox"
            className="mt-1 shrink-0"
            aria-label={tr("selectPrefix", { cidr: prefix.cidr })}
            checked={checked}
            onChange={onToggle}
          />
        )}
        <Link
          to="/networks/$id"
          params={{ id: prefix.id }}
          className="min-w-0 flex-1"
        >
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-foreground">
                {prefix.name || prefix.cidr}
              </div>
              <div className="mt-0.5 break-all font-mono text-xs text-muted-foreground">
                {prefix.cidr}
              </div>
            </div>
            <Badge className="shrink-0" variant={statusVariant(prefix.status)}>
              {statusLabel[prefix.status] || prefix.status}
            </Badge>
          </div>
          <dl className="mt-2 grid min-w-0 gap-1.5 text-xs">
            <div className="flex min-w-0 gap-2">
              <dt className="shrink-0 text-muted-foreground">{tr("vlanBridge")}</dt>
              <dd className="min-w-0 break-all font-mono text-foreground">{networkLabel}</dd>
            </div>
            <div className="flex min-w-0 gap-2">
              <dt className="shrink-0 text-muted-foreground">{tr("descriptionLabel")}</dt>
              <dd className="min-w-0 break-words text-foreground">{prefix.description || "—"}</dd>
            </div>
          </dl>
        </Link>
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
    </article>
  );
}

export function NetworkFact({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string | number;
  detail: string;
  tone?: "success";
}) {
  return (
    <div className="console-object-info">
      <div>{label}</div>
      <div
        className={
          tone === "success" ? "[color:hsl(var(--success))]" : undefined
        }
      >
        {value}
      </div>
      <p>{detail}</p>
    </div>
  );
}
