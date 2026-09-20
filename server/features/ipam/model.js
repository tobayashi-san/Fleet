const db = require("../../db");
const ADDRESS_STATUSES = new Set(["active", "reserved", "deprecated"]);
const ADDRESS_ROLES = new Set(["", "gateway", "loopback", "vip", "secondary"]);
const SUBNET_STATUSES = new Set(["active", "container", "reserved", "deprecated"]);
function withProxmoxSourceNames(rows) {
  const hasConnections = Boolean(
    db.db
      .prepare(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'tofu_proxmox_connections'",
      )
      .get(),
  );
  if (!hasConnections) return rows;
  const names = new Map(
    db.db
      .prepare("SELECT id, name FROM tofu_proxmox_connections")
      .all()
      .map((connection) => [connection.id, connection.name]),
  );
  return rows.map((row) => {
    if (row.source_type !== "proxmox" || row.source_name) return row;
    const connectionId = String(row.source_ref || "").split(":")[0];
    return { ...row, source_name: names.get(connectionId) || "Proxmox" };
  });
}

function findSubnetForAddress(environmentId, address) {
  const ip = ipv4(address);
  if (ip === null) return null;
  return (
    db.db
      .prepare("SELECT * FROM ipam_subnets WHERE environment_id = ?")
      .all(environmentId)
      .map((subnet) => ({ subnet, parsed: parseCidr(subnet.cidr) }))
      .filter(
        (item) =>
          item.parsed && (ip & item.parsed.mask) >>> 0 === item.parsed.network,
      )
      .sort((left, right) => right.parsed.prefix - left.parsed.prefix)[0]
      ?.subnet || null
  );
}

