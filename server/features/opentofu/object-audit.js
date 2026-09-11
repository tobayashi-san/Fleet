'use strict';

// Persist the event and its queryable object identity together.
function writeObjectAudit(db, source, nodeName, action, detail, ip, actor) {
  return db.db.transaction(() => {
    const id = db.auditLog.write(action, detail, ip, true, actor || null, source.environment_id);
    db.db.prepare('INSERT INTO proxmox_object_audit (audit_id, connection_id, environment_id, node_name) VALUES (?, ?, ?, ?)')
      .run(id, source.id, source.environment_id, nodeName || null);
    return id;
  })();
}
module.exports = { writeObjectAudit };
