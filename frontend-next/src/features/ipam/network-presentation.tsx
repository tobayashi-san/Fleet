import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Label } from "@/components/ui/label";
import { type StatusTone } from "@/components/ui/status-badge";
import i18n from "@/lib/i18n";
import {
	AlertTriangle,
	RefreshCw
} from "lucide-react";
import {
	cloneElement,
	isValidElement,
	useId
} from "react";

export const tr = (key: string, options?: Record<string, unknown>) =>
  String(i18n.t(`ipam.${key}`, options));

export const statusLabel: Record<string, string> = {
  active: tr("active"),
  reserved: tr("reserved"),
  dhcp: tr("dhcp"),
  deprecated: tr("deprecated"),
  container: tr("container"),
};
export const capacityTone = (usage: number): "healthy" | "warning" | "critical" =>
  usage > 95 ? "critical" : usage >= 80 ? "warning" : "healthy";
export const statusTone = (status?: string): StatusTone =>
  status === "active"
    ? "success"
    : status === "reserved"
      ? "warning"
      : status === "dhcp"
        ? "info"
        : status === "deprecated"
          ? "muted"
          : "neutral";
export const sourceSystemName = (type?: string) =>
  type === "proxmox"
    ? "Proxmox"
    : type === "unifi"
      ? "UniFi"
      : type === "pfsense"
        ? "pfSense"
        : type === "system"
          ? "System"
        : type || "";

export function QueryLoadError({
  label,
  onRetry,
}: {
  label: string;
  onRetry: () => void;
}) {
  return (
    <Card>
      <EmptyState
        compact
        icon={<AlertTriangle className="h-5 w-5" />}
        title={`${label} could not be loaded`}
        description={tr("queryLoadDescription")}
        action={
          <Button variant="outline" onClick={onRetry}>
            <RefreshCw />
            {tr("tryAgain")}
          </Button>
        }
      />
    </Card>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const generatedId = useId();
  const child = isValidElement<{ id?: string }>(children)
    ? cloneElement(children, { id: children.props.id || generatedId })
    : children;
  const controlId = isValidElement<{ id?: string }>(child)
    ? child.props.id
    : undefined;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={controlId}>{label}</Label>
      {child}
    </div>
  );
}
export function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 bg-card px-3 py-2.5">
      <div className="text-[11px] leading-4 text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate font-mono text-xs font-medium" title={value}>
        {value}
      </div>
    </div>
  );
}
