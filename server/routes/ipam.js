const express = require("express");
const db = require("../db");
const { getPermissions, can, canAccessEnvironment } = require("../utils/permissions");
const {
  ipv4,
  parseCidr,
  isUsableAddress,
  prefixRange,
  cidrContains,
  rangesOverlap,
  pagination,
  paginated,
  validateChoice,
  configuredDhcpRange,
  withEffectiveReservationStatus,
  requestedDhcpRange,
  gatewayHasStoredCollision,
  enrichSubnet,
  overlapsDelegatedPrefix,
  parseDns,
  validatePrefixConnection,
  SUBNET_STATUSES,
} = require("../features/ipam/model");
const { syncIpamSource } = require("../features/ipam/source-sync");
const router = express.Router();
const guard = (cap) => (req, res, next) =>
  can(getPermissions(req.user), cap)
    ? next()
    : res.status(403).json({ error: "Permission denied" });
const guardEnvironment = (req, res, environmentId) => {
  if (req.environmentId && String(environmentId || "default") !== req.environmentId) {
    res.status(404).json({ error: "Resource not found in this environment." });
    return false;
  }
  if (canAccessEnvironment(getPermissions(req.user), environmentId))
    return true;
  res.status(403).json({ error: "Permission denied for this environment." });
  return false;
};
router.get("/subnets", guard("canViewNetworks"), (req, res) => {
  const environmentId =
    req.environmentId || String(req.query.environment_id || "default").trim() || "default";
  if (!guardEnvironment(req, res, environmentId)) return;
  const rows = db.db
    .prepare(
      "SELECT * FROM ipam_subnets WHERE environment_id = ? ORDER BY cidr",
    )
    .all(environmentId);
  const enriched = rows.map((row) => enrichSubnet(row, rows));
  if (String(req.query.paginated || "") !== "1") return res.json(enriched);
  const query = String(req.query.q || "").trim().toLowerCase();
  const status = String(req.query.status || "current").trim().toLowerCase();
  const filtered = enriched.filter((row) => {
    const matchesQuery = !query || [row.name, row.cidr, row.description, row.gateway, row.dhcp_start, row.dhcp_end, row.bridge, row.role]
      .some((value) => String(value || "").toLowerCase().includes(query));
    const matchesStatus = status === "all"
      || (status === "current" ? row.status !== "deprecated" : row.status === status);
    return matchesQuery && matchesStatus;
  });
  const roots = enriched.filter((row) => !row.parent_id);
  const totalAddresses = roots.reduce((sum, row) => sum + row.usable_address_count, 0);
  const usedAddresses = roots.reduce((sum, row) => sum + row.used_address_count, 0);
  const { page, pageSize } = pagination(req.query);
  res.json(paginated(filtered, page, pageSize, {
    summary: {
      prefix_count: roots.length,
      child_prefix_count: enriched.length - roots.length,
      usable_address_count: totalAddresses,
      used_address_count: usedAddresses,
      free_address_count: Math.max(0, totalAddresses - usedAddresses),
      reservation_count: roots.reduce((sum, row) => sum + row.reservation_count, 0),
      range_count: roots.reduce((sum, row) => sum + row.range_count, 0),
    },
  }));
});

