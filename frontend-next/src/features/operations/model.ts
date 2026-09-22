import { type StatusTone } from "@/components/ui/status-badge";
import { formatDateTime } from "@/lib/utils";


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

export function readableTime(value?: string) {
  return formatDateTime(value);
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
