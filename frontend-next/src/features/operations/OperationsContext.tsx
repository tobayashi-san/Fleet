import {
	CheckCircle2,
	CircleDashed,
	ClipboardList,
	TriangleAlert,
	Workflow
} from "lucide-react";

export function OperationsContext({
  activeOperations,
  failedOperations,
  onShowFailures,
}: {
  activeOperations: number;
  failedOperations: number;
  onShowFailures: () => void;
}) {
  return (
    <section
      className="overflow-hidden rounded-panel border bg-card"
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
      </div>
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
