const http = require("http");
const https = require("https");
const db = require("../../db");
const { decrypt } = require("../../utils/crypto");
const SOURCE_TYPES = new Set(["unifi", "pfsense"]);
const syncingSources = new Set();
const {
  findSubnetForAddress,
  ipv4,
  gatewayNumber,
  canonicalMac,
  sameMachine,
  canEnrichAutomatedMachine,
} = require("./model");
function validEndpoint(value) {
  try {
    const url = new URL(String(value || "").trim());
    return ["http:", "https:"].includes(url.protocol) ? url : null;
  } catch {
    return null;
  }
}
function publicSource(row) {
  return {
    ...row,
    api_token: undefined,
    api_token_configured: Boolean(String(row.api_token || "").trim()),
    insecure: Boolean(row.insecure),
    enabled: Boolean(row.enabled),
    auto_sync: row.auto_sync === undefined ? true : Boolean(row.auto_sync),
    sync_interval_min: syncIntervalMinutes(row.sync_interval_min),
  };
}
// A source is an operational inventory, not merely a saved URL. Expose a
// small, credential-free health summary so the console can answer the three
// questions an operator actually has: did it run, how much did it contribute,
// and does it currently disagree with Shipyard's source of truth?
function sourceSummary(row) {
  const source = publicSource(row);
  const inventory = db.db
    .prepare(
      `
    SELECT COUNT(*) AS count
    FROM ipam_source_observations
    WHERE source_id = ?
  `,
    )
    .get(row.id);
  const conflicts = db.db
    .prepare(
      `
    SELECT COUNT(*) AS count
    FROM ipam_sync_conflicts
    WHERE source_id = ?
  `,
    )
    .get(row.id);
  return {
    ...source,
    inventory_count: Number(inventory?.count || 0),
    record_count: Number(source.last_record_count || 0),
    ignored_count: Number(source.last_ignored_count || 0),
    conflict_count: Number(conflicts?.count || 0),
  };
}

function syncIntervalMinutes(value, fallback = 15) {
  const interval = Number.parseInt(String(value ?? fallback), 10);
  return Number.isFinite(interval)
    ? Math.min(1440, Math.max(5, interval))
    : fallback;
}
function sourceRequest(type, endpoint, path, token, insecure) {
  const base = validEndpoint(endpoint);
  if (!base) return Promise.reject(new Error("Invalid source URL."));
  const url = new URL(path || "/", base);
  if (url.origin !== base.origin)
    return Promise.reject(
      new Error("The API path cannot leave the configured source."),
    );
  const client = url.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    const req = client.request(
      url,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...(token
            ? type === "pfsense"
              ? { "X-API-Key": token }
              // UniFi deployments differ between integration API keys and
              // legacy controller tokens, so retain both read-only headers.
              : { Authorization: `Bearer ${token}`, "X-API-Key": token }
            : {}),
        },
        ...(url.protocol === "https:" && insecure
          ? { rejectUnauthorized: false }
          : {}),
        timeout: 15000,
      },
      (response) => {
        let data = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          data += chunk;
          if (data.length > 2_000_000)
            req.destroy(new Error("The source response is too large."));
        });
        response.on("end", () => {
          if (response.statusCode < 200 || response.statusCode >= 300)
            return reject(
              new Error(`The source responded with HTTP ${response.statusCode}.`),
            );
          try {
            resolve(JSON.parse(data || "[]"));
          } catch {
            reject(
              new Error("The source did not return valid JSON."),
            );
          }
        });
      },
    );
    req.on("timeout", () =>
      req.destroy(new Error("Timed out while fetching the source.")),
    );
    req.on("error", reject);
    req.end();
  });
}
function sourceList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  throw new Error(
    "The source did not return a supported list format. Expected an array or data/items/results.",
  );
}
function sourceRecords(type, payload) {
  const sourceItems = sourceList(payload);
  const records = sourceItems
    .map((item, index) => {
      // UniFi's client endpoint returns an active DHCP address as `last_ip`
      // (rather than `ip`) for many wired clients.  Keep that field alongside
      // the generic controller variants so a valid lease is never silently
      // omitted from the IPAM inventory.
      const address = String(
        item.ip ||
          item.ip_address ||
          item.address ||
          item.ipaddr ||
          item.last_ip ||
          item["ip-address"] ||
          "",
      )
        .trim()
        .split("/")[0];
      const mac = canonicalMac(
        item.mac ||
          item.mac_address ||
          item.macaddr ||
          item["mac-address"] ||
          "",
      );
      const hostname = String(
        item.hostname || item.name || item.host || item.client_hostname || "",
      ).trim();
      const description = String(
        item.descr || item.description || item.comment || item.note || "",
      ).trim();
      const ref = String(
        item._id ||
          item.id ||
          item.uuid ||
          item.mac ||
          `${type}-${index}-${address}`,
      ).trim();
      return { address, mac, hostname, description, ref };
    })
    .filter((record) => ipv4(record.address) !== null);
  // An empty array is a valid observation: there may currently be no DHCP
  // leases. A non-empty response without even one usable IPv4 address is not.
  // Treating it as empty would delete the source's prior inventory on sync.
  if (sourceItems.length > 0 && records.length === 0) {
    throw new Error(
      "The source returned entries but no readable IPv4 addresses. Existing lease data was left unchanged.",
    );
  }
  return records;
}
function upsertSourceObservation(source, subnet, sourceRef, record, reservationId, now) {
  db.db
    .prepare(
      `INSERT INTO ipam_source_observations (
        id, environment_id, subnet_id, source_id, source_ref, reservation_id,
        address, hostname, mac_address, last_seen_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(source_id, source_ref) DO UPDATE SET
        environment_id = excluded.environment_id,
        subnet_id = excluded.subnet_id,
        reservation_id = excluded.reservation_id,
        address = excluded.address,
        hostname = excluded.hostname,
        mac_address = excluded.mac_address,
        last_seen_at = excluded.last_seen_at`,
    )
    .run(
      db.uuidv4(),
      source.environment_id,
      subnet.id,
      source.id,
      sourceRef,
      reservationId || null,
      record.address,
      record.hostname.slice(0, 100),
      canonicalMac(record.mac),
      now,
    );
}