function ipv4(value) {
  const chunks = String(value || "")
    .trim()
    .split(".");
  if (
    chunks.length !== 4 ||
    chunks.some((chunk) => !/^\d{1,3}$/.test(chunk) || Number(chunk) > 255)
  )
    return null;
  return chunks.reduce((total, chunk) => total * 256 + Number(chunk), 0) >>> 0;
}
function parseCidr(value) {
  const [address, prefixText, extra] = String(value || "")
    .trim()
    .split("/");
  const prefix = Number(prefixText);
  const ip = ipv4(address);
  if (
    extra ||
    ip === null ||
    !Number.isInteger(prefix) ||
    prefix < 0 ||
    prefix > 32
  )
    return null;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  // Persist and compare every prefix in canonical network notation. Without
  // this, values such as 10.44.0.64/25 describe the same network as
  // 10.44.0.0/25 but could bypass duplicate-prefix checks.
  const network = (ip & mask) >>> 0;
  return { cidr: `${toIpv4(network)}/${prefix}`, prefix, network, mask };
}
function usableAddressCount(parsed) {
  const count = 2 ** (32 - parsed.prefix);
  return parsed.prefix <= 30 ? Math.max(0, count - 2) : count;
}
function toIpv4(number) {
  return [24, 16, 8, 0].map((shift) => (number >>> shift) & 255).join(".");
}
function isUsableAddress(number, parsed) {
  if ((number & parsed.mask) >>> 0 !== parsed.network) return false;
  if (parsed.prefix > 30) return true;
  const broadcast = (parsed.network | (~parsed.mask >>> 0)) >>> 0;
  return number !== parsed.network && number !== broadcast;
}
function usableRange(parsed) {
  const size = 2 ** (32 - parsed.prefix);
  const first = parsed.prefix <= 30 ? parsed.network + 1 : parsed.network;
  const last =
    parsed.prefix <= 30 ? parsed.network + size - 2 : parsed.network + size - 1;
  return { first: first >>> 0, last: last >>> 0 };
}
function prefixRange(parsed) {
  const size = 2 ** (32 - parsed.prefix);
  return { first: parsed.network, last: (parsed.network + size - 1) >>> 0 };
}
function cidrContains(container, child) {
  const containerRange = prefixRange(container);
  const childRange = prefixRange(child);
  return (
    containerRange.first <= childRange.first &&
    containerRange.last >= childRange.last
  );
}
function rangesOverlap(left, right) {
  return left.first <= right.last && right.first <= left.last;
}
function pagination(query, fallback = 50, maximum = 200) {
  const page = Math.max(1, Number.parseInt(String(query?.page || "1"), 10) || 1);
  const pageSize = Math.min(
    maximum,
    Math.max(1, Number.parseInt(String(query?.page_size || fallback), 10) || fallback),
  );
  return { page, pageSize, offset: (page - 1) * pageSize };
}
function paginated(items, page, pageSize, extra = {}) {
  const total = items.length;
  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    page,
    page_size: pageSize,
    total,
    total_pages: Math.max(1, Math.ceil(total / pageSize)),
    ...extra,
  };
}
function validateChoice(value, choices, fallback = "") {
  const normalized = String(value ?? fallback)
    .trim()
    .toLowerCase();
  if (!choices.has(normalized))
    throw new Error("Invalid status or role.");
  return normalized;
}
function getRanges(subnetId) {
  return db.db
    .prepare("SELECT * FROM ipam_ip_ranges WHERE subnet_id = ?")
    .all(subnetId);
}
function allocationKey(row) {
  return `${row.kind}:${row.id}`;
}
function freeSpaceSegments(subnet, allocations) {
  const parsed = parseCidr(subnet.cidr);
  if (!parsed) return [];
  const usable = usableRange(parsed);
  const allSubnets = db.db
    .prepare("SELECT id, cidr FROM ipam_subnets WHERE environment_id = ?")
    .all(subnet.environment_id);
  const occupied = allocations
    .map((row) => ({
      first: ipv4(row.start_address),
      last: ipv4(row.end_address),
    }))
    .filter((range) => range.first !== null && range.last !== null)
    .concat(
      directChildrenOf(subnet, allSubnets)
        .map((child) => parseCidr(child.cidr))
        .filter(Boolean)
        .map(prefixRange),
    )
    .map((range) => ({
      first: Math.max(usable.first, range.first),
      last: Math.min(usable.last, range.last),
    }))
    .filter((range) => range.first <= range.last)
    .sort((left, right) => left.first - right.first || left.last - right.last);
  const merged = [];
  for (const range of occupied) {
    const previous = merged[merged.length - 1];
    if (previous && range.first <= previous.last + 1)
      previous.last = Math.max(previous.last, range.last);
    else merged.push({ ...range });
  }
  const gaps = [];
  let cursor = usable.first;
  for (const range of merged) {
    if (cursor < range.first) gaps.push({ first: cursor, last: range.first - 1 });
    cursor = Math.max(cursor, range.last + 1);
  }
  if (cursor <= usable.last) gaps.push({ first: cursor, last: usable.last });
  const sortedAllocations = allocations
    .map((row) => ({ row, first: ipv4(row.start_address) }))
    .filter((entry) => entry.first !== null)
    .sort((left, right) => left.first - right.first);
  return gaps.map((gap) => {
    const next = sortedAllocations.find((entry) => entry.first > gap.last);
    return {
      start_address: toIpv4(gap.first),
      end_address: toIpv4(gap.last),
      address_count: gap.last - gap.first + 1,
      before_allocation_key: next ? allocationKey(next.row) : null,
    };
  });
}
function gatewayNumber(subnet) {
  const parsed = parseCidr(subnet?.cidr);
  const gateway = ipv4(subnet?.gateway);
  return parsed && gateway !== null && isUsableAddress(gateway, parsed)
    ? gateway
    : null;
}
function configuredDhcpRange(subnet) {
  const start = ipv4(subnet?.dhcp_start);
  const end = ipv4(subnet?.dhcp_end);
  return start !== null && end !== null && start <= end
    ? { first: start, last: end }
    : null;
}
function effectiveReservationStatus(row, subnet) {
  const address = ipv4(row?.address ?? row?.start_address);
  const pool = configuredDhcpRange(subnet);
  if (address !== null && pool && address >= pool.first && address <= pool.last)
    return "dhcp";
  return row?.status === "dhcp" ? "active" : row?.status;
}
function withEffectiveReservationStatus(row, subnet) {
  return {
    ...row,
    configured_status: row.status === "dhcp" ? "active" : row.status,
    status: effectiveReservationStatus(row, subnet),
  };
}
function requestedDhcpRange(body, subnet, parsed, otherSubnets = []) {
  const startText = String(body.dhcp_start ?? subnet?.dhcp_start ?? "").trim();
  const endText = String(body.dhcp_end ?? subnet?.dhcp_end ?? "").trim();
  if (!startText && !endText)
    return { dhcpStart: "", dhcpEnd: "", range: null };
  if (!startText || !endText)
    throw new Error("DHCP start and end must be provided together.");
  const start = ipv4(startText);
  const end = ipv4(endText);
  if (
    start === null ||
    end === null ||
    start > end ||
    !isUsableAddress(start, parsed) ||
    !isUsableAddress(end, parsed)
  )
    throw new Error("The DHCP range must contain usable addresses from this prefix.");
  const gateway = ipv4(String(body.gateway ?? subnet?.gateway ?? "").trim());
  if (gateway !== null && gateway >= start && gateway <= end)
    throw new Error("The DHCP range cannot contain the configured gateway.");
  const overlapsChild = otherSubnets.some((candidate) => {
    if (candidate.id && subnet?.id && candidate.id === subnet.id) return false;
    const child = parseCidr(candidate.cidr);
    if (!child || child.prefix <= parsed.prefix || !cidrContains(parsed, child))
      return false;
    return rangesOverlap({ first: start, last: end }, prefixRange(child));
  });
  if (overlapsChild)
    throw new Error("The DHCP range cannot overlap a delegated child prefix.");
  return {
    dhcpStart: toIpv4(start),
    dhcpEnd: toIpv4(end),
    range: { first: start, last: end },
  };
}
function allocationCoversAddress(rows, address) {
  return rows.some((row) => {
    const start = ipv4(row.start_address ?? row.address);
    const end = ipv4(row.end_address ?? row.address);
    return start !== null && end !== null && address >= start && address <= end;
  });
}
function systemGatewayAllocation(subnet, existingAllocations) {
  const gateway = gatewayNumber(subnet);
  if (gateway === null || allocationCoversAddress(existingAllocations, gateway))
    return null;
  const address = toIpv4(gateway);
  const observations = db.db
    .prepare(
      `SELECT source.name, source.type, observation.hostname,
              observation.mac_address, observation.last_seen_at
       FROM ipam_source_observations observation
       JOIN ipam_sync_sources source ON source.id = observation.source_id
       WHERE observation.subnet_id = ? AND observation.address = ?
         AND observation.reservation_id IS NULL
       ORDER BY observation.last_seen_at DESC, source.name COLLATE NOCASE`,
    )
    .all(subnet.id, address);
  const primary = observations.find(
    (observation) => observation.hostname || observation.mac_address,
  );
  const observedMacs = new Set(
    observations.map((observation) => canonicalMac(observation.mac_address)).filter(Boolean),
  );
  const conflicts = observedMacs.size > 1
    ? ["Gateway wird von externen Quellen mit unterschiedlichen MAC-Adressen beobachtet"]
    : [];
  const sourceObservations = observations.map((observation) => ({
    name: observation.name,
    type: observation.type,
    last_seen_at: observation.last_seen_at,
  }));
  return {
    id: `gateway:${subnet.id}`,
    subnet_id: subnet.id,
    kind: "address",
    address,
    start_address: address,
    end_address: address,
    address_count: 1,
    hostname: primary?.hostname || "Gateway",
    mac_address: canonicalMac(primary?.mac_address),
    status: "reserved",
    role: "gateway",
    description: "Configured gateway",
    source_type: "system",
    system_managed: true,
    conflicts,
    conflict: conflicts.length > 0,
    source_observations: sourceObservations,
    observed_sources: sourceObservations.map((observation) => observation.name),
  };
}
function gatewayHasStoredCollision(subnet, gateway) {
  if (gateway === null) return false;
  const address = toIpv4(gateway);
  if (
    db.db
      .prepare("SELECT 1 FROM ipam_reservations WHERE subnet_id = ? AND address = ?")
      .get(subnet.id, address)
  )
    return true;
  return getRanges(subnet.id).some((row) => {
    const start = ipv4(row.start_address);
    const end = ipv4(row.end_address);
    return start !== null && end !== null && gateway >= start && gateway <= end;
  });
}
function getUsage(subnet, directChildren = []) {
  const parsed = parseCidr(subnet.cidr);
  if (!parsed)
    return { usable: 0, used: 0, free: 0, reservationCount: 0, rangeCount: 0 };
  const reservations = db.db
    .prepare("SELECT address FROM ipam_reservations WHERE subnet_id = ?")
    .all(subnet.id);
  const ranges = getRanges(subnet.id);
  const rangeUsage = ranges.reduce((total, row) => {
    const start = ipv4(row.start_address);
    const end = ipv4(row.end_address);
    return start === null || end === null ? total : total + end - start + 1;
  }, 0);
  const usable = usableAddressCount(parsed);
  // A direct child prefix consumes its entire address block in the parent.
  // Counting only direct children avoids counting nested prefixes twice.
  const childUsage = directChildren.reduce((total, child) => {
    const childParsed = parseCidr(child.cidr);
    return total + (childParsed ? 2 ** (32 - childParsed.prefix) : 0);
  }, 0);
  const gateway = gatewayNumber(subnet);
  const gatewayCovered = gateway === null ||
    reservations.some((row) => ipv4(row.address) === gateway) ||
    ranges.some((row) => {
      const start = ipv4(row.start_address);
      const end = ipv4(row.end_address);
      return start !== null && end !== null && gateway >= start && gateway <= end;
    }) ||
    directChildren.some((child) => {
      const parsedChild = parseCidr(child.cidr);
      return parsedChild && rangesOverlap(
        { first: gateway, last: gateway },
        prefixRange(parsedChild),
      );
    });
  const gatewayUsage = gatewayCovered ? 0 : 1;
  const used = Math.min(
    usable,
    reservations.length + rangeUsage + childUsage + gatewayUsage,
  );
  return {
    usable,
    used,
    free: Math.max(0, usable - used),
    reservationCount: reservations.length + gatewayUsage,
    rangeCount: ranges.length,
    childUsage,
  };
}
function directChildrenOf(subnet, allSubnets) {
  const parsed = parseCidr(subnet.cidr);
  return (allSubnets || []).filter((candidate) => {
    if (candidate.id === subnet.id) return false;
    const child = parseCidr(candidate.cidr);
    if (
      !child ||
      !parsed ||
      child.prefix <= parsed.prefix ||
      !cidrContains(parsed, child)
    )
      return false;
    const ancestor = (allSubnets || [])
      .filter((other) => other.id !== candidate.id)
      .map((other) => ({ other, parsed: parseCidr(other.cidr) }))
      .filter(
        (item) =>
          item.parsed &&
          item.parsed.prefix < child.prefix &&
          cidrContains(item.parsed, child),
      )
      .sort((left, right) => right.parsed.prefix - left.parsed.prefix)[0];
    return ancestor?.other.id === subnet.id;
  });
}
function enrichSubnet(subnet, allSubnets) {
  const parsed = parseCidr(subnet.cidr);
  const parents = (allSubnets || [])
    .filter((candidate) => candidate.id !== subnet.id)
    .map((candidate) => ({ candidate, parsed: parseCidr(candidate.cidr) }))
    .filter(
      (item) =>
        item.parsed &&
        parsed &&
        item.parsed.prefix < parsed.prefix &&
        cidrContains(item.parsed, parsed),
    )
    .sort((left, right) => right.parsed.prefix - left.parsed.prefix);
  const parentId = parents[0]?.candidate.id || null;
  const directChildren = directChildrenOf(subnet, allSubnets);
  const usage = getUsage(subnet, directChildren);
  const dhcpPool = configuredDhcpRange(subnet);
  let dnsServers = [];
  try {
    dnsServers = JSON.parse(subnet.dns_servers || "[]");
  } catch {
    dnsServers = [];
  }
  return {
    ...subnet,
    dns_servers: Array.isArray(dnsServers) ? dnsServers : [],
    parent_id: parentId,
    parent_cidr: parents[0]?.candidate.cidr || null,
    child_prefix_count: directChildren.length,
    child_prefix_address_count: usage.childUsage,
    usable_address_count: usage.usable,
    used_address_count: usage.used,
    free_address_count: usage.free,
    reservation_count: usage.reservationCount,
    range_count: usage.rangeCount,
    dhcp_address_count: dhcpPool ? dhcpPool.last - dhcpPool.first + 1 : 0,
    next_free_address: parsed
      ? nextFreeAddress(subnet, parsed, directChildren)
      : null,
  };
}
function nextFreeAddress(subnet, parsed, directChildren = []) {
  const taken = new Set(
    db.db
      .prepare("SELECT address FROM ipam_reservations WHERE subnet_id = ?")
      .all(subnet.id)
      .map((row) => ipv4(row.address))
      .filter((value) => value !== null),
  );
  const gateway = gatewayNumber(subnet);
  if (gateway !== null) taken.add(gateway);
  const occupiedRanges = getRanges(subnet.id)
    .map((row) => ({
      start: ipv4(row.start_address),
      end: ipv4(row.end_address),
    }))
    .filter((range) => range.start !== null && range.end !== null);
  const delegatedRanges = directChildren
    .map((child) => parseCidr(child.cidr))
    .filter(Boolean)
    .map(prefixRange);
  const { first, last } = usableRange(parsed);
  // Do not turn a malformed /0 into a long-running request. Normal IPAM
  // prefixes find their next gap almost immediately; very large networks are
  // still represented by their exact free count.
  const ceiling = Math.min(last, first + 1000000);
  for (let current = first; current <= ceiling; current += 1)
    if (
      !taken.has(current) &&
      !occupiedRanges.some(
        (range) => current >= range.start && current <= range.end,
      ) &&
      !delegatedRanges.some(
        (range) => current >= range.first && current <= range.last,
      )
    )
      return toIpv4(current);
  return null;
}

