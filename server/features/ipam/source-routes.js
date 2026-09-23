const db = require("../../db");
const { can } = require("../../utils/permissions");
const { encrypt, decrypt } = require("../../utils/crypto");
const { findSubnetForAddress } = require("./model");
const {
  validEndpoint,
  sourceSummary,
  syncIntervalMinutes,
  sourceRequest,
  sourceRecords,
  reconcileSourceReservation,
  assertCurrentSourceConfiguration,
  syncIpamSource,
  SOURCE_TYPES,
} = require("./source-sync");
module.exports = function registerSourceRoutes(router, { guard, guardEnvironment }) {
  router.get("/sources", guard("canViewNetworks"), (req, res) => {
    const environmentId =
      req.environmentId || String(req.query.environment_id || "default").trim() || "default";
    if (!guardEnvironment(req, res, environmentId)) return;
    const rows = db.db
      .prepare(
        "SELECT * FROM ipam_sync_sources WHERE environment_id = ? ORDER BY name COLLATE NOCASE",
      )
      .all(environmentId);
    res.json(rows.map(sourceSummary));
  });

  router.post("/sources", guard("canEditNetworks"), (req, res) => {
    try {
      const body = req.body || {};
      const environmentId =
        String(body.environment_id || "default").trim() || "default";
      if (!guardEnvironment(req, res, environmentId)) return;
      const type = String(body.type || "")
        .trim()
        .toLowerCase();
      const name = String(body.name || "")
        .trim()
        .slice(0, 100);
      const endpoint = validEndpoint(body.endpoint);
      const token = String(body.api_token || "").trim();
      if (!SOURCE_TYPES.has(type))
        throw new Error(
          "The currently supported source types are UniFi and pfSense.",
        );
      if (!name || !endpoint)
        throw new Error("A name and valid HTTP or HTTPS URL are required.");
      if (!token)
        throw new Error("An API token is required for this source.");
      if (
        !db.db
          .prepare("SELECT 1 FROM environments WHERE id = ?")
          .get(environmentId)
      )
        throw new Error("Environment not found.");
      const id = db.uuidv4();
      const defaultPath =
        type === "unifi"
          ? `/proxy/network/api/s/${encodeURIComponent(String(body.site || "default").trim() || "default")}/stat/sta`
          : "/api/v2/status/dhcp_server/leases";
      const path = String(body.path || defaultPath).trim();
      if (!path.startsWith("/"))
        throw new Error("The API path must start with /.");
      const encryptedToken = encrypt(token);
      if (encryptedToken === token)
        throw new Error(
          "FLEET_KEY_SECRET is required to store source tokens securely.",
        );
      const source = db.db.transaction(() => {
        db.db
          .prepare(
            `INSERT INTO ipam_sync_sources (id, environment_id, type, name, endpoint, api_token, site, path, insecure, enabled, auto_sync, sync_interval_min)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            id,
            environmentId,
            type,
            name,
            endpoint.toString().replace(/\/$/, ""),
            encryptedToken,
            String(body.site || "default")
              .trim()
              .slice(0, 80),
            path.slice(0, 300),
            body.insecure === true ? 1 : 0,
            body.enabled === false ? 0 : 1,
            body.auto_sync === false ? 0 : 1,
            syncIntervalMinutes(body.sync_interval_min),
          );
        const source = db.db
          .prepare("SELECT * FROM ipam_sync_sources WHERE id = ?")
          .get(id);
        db.auditLog.write(
          "ipam.source_create",
          `source=${name} type=${type}`,
          req.ip,
          true,
          req.user?.username,
        );
        return source;
      })();
      res.status(201).json(sourceSummary(source));
    } catch (error) {
      res
        .status(400)
        .json({ error: error.message || "The source could not be created." });
    }
  });

  router.put("/sources/:id", guard("canEditNetworks"), (req, res) => {
    try {
      const source = db.db
        .prepare("SELECT * FROM ipam_sync_sources WHERE id = ?")
        .get(req.params.id);
      if (!source)
        return res.status(404).json({ error: "Source not found." });
      if (!guardEnvironment(req, res, source.environment_id)) return;
      const body = req.body || {};
      const type = String(body.type || source.type)
        .trim()
        .toLowerCase();
      const name = String(body.name || source.name)
        .trim()
        .slice(0, 100);
      const endpoint = validEndpoint(body.endpoint || source.endpoint);
      const path = String(body.path ?? source.path).trim();
      if (!SOURCE_TYPES.has(type) || !name || !endpoint || !path.startsWith("/"))
        throw new Error("The source contains invalid values.");
      const nextToken =
        typeof body.api_token === "string" && body.api_token.trim()
          ? encrypt(body.api_token.trim())
          : source.api_token;
      if (
        typeof body.api_token === "string" &&
        body.api_token.trim() &&
        nextToken === body.api_token.trim()
      )
        throw new Error(
          "FLEET_KEY_SECRET is required to store source tokens securely.",
        );
      const updated = db.db.transaction(() => {
        db.db
          .prepare(
            `UPDATE ipam_sync_sources SET type = ?, name = ?, endpoint = ?, api_token = ?, site = ?, path = ?, insecure = ?, enabled = ?, auto_sync = ?, sync_interval_min = ?, updated_at = datetime('now') WHERE id = ?`,
          )
          .run(
            type,
            name,
            endpoint.toString().replace(/\/$/, ""),
            nextToken,
            String(body.site ?? source.site)
              .trim()
              .slice(0, 80),
            path.slice(0, 300),
            body.insecure === undefined ? source.insecure : body.insecure ? 1 : 0,
            body.enabled === undefined ? source.enabled : body.enabled ? 1 : 0,
            body.auto_sync === undefined
              ? (source.auto_sync ?? 1)
              : body.auto_sync
                ? 1
                : 0,
            syncIntervalMinutes(
              body.sync_interval_min,
              syncIntervalMinutes(source.sync_interval_min),
            ),
            source.id,
          );
        const updated = db.db
          .prepare("SELECT * FROM ipam_sync_sources WHERE id = ?")
          .get(source.id);
        db.auditLog.write(
          "ipam.source_update",
          `source=${source.name}`,
          req.ip,
          true,
          req.user?.username,
        );
        return updated;
      })();
      res.json(sourceSummary(updated));
    } catch (error) {
      res
        .status(400)
        .json({
          error: error.message || "The source could not be updated.",
        });
    }
  });

  router.delete("/sources/:id", guard("canEditNetworks"), (req, res) => {
    const source = db.db
      .prepare("SELECT * FROM ipam_sync_sources WHERE id = ?")
      .get(req.params.id);
    if (!source) return res.status(404).json({ error: "Source not found." });
    if (!guardEnvironment(req, res, source.environment_id)) return;
    const remove = db.db.transaction(() => {
      const affected = db.db
        .prepare(
          `SELECT DISTINCT reservation_id FROM ipam_source_observations
           WHERE source_id = ? AND reservation_id IS NOT NULL
           UNION SELECT id AS reservation_id FROM ipam_reservations WHERE source_ref LIKE ?`,
        )
        .all(source.id, `${source.id}:%`)
        .map((row) => row.reservation_id);
      db.db.prepare("DELETE FROM ipam_source_observations WHERE source_id = ?").run(source.id);
      let reservations = 0;
      for (const reservationId of affected)
        reservations += reconcileSourceReservation(reservationId, source.id);
      db.db.prepare("DELETE FROM ipam_sync_sources WHERE id = ?").run(source.id);
      db.auditLog.write(
        "ipam.source_delete",
        `source=${source.name} reservations=${reservations}`,
        req.ip,
        true,
        req.user?.username,
      );
      return reservations;
    });
    const reservations = remove();
    res.json({ deleted: true, reservations_removed: reservations });
  });

  // Validate a controller without changing IPAM state.  This is deliberately
  // separate from sync: operators can verify endpoint, TLS, token and payload
  // mapping before Fleet creates, updates or releases any lease records.
  router.post("/sources/:id/test", guard("canEditNetworks"), async (req, res) => {
    const source = db.db
      .prepare("SELECT * FROM ipam_sync_sources WHERE id = ?")
      .get(req.params.id);
    if (!source) return res.status(404).json({ error: "Source not found." });
    if (!guardEnvironment(req, res, source.environment_id)) return;
    if (!source.enabled)
      return res.status(409).json({ error: "This source is disabled." });
    const token = decrypt(String(source.api_token || ""));
    if (!token)
      return res
        .status(409)
        .json({
          error:
            "This source token cannot be decrypted. Save the token again.",
        });
    try {
      const payload = await sourceRequest(
        source.type,
        source.endpoint,
        source.path,
        token,
        Boolean(source.insecure),
      );
      assertCurrentSourceConfiguration(source, "connection test");
      const records = sourceRecords(source.type, payload);
      const matching = records.filter((record) =>
        Boolean(findSubnetForAddress(source.environment_id, record.address)),
      );
      const testedAt = new Date().toISOString();
      db.db.transaction(() => {
        db.db
          .prepare(
            `UPDATE ipam_sync_sources SET
              last_tested_at = ?, last_test_status = 'success', last_test_error = '',
              last_record_count = ?, last_ignored_count = ?, updated_at = datetime('now')
             WHERE id = ?`,
          )
          .run(testedAt, records.length, records.length - matching.length, source.id);
        db.auditLog.write(
          "ipam.source_test",
          `source=${source.name} records=${records.length} matching=${matching.length}`,
          req.ip,
          true,
          req.user?.username,
        );
      })();
      res.json({
        reachable: true,
        tested_at: testedAt,
        records: records.length,
        matching_prefixes: matching.length,
        outside_prefixes: records.length - matching.length,
        samples: records
          .slice(0, 3)
          .map((record) => ({
            address: record.address,
            hostname: record.hostname || null,
            mac_address: record.mac || null,
          })),
      });
    } catch (error) {
      try { assertCurrentSourceConfiguration(source, "connection test"); }
      catch (changed) { return res.status(409).json({ error: changed.message }); }
      try {
        db.db.transaction(() => {
          db.db
            .prepare(
              `UPDATE ipam_sync_sources SET last_tested_at = ?, last_test_status = 'failed', last_test_error = ?, updated_at = datetime('now') WHERE id = ?`,
            )
            .run(
              new Date().toISOString(),
              String(error.message || "Connection test failed.").slice(
                0,
                500,
              ),
              source.id,
            );
          db.auditLog.write(
            "ipam.source_test",
            `source=${source.name} failed`,
            req.ip,
            false,
            req.user?.username,
          );
        })();
      } catch {
        return res.status(500).json({ error: "The connection test result could not be recorded. Retry after resolving the server storage error." });
      }
      res
        .status(502)
        .json({ error: error.message || "Connection test failed." });
    }
  });

  router.post("/sources/:id/sync", guard("canEditNetworks"), async (req, res) => {
    const source = db.db
      .prepare("SELECT * FROM ipam_sync_sources WHERE id = ?")
      .get(req.params.id);
    if (!source) return res.status(404).json({ error: "Source not found." });
    if (!guardEnvironment(req, res, source.environment_id)) return;
    try {
      res.json(
        await syncIpamSource(source, { ip: req.ip, actor: req.user?.username }),
      );
    } catch (error) {
      const message = error.message || "Synchronization failed.";
      const status = error.code === "IPAM_SOURCE_CHANGED" ? 409 : /not found/i.test(message)
        ? 404
        : /deaktiviert|entschl/.test(message)
          ? 409
          : /bereits synchronisiert/.test(message)
            ? 429
            : 502;
      res.status(status).json({ error: message });
    }
  });


};