// If the source that originally created a canonical reservation disappears,
// hand ownership to another observation of the same machine. Delete the
// reservation only when no source still reports it.
function reconcileSourceReservation(reservationId, sourceId) {
  const reservation = db.db
    .prepare("SELECT id, source_ref FROM ipam_reservations WHERE id = ?")
    .get(reservationId);
  if (!reservation || !String(reservation.source_ref || "").startsWith(`${sourceId}:`))
    return 0;
  const replacement = db.db
    .prepare(
      `SELECT observation.source_ref, observation.last_seen_at, source.type
       FROM ipam_source_observations observation
       JOIN ipam_sync_sources source ON source.id = observation.source_id
       WHERE observation.reservation_id = ?
       ORDER BY observation.last_seen_at DESC LIMIT 1`,
    )
    .get(reservationId);
  if (replacement) {
    db.db
      .prepare(
        "UPDATE ipam_reservations SET source_type = ?, source_ref = ?, last_synced_at = ? WHERE id = ?",
      )
      .run(replacement.type, replacement.source_ref, replacement.last_seen_at, reservationId);
    return 0;
  }
  return db.db.prepare("DELETE FROM ipam_reservations WHERE id = ?").run(reservationId).changes;
}

function assertCurrentSourceConfiguration(source, operation = "synchronization") {
  const current = db.db.prepare("SELECT * FROM ipam_sync_sources WHERE id = ?").get(source.id);
  const fields = ["environment_id", "type", "name", "endpoint", "api_token", "site", "path", "insecure", "enabled", "auto_sync", "sync_interval_min"];
  if (!current || fields.some(field => current[field] !== source[field])) {
    const error = new Error(`The source changed or was removed during ${operation}. Review its current configuration before retrying.`);
    error.code = "IPAM_SOURCE_CHANGED";
    throw error;
  }
}

