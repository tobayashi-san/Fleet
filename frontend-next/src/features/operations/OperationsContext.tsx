import { MaintenanceWindow, readableTime } from '@/features/operations/model';
import {
	CalendarClock,
	CheckCircle2,
	CircleDashed,
	ClipboardList,
	TriangleAlert,
	Workflow
} from "lucide-react";

export function OperationsContext({
  canViewMaintenance,
  active,
  next,
  activeOperations,
  failedOperations,
  onShowFailures,
}: {
  canViewMaintenance: boolean;
  active?: MaintenanceWindow;
  next?: MaintenanceWindow;
  activeOperations: number;
  failedOperations: number;
  onShowFailures: () => void;
}) {
  const maintenance = active || next;
  const maintenanceState = !canViewMaintenance ? "Not available" : active
    ? "Active"
    : next
      ? "Scheduled"
      : "None scheduled";
  return (
    <section
      className={`overflow-hidden rounded-panel border bg-card ${active ? "border-amber-500/35" : ""}`}
      aria-label="Operating status"
    >
      <div className="flex flex-wrap items-stretch">
        <div className="flex min-w-[12rem] items-center gap-2 border-b px-3 py-2 text-sm font-semibold sm:border-b-0 sm:border-r">
            <ClipboardList className="h-4 w-4 text-brand" />
            Operating status
        </div>
        <OperationFact
          icon={CircleDashed}
          label="Active tasks"
          value={activeOperations}
          detail={activeOperations ? "Running or waiting" : "No open tasks"}
          tone={activeOperations ? "info" : undefined}
        />
        <OperationFact
          icon={failedOperations ? TriangleAlert : CheckCircle2}
          label="Open failures"
          value={failedOperations}
          detail={failedOperations ? "Review and acknowledge" : "No unacknowledged failures"}
          tone={failedOperations ? "danger" : "success"}
          onClick={failedOperations ? onShowFailures : undefined}
        />
        <OperationFact
          icon={CalendarClock}
          label="Maintenance"
          value={maintenanceState}
          detail={!canViewMaintenance ? "Visibility restricted" : maintenance ? maintenance.name : "No window scheduled"}
          tone={active ? "warning" : next ? "info" : undefined}
        />
      </div>
      {canViewMaintenance && maintenance && <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t bg-muted/15 px-3 py-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{active ? "Active window" : "Next window"}</span>
        <span>{readableTime(maintenance.starts_at)} – {readableTime(maintenance.ends_at)}</span>
        {maintenance.description && <span className="min-w-0 truncate">{maintenance.description}</span>}
      </div>}
    </section>
  );
}

export function OperationFact({
  icon: Icon,
  label,
  value,
  detail,
  tone,
  onClick,
}: {
  icon: typeof Workflow;
  label: string;
  value: string | number;
  detail: string;
  tone?: "info" | "warning" | "danger" | "success";
  onClick?: () => void;
}) {
  const toneClass =
    tone === "danger"
      ? "text-destructive"
      : tone === "success"
        ? "[color:hsl(var(--success))]"
        : tone === "warning"
          ? "[color:hsl(var(--warning))]"
          : tone === "info"
            ? "[color:hsl(var(--info))]"
            : "text-muted-foreground";
  const content = (
    <>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 ${toneClass}`} />
        {label}
      </div>
      <div className={`font-mono text-base font-semibold tabular-nums ${toneClass}`}>{value}</div>
      <p className="truncate text-xs text-muted-foreground">{detail}</p>
    </>
  );
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className="min-w-[12rem] flex-1 border-b px-3 py-2 text-left transition-colors hover:bg-accent/60 focus-visible:bg-accent/60 sm:border-b-0 sm:border-r last:border-r-0"
      aria-label={`${label}: ${detail}`}
    >
      {content}
    </button>
  ) : (
    <div className="min-w-[12rem] flex-1 border-b px-3 py-2 sm:border-b-0 sm:border-r last:border-r-0">{content}</div>
  );
}