function assignedServerError(environmentId, serverId) {
  if (!serverId) return null;
  const server = db.db
    .prepare("SELECT environment_id FROM servers WHERE id = ?")
    .get(serverId);
  if (!server || String(server.environment_id || "default") !== environmentId)
    return "The assigned host was not found in this environment.";
  return null;
}

function overlapsDelegatedPrefix(subnet, start, end = start) {
  const all = db.db
    .prepare("SELECT id, cidr FROM ipam_subnets WHERE environment_id = ?")
    .all(subnet.environment_id);
  return directChildrenOf(subnet, all).some((child) => {
    const parsed = parseCidr(child.cidr);
    return parsed && rangesOverlap(
      { first: start, last: end },
      prefixRange(parsed),
    );
  });
}

function overlapsEnvironmentAllocation(environmentId, subnetId, start, end = start, ignoredReservationId = null) {
  const reservations = db.db.prepare(`
    SELECT reservation.id, reservation.address
    FROM ipam_reservations reservation
    JOIN ipam_subnets subnet ON subnet.id = reservation.subnet_id
    WHERE subnet.environment_id = ? AND reservation.subnet_id <> ?
  `).all(environmentId, subnetId);
  if (reservations.some((row) => row.id !== ignoredReservationId && (() => {
    const value = ipv4(row.address);
    return value !== null && value >= start && value <= end;
  })())) return true;
  const ranges = db.db.prepare(`
    SELECT range.start_address, range.end_address
    FROM ipam_ip_ranges range
    JOIN ipam_subnets subnet ON subnet.id = range.subnet_id
    WHERE subnet.environment_id = ? AND range.subnet_id <> ?
  `).all(environmentId, subnetId);
  return ranges.some((row) => {
    const otherStart = ipv4(row.start_address);
    const otherEnd = ipv4(row.end_address);
    return otherStart !== null && otherEnd !== null && rangesOverlap(
      { first: start, last: end },
      { first: otherStart, last: otherEnd },
    );
  });
}

