import { parseApiDate } from "@/lib/utils";
/** Runs that can still change infrastructure or produce additional output. */
export function isActiveRunStatus(status: unknown): boolean {
  return status === "queued" || status === "running" || status === "cancelling";
}

export function runActionLabel(action?: string): string {
  const labels: Record<string, string> = { plan: "Plan changes", apply: "Apply plan", destroy: "Destroy resources", "check-drift": "Check drift", drift: "Check drift", import: "Import resources", refresh: "Refresh state" };
  return action ? labels[action] || action.replace(/[_-]+/g, " ").replace(/^./, char => char.toUpperCase()) : "OpenTofu run";
}
export function runStatusLabel(status?: string): string {
  const labels: Record<string, string> = { queued: "Queued", running: "Running", cancelling: "Cancellation in progress", interrupted: "Interrupted", cancelled: "Cancelled", success: "Succeeded", completed: "Completed", failed: "Failed", error: "Failed" };
  return status ? labels[status] || status.replace(/[_-]+/g, " ").replace(/^./, char => char.toUpperCase()) : "Status unavailable";
}

export function runDurationLabel(run: { started_at?: string; completed_at?: string | null; status?: string }): string {
  if (!run.completed_at) return isActiveRunStatus(run.status) ? runStatusLabel(run.status) : "Not recorded";
  if (!run.started_at) return "Not recorded";
  const milliseconds = parseApiDate(run.completed_at).getTime() - parseApiDate(run.started_at).getTime();
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return "Not recorded";
  const seconds = Math.round(milliseconds / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}m ${seconds % 60}s`;
}

export function runIsolationLabel(run: { plan_safe?: number | null; status?: string }): string {
  if (run.plan_safe === 1) return "Passed";
  if (run.plan_safe === 0) return "Blocked";
  return isActiveRunStatus(run.status) ? "Pending" : "Not recorded";
}