router.get("/search", guard("canViewNetworks"), (req, res) => {
  const environmentId = req.environmentId
    || String(req.query.environment_id || "default").trim()
    || "default";
  if (!guardEnvironment(req, res, environmentId)) return;
  const query = String(req.query.q || "").trim();
  const { page, pageSize } = pagination(req.query, 30, 100);
  if (!query) return res.json(paginated([], page, pageSize));
  const like = `%${query}%`;
  const prefixes = db.db.prepare(`
    SELECT 'prefix' AS kind, subnet.id, subnet.cidr AS label, subnet.name AS secondary,
           subnet.id AS subnet_id, subnet.cidr AS subnet_cidr, subnet.status,
           subnet.description, NULL AS server_id
    FROM ipam_subnets subnet
    WHERE subnet.environment_id = ?
      AND (subnet.cidr LIKE ? OR subnet.name LIKE ? OR subnet.gateway LIKE ?
        OR subnet.dhcp_start LIKE ? OR subnet.dhcp_end LIKE ?
        OR subnet.description LIKE ? OR subnet.bridge LIKE ? OR CAST(subnet.vlan_id AS TEXT) LIKE ?)
  `).all(environmentId, like, like, like, like, like, like, like, like);
  const addresses = db.db.prepare(`
    SELECT 'address' AS kind, reservation.id, reservation.address,
           reservation.address AS label,
           COALESCE(NULLIF(device.name, ''), NULLIF(reservation.hostname, ''), server.name, 'IP address') AS secondary,
           subnet.id AS subnet_id, subnet.cidr AS subnet_cidr, reservation.status,
           subnet.dhcp_start, subnet.dhcp_end,
           reservation.description, reservation.server_id
    FROM ipam_reservations reservation
    JOIN ipam_subnets subnet ON subnet.id = reservation.subnet_id
    LEFT JOIN servers server ON server.id = reservation.server_id AND server.environment_id = subnet.environment_id
    LEFT JOIN ipam_device_names device ON device.environment_id = subnet.environment_id AND device.mac_address = reservation.mac_address
    WHERE subnet.environment_id = ?
      AND (reservation.address LIKE ? OR reservation.hostname LIKE ? OR reservation.mac_address LIKE ?
        OR reservation.description LIKE ? OR server.name LIKE ? OR device.name LIKE ?)
  `).all(environmentId, like, like, like, like, like, like);
  const ranges = db.db.prepare(`
    SELECT 'range' AS kind, range.id,
           range.start_address || ' – ' || range.end_address AS label,
           COALESCE(NULLIF(range.description, ''), 'Reserved range') AS secondary,
           subnet.id AS subnet_id, subnet.cidr AS subnet_cidr, range.status,
           range.description, NULL AS server_id
    FROM ipam_ip_ranges range
    JOIN ipam_subnets subnet ON subnet.id = range.subnet_id
    WHERE subnet.environment_id = ?
      AND (range.start_address LIKE ? OR range.end_address LIKE ? OR range.description LIKE ?)
  `).all(environmentId, like, like, like);
  const effectiveAddresses = addresses.map((row) =>
    withEffectiveReservationStatus(row, row),
  );
  const results = [...prefixes, ...effectiveAddresses, ...ranges].sort((left, right) =>
    String(left.label).localeCompare(String(right.label), undefined, { numeric: true }),
  );
  res.json(paginated(results, page, pageSize));
});

router.get("/subnets/:id", guard("canViewNetworks"), (req, res) => {
  const subnet = db.db
    .prepare("SELECT * FROM ipam_subnets WHERE id = ?")
    .get(req.params.id);
  if (!subnet)
    return res.status(404).json({ error: "Network not found." });
  if (!guardEnvironment(req, res, subnet.environment_id)) return;
  const allSubnets = db.db
    .prepare("SELECT * FROM ipam_subnets WHERE environment_id = ?")
    .all(subnet.environment_id);
  res.json(enrichSubnet(subnet, allSubnets));
});

router.post("/subnets", guard("canEditNetworks"), (req, res) => {
  try {
    const body = req.body || {};
    const environmentId =
      String(body.environment_id || "default").trim() || "default";
    if (!guardEnvironment(req, res, environmentId)) return;
    const name = String(body.name || "")
      .trim()
      .slice(0, 80);
    const parsed = parseCidr(body.cidr);
    const gateway = String(body.gateway || "").trim();
    if (!name || !parsed)
      return res
        .status(400)
        .json({ error: "A name and valid IPv4 CIDR are required." });
    if (
      !db.db
        .prepare("SELECT 1 FROM environments WHERE id = ?")
        .get(environmentId)
    )
      return res.status(400).json({ error: "Environment not found." });
    if (
      gateway &&
      (ipv4(gateway) === null ||
        !isUsableAddress(ipv4(gateway), parsed))
    )
      return res.status(400).json({ error: "The gateway is not a usable address in this subnet." });
    const vlan =
      body.vlan_id === "" || body.vlan_id === undefined
        ? null
        : Number(body.vlan_id);
    if (vlan !== null && (!Number.isInteger(vlan) || vlan < 1 || vlan > 4094))
      return res
        .status(400)
        .json({ error: "VLAN must be between 1 and 4094." });
    const existing = db.db
      .prepare("SELECT id, cidr, dhcp_start, dhcp_end FROM ipam_subnets WHERE environment_id = ?")
      .all(environmentId);
    const invalidOverlap = existing.some((row) => {
      const other = parseCidr(row.cidr);
      if (!other || !rangesOverlap(prefixRange(parsed), prefixRange(other)))
        return false;
      // NetBox-like automatic hierarchy: contained prefix is valid, only
      // partial overlaps and exact duplicates are rejected.
      return !(cidrContains(parsed, other) || cidrContains(other, parsed));
    });
    if (invalidOverlap)
      return res
        .status(409)
        .json({
          error:
            "This prefix partially overlaps an existing prefix.",
        });
    if (existing.some((row) => parseCidr(row.cidr)?.cidr === parsed.cidr))
      return res
        .status(409)
        .json({ error: "This prefix already exists in this environment." });
    const overlapsParentDhcpPool = existing.some((row) => {
      const parent = parseCidr(row.cidr);
      const pool = configuredDhcpRange(row);
      return Boolean(
        parent &&
          pool &&
          parent.prefix < parsed.prefix &&
          cidrContains(parent, parsed) &&
          rangesOverlap(pool, prefixRange(parsed)),
      );
    });
    if (overlapsParentDhcpPool)
      return res.status(409).json({
        error: "The child prefix overlaps its parent prefix's DHCP range.",
      });
    const { dhcpStart, dhcpEnd } = requestedDhcpRange(
      body,
      { gateway },
      parsed,
      existing,
    );
    const id = db.uuidv4();
    const status = validateChoice(body.status, SUBNET_STATUSES, "active");
    const role = String(body.role || "")
      .trim()
      .slice(0, 60);
    db.db.transaction(() => {
      db.db
        .prepare(
          "INSERT INTO ipam_subnets (id, environment_id, name, cidr, gateway, dhcp_start, dhcp_end, dns_servers, vlan_id, bridge, description, status, role, proxmox_connection_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .run(
          id,
          environmentId,
          name,
          parsed.cidr,
          gateway,
          dhcpStart,
          dhcpEnd,
          JSON.stringify(parseDns(body.dns_servers)),
          vlan,
          String(body.bridge || "")
            .trim()
            .slice(0, 80),
          String(body.description || "")
            .trim()
            .slice(0, 500),
          status,
          role,
          validatePrefixConnection(body.proxmox_connection_id, environmentId),
        );
      db.auditLog.write(
        "ipam.subnet_create",
        `subnet=${name} cidr=${parsed.cidr}`,
        req.ip,
        true,
        req.user?.username,
      );
    })();
    res
      .status(201)
      .json(db.db.prepare("SELECT * FROM ipam_subnets WHERE id = ?").get(id));
  } catch (error) {
    res
      .status(400)
      .json({
        error: error.message || "Subnetz konnte nicht erstellt werden.",
      });
  }
});