function reservationSpaceError(subnet, start, end = start) {
  const parsed = subnet && parseCidr(subnet.cidr);
  if (!subnet || !parsed) return "Network not found.";
  if (
    start === null || end === null || start > end ||
    !isUsableAddress(start, parsed) || !isUsableAddress(end, parsed)
  )
    return start === end
      ? "The address is outside the usable range of this prefix."
      : "The range must be fully inside the usable addresses of this prefix.";
  const gateway = gatewayNumber(subnet);
  if (gateway !== null && gateway >= start && gateway <= end)
    return "The selection contains the configured gateway.";
  if (overlapsDelegatedPrefix(subnet, start, end))
    return "The selection overlaps a delegated child prefix.";
  if (overlapsEnvironmentAllocation(subnet.environment_id, subnet.id, start, end))
    return "The selection overlaps an allocation in another prefix.";
  const addressOverlap = db.db
    .prepare("SELECT address FROM ipam_reservations WHERE subnet_id = ?")
    .all(subnet.id)
    .some((row) => {
      const value = ipv4(row.address);
      return value !== null && value >= start && value <= end;
    });
  const rangeOverlap = getRanges(subnet.id).some((row) => {
    const otherStart = ipv4(row.start_address);
    const otherEnd = ipv4(row.end_address);
    return otherStart !== null && otherEnd !== null && rangesOverlap(
      { first: start, last: end },
      { first: otherStart, last: otherEnd },
    );
  });
  if (addressOverlap || rangeOverlap)
    return "The selection overlaps an existing reservation.";
  return null;
}
function parseDns(value) {
  if (!Array.isArray(value)) return [];
  const servers = value
    .map((item) => String(item || "").trim())
    .filter(Boolean);
  if (servers.some((server) => ipv4(server) === null))
    throw new Error("DNS servers must be IPv4 addresses.");
  return [...new Set(servers)].slice(0, 6);
}
function normalizedHostname(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}
function normalizedMac(value) {
  const compact = String(value || "")
    .toLowerCase()
    .replace(/[^a-f0-9]/g, "");
  return compact.length === 12 ? compact : "";
}
function canonicalMac(value) {
  const compact = normalizedMac(value);
  return compact ? compact.match(/.{2}/g).join(":") : "";
}
function parseMac(value) {
  const input = String(value || "").trim();
  if (!input) return "";
  const mac = canonicalMac(input);
  if (!mac) throw new Error("A MAC address must contain 12 hexadecimal characters.");
  return mac;
}
function sameMachine(left, right) {
  const leftMac = normalizedMac(left?.mac_address ?? left?.mac);
  const rightMac = normalizedMac(right?.mac_address ?? right?.mac);
  return Boolean(leftMac && rightMac && leftMac === rightMac);
}
function canEnrichAutomatedMachine(observation, reservation) {
  return Boolean(
    normalizedMac(observation?.mac_address ?? observation?.mac) &&
      !normalizedMac(reservation?.mac_address ?? reservation?.mac) &&
      reservation?.source_type &&
      reservation.source_type !== "manual",
  );
}

