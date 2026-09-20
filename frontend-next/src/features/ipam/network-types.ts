export interface Prefix {
  id: string;
  environment_id: string;
  name: string;
  cidr: string;
  gateway?: string;
  dhcp_start?: string;
  dhcp_end?: string;
  dhcp_address_count?: number;
  dns_servers?: string[];
  vlan_id?: number | null;
  bridge?: string;
  proxmox_connection_id?: string;
  description?: string;
  status: string;
  role?: string;
  parent_id?: string | null;
  parent_cidr?: string | null;
  child_prefix_count: number;
  usable_address_count: number;
  used_address_count: number;
  free_address_count: number;
  reservation_count: number;
  range_count: number;
  next_free_address?: string | null;
}
export interface Reservation {
  id: string;
  address: string;
  hostname?: string;
  server_id?: string;
  server_name?: string;
  mac_address?: string;
  device_name?: string;
  status: string;
  configured_status?: string;
  role?: string;
  description?: string;
  source_type?: string;
  source_name?: string | null;
  last_synced_at?: string | null;
  conflict?: boolean;
  conflicts?: string[];
  observed_sources?: string[];
  source_observations?: SourceObservation[];
}
export interface SourceObservation {
  name: string;
  type: string;
  last_seen_at?: string | null;
}
export interface Allocation extends Partial<Reservation> {
  id: string;
  kind: "address" | "range";
  start_address: string;
  end_address: string;
  address_count: number;
  status: string;
  role?: string;
  description?: string;
  system_managed?: boolean;
}
export interface Server {
  id: string;
  name: string;
  ip_address?: string;
}
export interface ProxmoxConnection {
  id: string;
  name: string;
}
export interface SyncConflict {
  id: string;
  address: string;
  hostname?: string;
  mac_address?: string;
  reason: string;
  last_seen_at?: string;
  source_kind: "external" | "proxmox";
  source_type?: string;
  source_name: string;
  existing_reservation_id?: string;
  existing_address?: string;
  existing_hostname?: string;
  existing_source_type?: string;
  existing_server_id?: string;
  existing_server_name?: string;
}
export interface Paginated<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  free_segments?: FreeSpaceSegment[];
}
export interface FreeSpaceSegment {
  start_address: string;
  end_address: string;
  address_count: number;
  before_allocation_key: string | null;
}