router.put("/subnets/:id", guard("canEditNetworks"), (req, res) => {
  const subnet = db.db
    .prepare("SELECT * FROM ipam_subnets WHERE id = ?")
    .get(req.params.id);
  if (!subnet)
    return res.status(404).json({ error: "Network not found." });
  if (!guardEnvironment(req, res, subnet.environment_id)) return;
  try {
    const body = req.body || {};
    if (body.cidr !== undefined && parseCidr(body.cidr)?.cidr !== subnet.cidr)
      return res.status(409).json({
        error: "The CIDR of an existing prefix cannot be changed. Create a new prefix instead.",
      });
    const parsed = parseCidr(subnet.cidr);
    const name = String(body.name ?? subnet.name).trim().slice(0, 80);
    const gateway = String(body.gateway ?? subnet.gateway ?? "").trim();
    if (!name) return res.status(400).json({ error: "Name is required." });
    if (gateway && (ipv4(gateway) === null || !isUsableAddress(ipv4(gateway), parsed)))
      return res.status(400).json({
        error: "The gateway is not a usable address in this subnet.",
      });
    const gatewayValue = gateway ? ipv4(gateway) : null;
    if (
      gateway !== String(subnet.gateway || "").trim() &&
      (gatewayHasStoredCollision(subnet, gatewayValue) ||
        (gatewayValue !== null && overlapsDelegatedPrefix(subnet, gatewayValue)))
    )
      return res.status(409).json({
        error: "The gateway address is already occupied by an address, range, or child prefix.",
      });
    const vlanValue = body.vlan_id === undefined ? subnet.vlan_id : body.vlan_id;
    const vlan = vlanValue === "" || vlanValue === null ? null : Number(vlanValue);
    if (vlan !== null && (!Number.isInteger(vlan) || vlan < 1 || vlan > 4094))
      return res.status(400).json({ error: "VLAN must be between 1 and 4094." });
    const dnsServers = body.dns_servers === undefined
      ? (() => { try { return JSON.parse(subnet.dns_servers || "[]"); } catch { return []; } })()
      : parseDns(body.dns_servers);
    const allSubnets = db.db
      .prepare("SELECT id, cidr FROM ipam_subnets WHERE environment_id = ?")
      .all(subnet.environment_id);
    const { dhcpStart, dhcpEnd } = requestedDhcpRange(
      body,
      { ...subnet, gateway },
      parsed,
      allSubnets,
    );
    const status = validateChoice(body.status, SUBNET_STATUSES, subnet.status || "active");
    db.db.transaction(() => {
      db.db.prepare(`
        UPDATE ipam_subnets
        SET name = ?, gateway = ?, dhcp_start = ?, dhcp_end = ?, dns_servers = ?, vlan_id = ?, bridge = ?,
            description = ?, status = ?, role = ?, proxmox_connection_id = ?
        WHERE id = ?
      `).run(
        name,
        gateway,
        dhcpStart,
        dhcpEnd,
        JSON.stringify(dnsServers),
        vlan,
        String(body.bridge ?? subnet.bridge ?? "").trim().slice(0, 80),
        String(body.description ?? subnet.description ?? "").trim().slice(0, 500),
        status,
        String(body.role ?? subnet.role ?? "").trim().slice(0, 60),
        validatePrefixConnection(body.proxmox_connection_id ?? subnet.proxmox_connection_id, subnet.environment_id),
        subnet.id,
      );
      db.auditLog.write(
        "ipam.subnet_update",
        `subnet=${subnet.cidr} name=${name}`,
        req.ip,
        true,
        req.user?.username,
      );
    })();
    const updated = db.db.prepare("SELECT * FROM ipam_subnets WHERE id = ?").get(subnet.id);
    const all = db.db.prepare("SELECT * FROM ipam_subnets WHERE environment_id = ?").all(subnet.environment_id);
    res.json(enrichSubnet(updated, all));
  } catch (error) {
    res.status(400).json({ error: error.message || "Prefix konnte nicht gespeichert werden." });
  }
});

