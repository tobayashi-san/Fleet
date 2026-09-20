import i18n from "@/lib/i18n";


export interface Prefix {
  id: string;
  name: string;
  cidr: string;
  gateway?: string;
  dhcp_start?: string;
  dhcp_end?: string;
  dhcp_address_count?: number;
  vlan_id?: number | null;
  bridge?: string;
  proxmox_connection_id?: string;
  description?: string;
  status: string;
  role?: string;
  parent_id?: string | null;
  child_prefix_count: number;
  child_prefix_address_count?: number;
  usable_address_count: number;
  used_address_count: number;
  free_address_count: number;
  reservation_count: number;
  range_count: number;
}

export interface SyncSource {
  id: string;
  type: "unifi" | "pfsense";
  name: string;
  endpoint: string;
  site?: string;
  path?: string;
  insecure: boolean;
  enabled: boolean;
  auto_sync: boolean;
  sync_interval_min: number;
  api_token_configured: boolean;
  last_synced_at?: string;
  last_status?: string;
  last_error?: string;
  last_tested_at?: string;
  last_test_status?: string;
  last_test_error?: string;
  inventory_count?: number;
  record_count?: number;
  ignored_count?: number;
  conflict_count?: number;
}

export interface SourceTestResult {
  records: number;
  matching_prefixes: number;
  outside_prefixes: number;
  samples?: Array<{
    address?: string;
    hostname?: string | null;
    mac_address?: string | null;
  }>;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface PrefixPage extends Paginated<Prefix> {
  summary: {
    prefix_count: number;
    child_prefix_count: number;
    usable_address_count: number;
    used_address_count: number;
    free_address_count: number;
    reservation_count: number;
    range_count: number;
  };
}

export interface SearchResult {
  id: string;
  kind: "prefix" | "address" | "range";
  label: string;
  secondary: string;
  subnet_id: string;
  subnet_cidr: string;
  status: string;
  description?: string;
  server_id?: string | null;
}

export interface ProxmoxConnection { id: string; name: string }

export const tr = (key: string, options?: Record<string, unknown>) =>
  String(i18n.t(`ipam.${key}`, options));

export const statusVariant = (
  status: string,
): "success" | "default" | "warning" | "muted" =>
  (({
    active: "success",
    container: "default",
    reserved: "warning",
    deprecated: "muted",
  })[status] || "muted") as "success" | "default" | "warning" | "muted";

export const statusLabel: Record<string, string> = {
  active: tr("active"),
  container: tr("container"),
  reserved: tr("reserved"),
  deprecated: tr("deprecated"),
};
