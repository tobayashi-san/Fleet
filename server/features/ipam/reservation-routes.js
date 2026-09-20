const db = require("../../db");
const { can } = require("../../utils/permissions");

const {
  withProxmoxSourceNames,
  ipv4,
  parseCidr,
  toIpv4,
  isUsableAddress,
  rangesOverlap,
  pagination,
  paginated,
  validateChoice,
  getRanges,
  allocationKey,
  freeSpaceSegments,
  gatewayNumber,
  withEffectiveReservationStatus,
  systemGatewayAllocation,
  enrichSubnet,
  assignedServerError,
  overlapsDelegatedPrefix,
  overlapsEnvironmentAllocation,
  reservationSpaceError,
  parseMac,
  withReservationConflicts,
  ADDRESS_STATUSES,
  ADDRESS_ROLES,
} = require("./model");
module.exports = function registerReservationRoutes(router, { guard, guardEnvironment }) {
  router.get("/subnets/:id/reservations", guard("canViewNetworks"), (req, res) => {
    const subnet = db.db
      .prepare("SELECT environment_id FROM ipam_subnets WHERE id = ?")
      .get(req.params.id);
    if (!subnet)
      return res.status(404).json({ error: "Network not found." });
    if (!guardEnvironment(req, res, subnet.environment_id)) return;
    const rows = db.db
      .prepare(
        `
      SELECT reservation.*, server.name AS server_name, source.name AS source_name,
             device.name AS device_name
      FROM ipam_reservations reservation
      JOIN ipam_subnets subnet ON subnet.id = reservation.subnet_id
      LEFT JOIN servers server ON server.id = reservation.server_id AND server.environment_id = ?
      LEFT JOIN ipam_sync_sources source ON reservation.source_ref LIKE source.id || ':%'
      LEFT JOIN ipam_device_names device ON device.environment_id = subnet.environment_id AND device.mac_address = reservation.mac_address
      WHERE reservation.subnet_id = ?
    `,
      )
      .all(subnet.environment_id, req.params.id);
    const sourcedRows = withProxmoxSourceNames(rows);
    sourcedRows.sort(
      (left, right) => (ipv4(left.address) ?? 0) - (ipv4(right.address) ?? 0),
    );
    res.json(withReservationConflicts(sourcedRows, subnet.environment_id));
  });

  // Conflicts are intentionally exposed separately from the normal allocation
  // list.  An address remains usable and visible in its current source of truth;
  // this endpoint supplies the operator with the competing observation and its
  // origin, rather than encouraging an unsafe overwrite during a sync.
  router.get("/subnets/:id/conflicts", guard("canViewNetworks"), (req, res) => {
    const subnet = db.db
      .prepare("SELECT id, environment_id FROM ipam_subnets WHERE id = ?")
      .get(req.params.id);
    if (!subnet)
      return res.status(404).json({ error: "Network not found." });
    if (!guardEnvironment(req, res, subnet.environment_id)) return;
    const externalRows = db.db
      .prepare(
        `
      SELECT
        conflict.id, conflict.address, conflict.hostname, conflict.mac_address,
        conflict.reason, conflict.last_seen_at, 'external' AS source_kind,
        source.type AS source_type, COALESCE(source.name, 'External source') AS source_name,
        reservation.id AS existing_reservation_id, reservation.address AS existing_address,
        reservation.hostname AS existing_hostname, reservation.source_type AS existing_source_type,
        server.id AS existing_server_id, server.name AS existing_server_name
      FROM ipam_sync_conflicts conflict
      LEFT JOIN ipam_sync_sources source ON source.id = conflict.source_id
      LEFT JOIN ipam_reservations reservation ON reservation.id = conflict.existing_reservation_id
      LEFT JOIN servers server ON server.id = reservation.server_id AND server.environment_id = ?
      WHERE conflict.subnet_id = ?
    `,
      )
      .all(subnet.environment_id, subnet.id);
    // OpenTofu owns its connection table and can be disabled entirely. IPAM
    // remains available in installations without that plugin, so only query its
    // conflict inventory when the plugin schema has actually been installed.
    const hasProxmoxConnections = Boolean(
      db.db
        .prepare(
          "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'tofu_proxmox_connections'",
        )
        .get(),
    );
    const proxmoxRows = hasProxmoxConnections
      ? db.db
          .prepare(
            `
      SELECT
        conflict.id, conflict.address, conflict.hostname, conflict.mac_address,
        conflict.reason, conflict.last_seen_at, 'proxmox' AS source_kind,
        'proxmox' AS source_type, COALESCE(connection.name, 'Proxmox') AS source_name,
        reservation.id AS existing_reservation_id, reservation.address AS existing_address,
        reservation.hostname AS existing_hostname, reservation.source_type AS existing_source_type,
        server.id AS existing_server_id, server.name AS existing_server_name
      FROM ipam_proxmox_sync_conflicts conflict
      LEFT JOIN tofu_proxmox_connections connection ON connection.id = conflict.connection_id
      LEFT JOIN ipam_reservations reservation ON reservation.id = conflict.existing_reservation_id
      LEFT JOIN servers server ON server.id = reservation.server_id AND server.environment_id = ?
      WHERE conflict.subnet_id = ?
    `,
          )
          .all(subnet.environment_id, subnet.id)
      : [];
    const rows = [...externalRows, ...proxmoxRows];
    rows.sort(
      (left, right) => (ipv4(left.address) ?? 0) - (ipv4(right.address) ?? 0),
    );
    res.json(rows);
  });

  // The server detail is an operational view, while IPAM remains the source of
  // truth for address ownership. This narrow lookup lets the console show a
  // host's allocations without making the client scan every prefix.
  router.get("/reservations", guard("canViewNetworks"), (req, res) => {
    const serverId = String(req.query?.server_id || "").trim();
    if (!serverId)
      return res.status(400).json({ error: "server_id is required" });
    const server = db.db
      .prepare("SELECT environment_id FROM servers WHERE id = ?")
      .get(serverId);
    if (!server)
      return res.status(404).json({ error: "Host not found." });
    if (!guardEnvironment(req, res, server.environment_id)) return;
    const rows = db.db
      .prepare(
        `
      SELECT reservation.*, subnet.cidr AS subnet_cidr, subnet.name AS subnet_name,
             subnet.dhcp_start, subnet.dhcp_end, source.name AS source_name,
             device.name AS device_name
      FROM ipam_reservations reservation
      JOIN ipam_subnets subnet ON subnet.id = reservation.subnet_id
      LEFT JOIN ipam_sync_sources source ON reservation.source_ref LIKE source.id || ':%'
      LEFT JOIN ipam_device_names device ON device.environment_id = subnet.environment_id AND device.mac_address = reservation.mac_address
      WHERE reservation.server_id = ? AND subnet.environment_id = ?
      ORDER BY subnet.cidr, reservation.address
    `,
      )
      .all(serverId, server.environment_id);
    res.json(
      withProxmoxSourceNames(rows).map((row) =>
        withEffectiveReservationStatus(row, row),
      ),
    );
  });

  // A prefix is operated as one address space. Return single IP reservations and
  // larger reservations together so clients do not have to switch between two
  // unrelated lists just to understand what is already allocated.
  router.get("/subnets/:id/allocations", guard("canViewNetworks"), (req, res) => {
    const subnet = db.db
      .prepare("SELECT id, cidr, gateway, dhcp_start, dhcp_end, environment_id FROM ipam_subnets WHERE id = ?")
      .get(req.params.id);
    if (!subnet)
      return res.status(404).json({ error: "Network not found." });
    if (!guardEnvironment(req, res, subnet.environment_id)) return;
    const addresses = withReservationConflicts(
      withProxmoxSourceNames(db.db
        .prepare(
          `
      SELECT reservation.*, server.name AS server_name, source.name AS source_name,
             device.name AS device_name
      FROM ipam_reservations reservation
      JOIN ipam_subnets reservation_subnet ON reservation_subnet.id = reservation.subnet_id
      LEFT JOIN servers server ON server.id = reservation.server_id AND server.environment_id = ?
      LEFT JOIN ipam_sync_sources source ON reservation.source_ref LIKE source.id || ':%'
      LEFT JOIN ipam_device_names device ON device.environment_id = reservation_subnet.environment_id AND device.mac_address = reservation.mac_address
      WHERE reservation.subnet_id = ?
    `,
        )
        .all(subnet.environment_id, subnet.id)),
      subnet.environment_id,
    ).map((row) => ({
      ...withEffectiveReservationStatus(row, subnet),
      kind: "address",
      start_address: row.address,
      end_address: row.address,
      address_count: 1,
    }));
    const ranges = getRanges(subnet.id).map((row) => {
      const start = ipv4(row.start_address);
      const end = ipv4(row.end_address);
      return {
        ...row,
        kind: "range",
        address_count: start === null || end === null ? 0 : end - start + 1,
      };
    });
    const existingAllocations = [...addresses, ...ranges];
    const gatewayAllocation = systemGatewayAllocation(subnet, existingAllocations);
    const rows = gatewayAllocation
      ? [...existingAllocations, gatewayAllocation]
      : existingAllocations;
    rows.sort(
      (left, right) =>
        (ipv4(left.start_address) ?? 0) - (ipv4(right.start_address) ?? 0),
    );
    if (String(req.query.paginated || "") !== "1") return res.json(rows);
    const query = String(req.query.q || "").trim().toLowerCase();
    const status = String(req.query.status || "all").trim().toLowerCase();
    const filtered = rows.filter((row) => {
      const matchesQuery = !query || [
        row.start_address, row.end_address, row.hostname, row.device_name, row.server_name,
        row.description, row.role, row.source_type, row.source_name, row.mac_address,
        (row.source_observations || []).map((source) => `${source.type} ${source.name}`).join(" "),
      ].some((value) => String(value || "").toLowerCase().includes(query));
      return matchesQuery && (status === "all" || row.status === status);
    });
    const { page, pageSize } = pagination(req.query);
    const response = paginated(filtered, page, pageSize);
    const pageKeys = new Set(response.items.map(allocationKey));
    const lastAllocationKey = rows.length ? allocationKey(rows[rows.length - 1]) : null;
    response.free_segments = freeSpaceSegments(subnet, rows).filter((segment) =>
      segment.before_allocation_key
        ? pageKeys.has(segment.before_allocation_key)
        : rows.length === 0 || pageKeys.has(lastAllocationKey),
    );
    res.json(response);
  });

  router.get("/subnets/:id/children", guard("canViewNetworks"), (req, res) => {
    const subnet = db.db
      .prepare("SELECT * FROM ipam_subnets WHERE id = ?")
      .get(req.params.id);
    if (!subnet)
      return res.status(404).json({ error: "Network not found." });
    if (!guardEnvironment(req, res, subnet.environment_id)) return;
    const parsed = parseCidr(subnet.cidr);
    const all = db.db
      .prepare("SELECT * FROM ipam_subnets WHERE environment_id = ?")
      .all(subnet.environment_id);
    if (!parsed) return res.status(400).json({ error: "Invalid prefix." });
    res.json(
      all
        .filter(
          (candidate) => enrichSubnet(candidate, all).parent_id === subnet.id,
        )
        .map((child) => enrichSubnet(child, all)),
    );
  });

  router.get("/subnets/:id/ranges", guard("canViewNetworks"), (req, res) => {
    const subnet = db.db
      .prepare("SELECT environment_id FROM ipam_subnets WHERE id = ?")
      .get(req.params.id);
    if (!subnet)
      return res.status(404).json({ error: "Network not found." });
    if (!guardEnvironment(req, res, subnet.environment_id)) return;
    const rows = getRanges(req.params.id).sort(
      (left, right) =>
        (ipv4(left.start_address) ?? 0) - (ipv4(right.start_address) ?? 0),
    );
    res.json(rows);
  });

  // Non-destructive validation for immediate feedback in the reservation dialog.
  router.post("/subnets/:id/reservations/validate", guard("canViewNetworks"), (req, res) => {
    const subnet = db.db
      .prepare("SELECT * FROM ipam_subnets WHERE id = ?")
      .get(req.params.id);
    if (!subnet)
      return res.status(404).json({ error: "Network not found." });
    if (!guardEnvironment(req, res, subnet.environment_id)) return;
    const kind = String(req.body?.kind || "address");
    const start = ipv4(kind === "range" ? req.body?.start_address : req.body?.address);
    const end = ipv4(kind === "range" ? req.body?.end_address : req.body?.address);
    const error = reservationSpaceError(subnet, start, end);
    res.json({ valid: !error, message: error || "Address is available." });
  });

  router.post(
    "/subnets/:id/reservations",
    guard("canEditNetworks"),
    (req, res) => {
      const subnet = db.db
        .prepare("SELECT * FROM ipam_subnets WHERE id = ?")
        .get(req.params.id);
      const address = String(req.body?.address || "").trim();
      const parsed = subnet && parseCidr(subnet.cidr);
      if (!subnet || !parsed)
        return res.status(404).json({ error: "Subnet not found." });
      if (!guardEnvironment(req, res, subnet.environment_id)) return;
      const numeric = ipv4(address);
      if (numeric === null || !isUsableAddress(numeric, parsed))
        return res
          .status(400)
          .json({
            error: "The address is not a usable host address in this network.",
          });
      if (gatewayNumber(subnet) === numeric)
        return res.status(409).json({
          error: "The address is used as this prefix's gateway.",
        });
      if (overlapsDelegatedPrefix(subnet, numeric))
        return res.status(409).json({
          error: "The address belongs to a delegated child prefix.",
        });
      if (overlapsEnvironmentAllocation(subnet.environment_id, subnet.id, numeric))
        return res.status(409).json({
          error: "The address is already allocated in another prefix in this environment.",
        });
      if (String(req.body?.status || "").trim().toLowerCase() === "dhcp")
        return res.status(400).json({
          error: "DHCP is derived automatically from the prefix range.",
        });
      const id = db.uuidv4();
      try {
        const rangeOverlap = getRanges(subnet.id).some(
          (range) =>
            numeric >= ipv4(range.start_address) &&
            numeric <= ipv4(range.end_address),
        );
        if (rangeOverlap)
          return res
            .status(409)
            .json({
              error: "The address is already part of a reserved IP range.",
            });
        const status = validateChoice(
          req.body?.status,
          ADDRESS_STATUSES,
          "active",
        );
        const role = validateChoice(req.body?.role, ADDRESS_ROLES, "");
        const serverId = String(req.body?.server_id || "").trim() || null;
        const serverError = assignedServerError(subnet.environment_id, serverId);
        if (serverError) return res.status(400).json({ error: serverError });
        db.db.transaction(() => {
          db.db
            .prepare(
              "INSERT INTO ipam_reservations (id, subnet_id, address, hostname, server_id, mac_address, status, role, description, source_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            )
            .run(
              id,
              subnet.id,
              address,
              String(req.body?.hostname || "")
                .trim()
                .slice(0, 100),
              serverId,
              parseMac(req.body?.mac_address),
              status,
              role,
              String(req.body?.description || "")
                .trim()
                .slice(0, 500),
              "manual",
            );
          db.auditLog.write(
            "ipam.reservation_create",
            `subnet=${subnet.cidr} address=${address}`,
            req.ip,
            true,
            req.user?.username,
          );
        })();
        res
          .status(201)
          .json(
            withEffectiveReservationStatus(
              db.db.prepare("SELECT * FROM ipam_reservations WHERE id = ?").get(id),
              subnet,
            ),
          );
      } catch (error) {
        res
          .status(409)
          .json({ error: error.message || "The address is already reserved." });
      }
    },
  );

  router.put("/reservations/:id", guard("canEditNetworks"), (req, res) => {
    const reservation = db.db
      .prepare("SELECT * FROM ipam_reservations WHERE id = ?")
      .get(req.params.id);
    if (!reservation)
      return res.status(404).json({ error: "IP address not found." });
    if (reservation.source_type && reservation.source_type !== "manual")
      return res.status(409).json({
        error: "Synchronized addresses are managed in their source.",
      });
    const subnet = db.db
      .prepare("SELECT * FROM ipam_subnets WHERE id = ?")
      .get(reservation.subnet_id);
    const parsed = subnet && parseCidr(subnet.cidr);
    if (!subnet || !parsed)
      return res.status(404).json({ error: "Prefix not found." });
    if (!guardEnvironment(req, res, subnet.environment_id)) return;
    try {
      const address = String(req.body?.address || reservation.address).trim();
      const numeric = ipv4(address);
      if (numeric === null || !isUsableAddress(numeric, parsed))
        return res
          .status(400)
          .json({
            error: "The address is not a usable host address in this prefix.",
          });
      if (gatewayNumber(subnet) === numeric)
        return res.status(409).json({
          error: "The address is used as this prefix's gateway.",
        });
      if (overlapsDelegatedPrefix(subnet, numeric))
        return res.status(409).json({
          error: "The address belongs to a delegated child prefix.",
        });
      if (
        overlapsEnvironmentAllocation(
          subnet.environment_id,
          subnet.id,
          numeric,
          reservation.id,
        )
      )
        return res.status(409).json({
          error: "The address is already allocated in another prefix in this environment.",
        });
      if (String(req.body?.status || "").trim().toLowerCase() === "dhcp")
        return res.status(400).json({
          error: "DHCP is derived automatically from the prefix range.",
        });
      if (
        getRanges(subnet.id).some(
          (range) =>
            numeric >= ipv4(range.start_address) &&
            numeric <= ipv4(range.end_address),
        )
      )
        return res
          .status(409)
          .json({ error: "The address is part of a reserved IP range." });
      const status = validateChoice(
        req.body?.status,
        ADDRESS_STATUSES,
        reservation.status || "active",
      );
      const role = validateChoice(
        req.body?.role,
        ADDRESS_ROLES,
        reservation.role || "",
      );
      const serverId = String(req.body?.server_id || "").trim() || null;
      const serverError = assignedServerError(subnet.environment_id, serverId);
      if (serverError) return res.status(400).json({ error: serverError });
      db.db.transaction(() => {
        db.db
          .prepare(
            "UPDATE ipam_reservations SET address = ?, hostname = ?, server_id = ?, mac_address = ?, status = ?, role = ?, description = ? WHERE id = ?",
          )
          .run(
            address,
            String(req.body?.hostname || "")
              .trim()
              .slice(0, 100),
            serverId,
            parseMac(req.body?.mac_address),
            status,
            role,
            String(req.body?.description || "")
              .trim()
              .slice(0, 500),
            reservation.id,
          );
        db.auditLog.write(
          "ipam.reservation_update",
          `subnet=${subnet.cidr} address=${address}`,
          req.ip,
          true,
          req.user?.username,
        );
      })();
      res.json(
        withEffectiveReservationStatus(
          db.db
            .prepare("SELECT * FROM ipam_reservations WHERE id = ?")
            .get(reservation.id),
          subnet,
        ),
      );
    } catch (error) {
      res
        .status(400)
        .json({
          error: error.message || "The IP address could not be saved.",
        });
    }
  });

  // A friendly device name is intentionally edited independently from an
  // imported reservation. Its key is the normalized MAC address, so DHCP lease
  // changes and source-driven reservation moves cannot detach the name.
  router.patch("/reservations/:id/device-name", guard("canEditNetworks"), (req, res) => {
    const reservation = db.db
      .prepare(`
        SELECT reservation.id, reservation.address, reservation.mac_address,
               subnet.environment_id, subnet.cidr
        FROM ipam_reservations reservation
        JOIN ipam_subnets subnet ON subnet.id = reservation.subnet_id
        WHERE reservation.id = ?
      `)
      .get(req.params.id);
    if (!reservation)
      return res.status(404).json({ error: "IP address not found." });
    if (!guardEnvironment(req, res, reservation.environment_id)) return;

    try {
      const macAddress = parseMac(reservation.mac_address);
      const name = String(req.body?.name || "").trim().slice(0, 100);
      db.db.transaction(() => {
        if (name) {
          db.db.prepare(`
            INSERT INTO ipam_device_names (environment_id, mac_address, name)
            VALUES (?, ?, ?)
            ON CONFLICT(environment_id, mac_address) DO UPDATE SET
              name = excluded.name, updated_at = datetime('now')
          `).run(reservation.environment_id, macAddress, name);
        } else {
          db.db.prepare(
            "DELETE FROM ipam_device_names WHERE environment_id = ? AND mac_address = ?",
          ).run(reservation.environment_id, macAddress);
        }
        db.auditLog.write(
          "ipam.device_name_update",
          `subnet=${reservation.cidr} address=${reservation.address} mac=${macAddress} name=${name || "removed"}`,
          req.ip,
          true,
          req.user?.username,
        );
      })();
      res.json({ mac_address: macAddress, device_name: name });
    } catch (error) {
      res.status(400).json({
        error: error.message || "The device name could not be saved.",
      });
    }
  });

  router.post(
    "/subnets/:id/reservations/range",
    guard("canEditNetworks"),
    (req, res) => {
      const subnet = db.db
        .prepare("SELECT * FROM ipam_subnets WHERE id = ?")
        .get(req.params.id);
      const parsed = subnet && parseCidr(subnet.cidr);
      const start = ipv4(req.body?.start_address);
      const end = ipv4(req.body?.end_address);
      if (!subnet || !parsed)
        return res.status(404).json({ error: "Network not found." });
      if (!guardEnvironment(req, res, subnet.environment_id)) return;
      if (
        start === null ||
        end === null ||
        start > end ||
        !isUsableAddress(start, parsed) ||
        !isUsableAddress(end, parsed)
      )
        return res
          .status(400)
          .json({
            error:
              "The range must contain usable addresses from this network.",
          });
      const count = end - start + 1;
      const gateway = gatewayNumber(subnet);
      if (gateway !== null && gateway >= start && gateway <= end)
        return res.status(409).json({
          error: "The range contains the configured gateway.",
        });
      if (overlapsDelegatedPrefix(subnet, start, end))
        return res.status(409).json({
          error: "The range overlaps a delegated child prefix.",
        });
      if (overlapsEnvironmentAllocation(subnet.environment_id, subnet.id, start, end))
        return res.status(409).json({
          error: "The range overlaps an allocation in another prefix in this environment.",
        });
      try {
        const reservedAddress = db.db
          .prepare("SELECT address FROM ipam_reservations WHERE subnet_id = ?")
          .all(subnet.id)
          .map((row) => ipv4(row.address));
        const overlap =
          reservedAddress.some(
            (value) => value !== null && value >= start && value <= end,
          ) ||
          getRanges(subnet.id).some((range) => {
            const rangeStart = ipv4(range.start_address);
            const rangeEnd = ipv4(range.end_address);
            return (
              rangeStart !== null &&
              rangeEnd !== null &&
              rangesOverlap(
                { first: start, last: end },
                { first: rangeStart, last: rangeEnd },
              )
            );
          });
        if (overlap)
          return res
            .status(409)
            .json({
              error:
                "At least one address in this range is already reserved.",
            });
        const status = validateChoice(
          req.body?.status,
          ADDRESS_STATUSES,
          "reserved",
        );
        const role = validateChoice(req.body?.role, ADDRESS_ROLES, "");
        db.db.transaction(() => {
          db.db
            .prepare(
              "INSERT INTO ipam_ip_ranges (id, subnet_id, start_address, end_address, status, role, description) VALUES (?, ?, ?, ?, ?, ?, ?)",
            )
            .run(
              db.uuidv4(),
              subnet.id,
              toIpv4(start),
              toIpv4(end),
              status,
              role,
              String(req.body?.description || "")
                .trim()
                .slice(0, 500),
            );
          db.auditLog.write(
            "ipam.reservation_range_create",
            `subnet=${subnet.cidr} start=${toIpv4(start)} end=${toIpv4(end)}`,
            req.ip,
            true,
            req.user?.username,
          );
        })();
        res.status(201).json({ success: true, count });
      } catch (error) {
        res
          .status(409)
          .json({
            error: "At least one address in this range is already reserved.",
          });
      }
    },
  );

  router.delete("/reservations/:id", guard("canEditNetworks"), (req, res) => {
    const reservation = db.db
      .prepare(
        `SELECT reservation.id, reservation.address, reservation.hostname, reservation.source_type, subnet.environment_id, subnet.cidr FROM ipam_reservations reservation JOIN ipam_subnets subnet ON subnet.id = reservation.subnet_id WHERE reservation.id = ?`,
      )
      .get(req.params.id);
    if (!reservation)
      return res.status(404).json({ error: "Reservation not found." });
    if (!guardEnvironment(req, res, reservation.environment_id)) return;
    if (reservation.source_type && reservation.source_type !== "manual")
      return res.status(409).json({
        error: "Synchronized addresses can only be removed through their source.",
      });
    const result = db.db.transaction(() => {
      const result = db.db
        .prepare("DELETE FROM ipam_reservations WHERE id = ?")
        .run(req.params.id);
      if (result.changes) db.auditLog.write(
        "ipam.reservation_delete",
        `subnet=${reservation.cidr} address=${reservation.address} source=${reservation.source_type || "manual"} hostname=${reservation.hostname || "-"}`,
        req.ip,
        true,
        req.user?.username,
      );
      return result;
    })();
    if (!result.changes)
      return res.status(404).json({ error: "Reservation not found." });
    res.json({ success: true });
  });

  router.delete("/ranges/:id", guard("canEditNetworks"), (req, res) => {
    const range = db.db
      .prepare(
        `SELECT range.id, range.start_address, range.end_address, range.description, subnet.environment_id, subnet.cidr FROM ipam_ip_ranges range JOIN ipam_subnets subnet ON subnet.id = range.subnet_id WHERE range.id = ?`,
      )
      .get(req.params.id);
    if (!range)
      return res.status(404).json({ error: "IP range not found." });
    if (!guardEnvironment(req, res, range.environment_id)) return;
    const result = db.db.transaction(() => {
      const result = db.db
        .prepare("DELETE FROM ipam_ip_ranges WHERE id = ?")
        .run(req.params.id);
      if (result.changes) db.auditLog.write(
        "ipam.reservation_range_delete",
        `subnet=${range.cidr} start=${range.start_address} end=${range.end_address} description=${range.description || "-"}`,
        req.ip,
        true,
        req.user?.username,
      );
      return result;
    })();
    if (!result.changes)
      return res.status(404).json({ error: "IP range not found." });
    res.json({ success: true });
  });

  // External sources are observed inventories. Their source stays authoritative
  // for DHCP state; Shipyard only mirrors it into matching, existing prefixes.

};