router.delete("/subnets/:id", guard("canEditNetworks"), (req, res) => {
  const subnet = db.db
    .prepare("SELECT * FROM ipam_subnets WHERE id = ?")
    .get(req.params.id);
  if (!subnet)
    return res.status(404).json({ error: "Network not found." });
  if (!guardEnvironment(req, res, subnet.environment_id)) return;
  const counts = {
    reservations: Number(db.db.prepare("SELECT COUNT(*) AS count FROM ipam_reservations WHERE subnet_id = ?").get(subnet.id)?.count || 0),
    ranges: Number(db.db.prepare("SELECT COUNT(*) AS count FROM ipam_ip_ranges WHERE subnet_id = ?").get(subnet.id)?.count || 0),
  };
  const transaction = db.db.transaction(() => {
    db.db.prepare("DELETE FROM ipam_sync_conflicts WHERE subnet_id = ?").run(subnet.id);
    const hasProxmoxConflicts = db.db.prepare(`
      SELECT COUNT(*) AS count FROM sqlite_master
      WHERE type = 'table' AND name IN ('ipam_proxmox_sync_conflicts', 'tofu_proxmox_connections')
    `).get()?.count === 2;
    if (hasProxmoxConflicts)
      db.db.prepare("DELETE FROM ipam_proxmox_sync_conflicts WHERE subnet_id = ?").run(subnet.id);
    db.db.prepare("DELETE FROM ipam_reservations WHERE subnet_id = ?").run(subnet.id);
    db.db.prepare("DELETE FROM ipam_ip_ranges WHERE subnet_id = ?").run(subnet.id);
    db.db.prepare("DELETE FROM ipam_subnets WHERE id = ?").run(subnet.id);
    db.auditLog.write(
      "ipam.subnet_delete",
      `subnet=${subnet.cidr} reservations=${counts.reservations} ranges=${counts.ranges}`,
      req.ip,
      true,
      req.user?.username,
    );
  });
  try {
    transaction();
  } catch (error) {
    return res.status(409).json({
      error: error.message || "The prefix could not be deleted.",
    });
  }
  res.json({ success: true, deleted: counts });
});

// Keep bulk changes deliberately narrow: changing a prefix lifecycle state is
// reversible and does not alter its CIDR, reservations, or child prefixes.
router.patch("/subnets/:id/status", guard("canEditNetworks"), (req, res) => {
  const subnet = db.db
    .prepare("SELECT * FROM ipam_subnets WHERE id = ?")
    .get(req.params.id);
  if (!subnet)
    return res.status(404).json({ error: "Network not found." });
  if (!guardEnvironment(req, res, subnet.environment_id)) return;
  try {
    const status = validateChoice(req.body?.status, SUBNET_STATUSES);
    db.db.transaction(() => {
      db.db
        .prepare("UPDATE ipam_subnets SET status = ? WHERE id = ?")
        .run(status, subnet.id);
      db.auditLog.write(
        "ipam.subnet_status_update",
        `subnet=${subnet.cidr} status=${status}`,
        req.ip,
        true,
        req.user?.username,
      );
    })();
    res.json(
      db.db.prepare("SELECT * FROM ipam_subnets WHERE id = ?").get(subnet.id),
    );
  } catch (error) {
    res
      .status(400)
      .json({
        error: error.message || "The prefix status could not be changed.",
      });
  }
});


require("../features/ipam/reservation-routes")(router, { guard, guardEnvironment });
require("../features/ipam/source-routes")(router, { guard, guardEnvironment });
module.exports = router;
module.exports.syncIpamSource = syncIpamSource;
