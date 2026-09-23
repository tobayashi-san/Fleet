import { type StatusTone } from "@/components/ui/status-badge";


export interface Workspace {
  id: string;
  name: string;
}

export interface OperationRow {
  executions?: Array<{ id: string; time?: string }>;
  id: string;
  source: "Host" | "Deployment" | "Workflow";
  name: string;
  target: string;
  target_detail?: string;
  target_deleted?: boolean;
  playbook?: string;
  check_mode?: boolean;
  schedule_deleted?: boolean;
  started_at?: string;
  completed_at?: string;
  action?: string;
  initiator: string;
  status: string;
  statusTone: StatusTone;
  acknowledged?: boolean;
  acknowledged_at?: string | null;
  acknowledged_by?: string | null;
  time?: string;
  href?: "/servers/$id" | "/deployments/$id" | "/playbooks";
  params?: Record<string, string>;
}

export interface OperationsResponse {
  items: OperationRow[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  counts: { all: number; active: number; failed: number };
}

export function operationSourceLabel(source: OperationRow["source"]) {
  return source === "Host"
    ? "Host operation"
    : source === "Deployment"
    ? "Deployment"
    : "Playbook workflow";
}

export function operationStatusLabel(status: string) {
  const normalized = status.toLowerCase();
  if (
    normalized === "success" ||
    normalized === "completed" ||
    normalized === "erfolgreich"
  )
    return "Successful";
  if (
    normalized === "failed" ||
    normalized === "error" ||
    normalized === "fehlgeschlagen"
  )
    return "Failed";
  if (normalized === "running") return "Running";
  if (normalized === "queued") return "Queued";
  if (normalized === "pending") return "Pending";
  if (normalized === "cancelling") return "Cancelling";
  if (["cancelled", "canceled"].includes(normalized)) return "Cancelled";
  if (normalized === "skipped") return "Skipped";
  return status || "Unknown";
}

export function operationDisplayTone(row: OperationRow): StatusTone {
  return row.acknowledged ? "muted" : row.statusTone;
}

export function operationDisplayLabel(row: OperationRow) {
  return row.acknowledged
    ? `${operationStatusLabel(row.status)} · acknowledged`
    : operationStatusLabel(row.status);
}

const plural = (count: number, one: string, other: string) => `${count} ${count === 1 ? one : other}`;

/** One readable result line; zero counts are left out. */
export function hostResultSummary(results: { status: string; changed: number | null }[]) {
  const failed = results.filter(host => host.status === 'failed').length;
  const unknown = results.filter(host => host.status === 'unknown').length;
  const changed = results.reduce((sum, host) => sum + (host.changed || 0), 0);
  const parts = [failed
    ? `${failed} of ${plural(results.length, 'host', 'hosts')} failed`
    : unknown === results.length ? `No result recorded for ${plural(results.length, 'host', 'hosts')}` : `${plural(results.length - unknown, 'host', 'hosts')} succeeded`];
  if (changed) parts.push(plural(changed, 'changed task', 'changed tasks'));
  if (unknown && unknown !== results.length) parts.push(`${unknown} without a result`);
  return parts.join(' · ');
}

/** Workflow facts that the page title does not already say. */
export function workflowFacts(row: { name: string; playbook?: string; check_mode?: boolean; schedule_deleted?: boolean }) {
  return [row.check_mode ? 'Dry run' : '', row.playbook && !row.name.startsWith(row.playbook) ? `Playbook ${row.playbook}` : '', row.schedule_deleted ? 'Schedule deleted' : ''].filter(Boolean).join(' · ');
}