// A reservation may be valid inside its own prefix while still conflict with
// a child/parent prefix or a second inventory source.  Keep the data instead
// of silently overwriting it and expose the conflict at the allocation where
// an administrator can resolve it.
function withReservationConflicts(rows, environmentId) {
  const all = db.db
    .prepare(
      `
    SELECT reservation.id, reservation.address, reservation.hostname, reservation.mac_address, subnet.cidr AS subnet_cidr
    FROM ipam_reservations reservation
    JOIN ipam_subnets subnet ON subnet.id = reservation.subnet_id
    WHERE subnet.environment_id = ?
  `,
    )
    .all(environmentId);
  const byAddress = new Map();
  const observations = db.db
    .prepare(
      `SELECT observation.reservation_id, source.name, source.type,
              observation.last_seen_at
       FROM ipam_source_observations observation
       JOIN ipam_sync_sources source ON source.id = observation.source_id
       WHERE observation.environment_id = ? AND observation.reservation_id IS NOT NULL
       ORDER BY source.name`,
    )
    .all(environmentId);
  const sourcesByReservation = new Map();
  for (const observation of observations) {
    const bucket = sourcesByReservation.get(observation.reservation_id) || [];
    if (!bucket.some((source) => source.name === observation.name))
      bucket.push({
        name: observation.name,
        type: observation.type,
        last_seen_at: observation.last_seen_at,
      });
    sourcesByReservation.set(observation.reservation_id, bucket);
  }
  const externalConflicts = db.db
    .prepare(
      `
    SELECT conflict.address, conflict.reason, source.name AS source_name, 'external' AS source_kind
    FROM ipam_sync_conflicts conflict
    LEFT JOIN ipam_sync_sources source ON source.id = conflict.source_id
    WHERE conflict.environment_id = ?
    UNION ALL
    SELECT conflict.address, conflict.reason, '' AS source_name, 'proxmox' AS source_kind
    FROM ipam_proxmox_sync_conflicts conflict
    WHERE conflict.environment_id = ?
  `,
    )
    .all(environmentId, environmentId);
  const externalByAddress = new Map();
  for (const conflict of externalConflicts) {
    const key = String(conflict.address || "").trim();
    const bucket = externalByAddress.get(key) || [];
    bucket.push(conflict);
    externalByAddress.set(key, bucket);
  }
  for (const row of all) {
    const add = (map, key) => {
      if (!key) return;
      const bucket = map.get(key) || [];
      bucket.push(row);
      map.set(key, bucket);
    };
    add(byAddress, String(row.address || "").trim());
  }
  return rows.map((row) => {
    const conflicts = [];
    if (
      (byAddress.get(String(row.address || "").trim()) || []).some(
        (other) => other.id !== row.id && !sameMachine(row, other),
      )
    )
      conflicts.push("IP address is recorded more than once in this environment");
    for (const external of externalByAddress.get(
      String(row.address || "").trim(),
    ) || []) {
      const origin =
        external.source_kind === "proxmox"
          ? `Proxmox ${external.source_name || "connection"}`
          : external.source_name || "external source";
      conflicts.push(`Konflikt mit ${origin}: ${external.reason}`);
    }
    return {
      ...row,
      mac_address: canonicalMac(row.mac_address),
      source_observations: sourcesByReservation.get(row.id) || [],
      observed_sources: (sourcesByReservation.get(row.id) || []).map(
        (source) => source.name,
      ),
      conflicts,
      conflict: conflicts.length > 0,
    };
  });
}