async function syncIpamSource(source, { ip, actor } = {}) {
  if (!source?.id) throw new Error("Source not found.");
  if (!source.enabled) throw new Error("This source is disabled.");
  if (syncingSources.has(source.id))
    throw new Error("This source is already being synchronized.");
  const token = decrypt(String(source.api_token || ""));
  if (!token)
    throw new Error(
      "This source token cannot be decrypted. Save the token again.",
    );
  syncingSources.add(source.id);
  try {
    const payload = await sourceRequest(
      source.type,
      source.endpoint,
      source.path,
      token,
      Boolean(source.insecure),
    );
    assertCurrentSourceConfiguration(source);
    const records = sourceRecords(source.type, payload);
    let created = 0;
    let updated = 0;
    let removed = 0;
    let ignored = 0;
    let conflicts = 0;
    const now = new Date().toISOString();
    const transaction = db.db.transaction(() => {
      // A sync is a complete fresh observation. Stale conflicts disappear as
      // soon as the external controller no longer reports them.
      db.db
        .prepare("DELETE FROM ipam_sync_conflicts WHERE source_id = ?")
        .run(source.id);
      const seenSourceRefs = new Set();
      for (const record of records) {
        const subnet = findSubnetForAddress(
          source.environment_id,
          record.address,
        );
        if (!subnet) {
          ignored += 1;
          continue;
        }
        const sourceRef = `${source.id}:${record.ref}`;
        seenSourceRefs.add(sourceRef);
        const priorObservation = db.db
          .prepare(
            `SELECT reservation_id, subnet_id, address
             FROM ipam_source_observations
             WHERE source_id = ? AND source_ref = ?`,
          )
          .get(source.id, sourceRef);
        const priorReservation = priorObservation?.reservation_id
          ? db.db
              .prepare("SELECT * FROM ipam_reservations WHERE id = ?")
              .get(priorObservation.reservation_id)
          : null;
        const observationMoved = Boolean(
          priorObservation &&
            (String(priorObservation.subnet_id) !== String(subnet.id) ||
              String(priorObservation.address) !== String(record.address)),
        );
        const reconcilePriorReservation = (nextReservationId = null) => {
          const priorReservationId = priorObservation?.reservation_id;
          if (
            priorReservationId &&
            String(priorReservationId) !== String(nextReservationId || "")
          )
            removed += reconcileSourceReservation(priorReservationId, source.id);
        };
        if (gatewayNumber(subnet) === ipv4(record.address)) {
          // A controller reporting the configured gateway confirms the
          // protected system allocation; it does not compete with it. Keep
          // the observation as provenance so the UI can show the gateway's
          // hostname, MAC and source without creating a normal reservation.
          upsertSourceObservation(source, subnet, sourceRef, record, null, now);
          reconcilePriorReservation();
          updated += 1;
          continue;
        }
        // Keep an owned canonical reservation when the source reports that
        // same object at a new address: it can be moved in place below. A
        // shared reservation owned by another source must instead be detached,
        // otherwise the new observation would remain linked to the old IP.
        const existing = priorReservation &&
          (!observationMoved || String(priorReservation.source_ref || "").startsWith(`${source.id}:`))
          ? priorReservation
          : db.db
              .prepare("SELECT * FROM ipam_reservations WHERE source_type = ? AND source_ref = ?")
              .get(source.type, sourceRef);
        const collision = db.db
          .prepare(
            "SELECT id, hostname, mac_address, source_type FROM ipam_reservations WHERE subnet_id = ? AND address = ? AND id != ?",
          )
          .get(subnet.id, record.address, existing?.id || "");
        if (collision) {
          if (
            sameMachine(record, collision) ||
            canEnrichAutomatedMachine(record, collision)
          ) {
            upsertSourceObservation(source, subnet, sourceRef, record, collision.id, now);
            reconcilePriorReservation(collision.id);
            db.db
              .prepare(
                `UPDATE ipam_reservations SET
                  hostname = CASE WHEN hostname = '' THEN ? ELSE hostname END,
                  mac_address = CASE WHEN mac_address = '' THEN ? ELSE mac_address END,
                  last_synced_at = ? WHERE id = ?`,
              )
              .run(
                record.hostname.slice(0, 100),
                canonicalMac(record.mac),
                now,
                collision.id,
              );
            updated += 1;
            continue;
          }
          db.db
            .prepare(
              `INSERT INTO ipam_sync_conflicts (id, environment_id, subnet_id, source_id, address, hostname, mac_address, reason, existing_reservation_id, last_seen_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            )
            .run(
              db.uuidv4(),
              source.environment_id,
              subnet.id,
              source.id,
              record.address,
              record.hostname.slice(0, 100),
              canonicalMac(record.mac),
              `The address is already reserved ${collision.source_type === "manual" ? "manually" : "by another source"}${collision.hostname ? ` (${collision.hostname})` : ""}`,
              collision.id,
              now,
            );
          upsertSourceObservation(source, subnet, sourceRef, record, null, now);
          reconcilePriorReservation();
          conflicts += 1;
          continue;
        }
        if (existing) {
          const ownedBySource = String(existing.source_ref || "").startsWith(`${source.id}:`);
          if (ownedBySource)
            db.db
              .prepare(
                `UPDATE ipam_reservations SET subnet_id = ?, address = ?, hostname = ?, mac_address = ?, status = 'active', description = ?, last_synced_at = ? WHERE id = ?`,
              )
              .run(
                subnet.id,
                record.address,
                record.hostname.slice(0, 100),
                canonicalMac(record.mac),
                record.description.slice(0, 500),
                now,
                existing.id,
              );
          else
            db.db
              .prepare(
                `UPDATE ipam_reservations SET
                  hostname = CASE WHEN hostname = '' THEN ? ELSE hostname END,
                  mac_address = CASE WHEN mac_address = '' THEN ? ELSE mac_address END,
                  last_synced_at = ? WHERE id = ?`,
              )
              .run(record.hostname.slice(0, 100), canonicalMac(record.mac), now, existing.id);
          upsertSourceObservation(source, subnet, sourceRef, record, existing.id, now);
          reconcilePriorReservation(existing.id);
          updated += 1;
        } else {
          const reservationId = db.uuidv4();
          db.db
            .prepare(
              `INSERT INTO ipam_reservations (id, subnet_id, address, hostname, mac_address, status, description, source_type, source_ref, last_synced_at)
            VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)`,
            )
            .run(
              reservationId,
              subnet.id,
              record.address,
              record.hostname.slice(0, 100),
              canonicalMac(record.mac),
              record.description.slice(0, 500),
              source.type,
              sourceRef,
              now,
            );
          upsertSourceObservation(source, subnet, sourceRef, record, reservationId, now);
          reconcilePriorReservation(reservationId);
          created += 1;
        }
      }
      // A source sync is a complete current observation (DHCP leases or
      // controller clients).  Leaving vanished entries behind makes an IPAM
      // look occupied forever. Delete only reservations owned by this exact
      // source; manual, Proxmox and other controller records are untouched.
      const previous = db.db
        .prepare(
          "SELECT id, source_ref, reservation_id FROM ipam_source_observations WHERE source_id = ?",
        )
        .all(source.id);
      const deleteObservation = db.db.prepare("DELETE FROM ipam_source_observations WHERE id = ?");
      for (const observation of previous) {
        if (!seenSourceRefs.has(String(observation.source_ref || ""))) {
          deleteObservation.run(observation.id);
          if (observation.reservation_id)
            removed += reconcileSourceReservation(observation.reservation_id, source.id);
        }
      }
      db.db
        .prepare(
          `UPDATE ipam_sync_sources SET
            last_synced_at = ?, last_status = 'success', last_error = '',
            last_tested_at = ?, last_test_status = 'success', last_test_error = '',
            last_record_count = ?, last_ignored_count = ?,
            updated_at = datetime('now')
           WHERE id = ?`,
        )
        .run(now, now, records.length, ignored, source.id);
      db.auditLog.write(
        "ipam.source_sync",
        `source=${source.name} created=${created} updated=${updated} removed=${removed} conflicts=${conflicts} ignored=${ignored}`,
        ip,
        true,
        actor,
      );
    });
    transaction();
    return {
      created,
      updated,
      removed,
      conflicts,
      ignored,
      records: records.length,
      synced_at: now,
    };
  } catch (error) {
    assertCurrentSourceConfiguration(source);
    db.db.transaction(() => {
      db.db
        .prepare(
          `UPDATE ipam_sync_sources SET last_status = 'failed', last_error = ?, updated_at = datetime('now') WHERE id = ?`,
        )
        .run(
          String(error.message || "Synchronization failed").slice(
            0,
            500,
          ),
          source.id,
        );
      db.auditLog.write(
        "ipam.source_sync",
        `source=${source.name} failed`,
        ip,
        false,
        actor,
      );
    })();
    throw error;
  } finally {
    syncingSources.delete(source.id);
  }
}


module.exports = { validEndpoint, publicSource, sourceSummary, syncIntervalMinutes, sourceRequest, sourceList, sourceRecords, upsertSourceObservation, reconcileSourceReservation, assertCurrentSourceConfiguration, syncIpamSource, SOURCE_TYPES };
