export interface PlanSummary {
  create: number;
  update: number;
  delete: number;
  replace: number;
  read?: number;
}

export function parsePlanSummary(value: unknown): PlanSummary | null {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    if (!["create", "update", "delete", "replace"].every(key => Number.isSafeInteger(parsed[key]) && parsed[key] >= 0)) return null;
    return parsed as PlanSummary;
  } catch { return null; }
}

export function planSummaryLabel(value: unknown): string {
  const summary = parsePlanSummary(value);
  if (!summary) return "Plan summary unavailable; review run logs";
  return `${summary.create} create · ${summary.update} update · ${summary.delete} delete · ${summary.replace} replace`;
}

/** Runs are supplied newest first by the run-history endpoint. */
export function driftResultLabel(runs: Array<{ action: string; status: string; plan_summary?: unknown }>): string {
  const latest = runs.find(run => run.action === "drift" || run.action === "check-drift");
  if (!latest) return "Not checked";
  if (["queued", "running", "cancelling"].includes(latest.status)) return "Check in progress";
  if (latest.status !== "success") return "Latest check unsuccessful; review run logs";
  const summary = parsePlanSummary(latest.plan_summary);
  if (!summary) return "Latest check summary unavailable";
  return summary.create + summary.update + summary.delete + summary.replace > 0 ? "Detected" : "None detected";
}