function validatePrefixConnection(value, environmentId) {
  const id = String(value || '').trim();
  if (id && !db.db.prepare('SELECT 1 FROM tofu_proxmox_connections WHERE id = ? AND environment_id = ?').get(id, environmentId)) throw new Error('Select a Proxmox connection from this environment.');
  return id;
}


module.exports = { withProxmoxSourceNames, findSubnetForAddress, ipv4, parseCidr, usableAddressCount, toIpv4, isUsableAddress, usableRange, prefixRange, cidrContains, rangesOverlap, pagination, paginated, validateChoice, getRanges, allocationKey, freeSpaceSegments, gatewayNumber, configuredDhcpRange, effectiveReservationStatus, withEffectiveReservationStatus, requestedDhcpRange, allocationCoversAddress, systemGatewayAllocation, gatewayHasStoredCollision, getUsage, directChildrenOf, enrichSubnet, nextFreeAddress, assignedServerError, overlapsDelegatedPrefix, overlapsEnvironmentAllocation, reservationSpaceError, parseDns, normalizedHostname, normalizedMac, canonicalMac, parseMac, sameMachine, canEnrichAutomatedMachine, withReservationConflicts, validatePrefixConnection, ADDRESS_STATUSES, ADDRESS_ROLES, SUBNET_STATUSES };
