'use strict';

const net = require('net');
const { writeObjectAudit } = require('../object-audit');
const { parseSshPort } = require('../../../utils/ssh-port');
const { randomUUID } = require('crypto');
const log = require('../../../utils/logger').child('features:opentofu:platforms');
const cryptoUtil = require('../../../utils/crypto');
const { can, getPermissions } = require('../../../utils/permissions');
const { PROXMOX_IDENTIFIER_RE, extractProxmoxGuestNetworkRecords, extractProxmoxLxcNetworkRecords } = require('../proxmox-blueprints');
const { createProxmoxConnection, requestProxmoxApi } = require('../proxmox-client');
const { syncProxmoxIpam } = require('../proxmox-ipam-sync');

function guestId(value) {
  const text = typeof value === 'number' || typeof value === 'string' ? String(value) : '';
  const id = /^[1-9]\d*$/.test(text) ? Number(text) : NaN;
  if (!Number.isSafeInteger(id)) { const error = new Error('Guest ID must be a positive whole number.'); error.status = 400; throw error; }
  return id;
}

function syncInterval(value, fallback = 15) {
  return value === undefined ? fallback : Number(value);
}

function validateConnectionInput(body) {
  for (const field of ['environment_id', 'name', 'endpoint', 'api_token', 'ssh_public_key', 'ca_certificate']) {
    if (body[field] !== undefined && typeof body[field] !== 'string') return { field, error: `${field} must be text.` };
  }
  if (body.name !== undefined && (!body.name.trim() || body.name.trim().length > 80)) return { field: 'name', error: 'Connection name must contain 1 to 80 characters.' };
  for (const field of ['insecure', 'auto_sync_ipam']) {
    if (body[field] !== undefined && typeof body[field] !== 'boolean') return { field, error: `${field} must be true or false.` };
  }
  if (body.sync_interval_min !== undefined) {
    const value = body.sync_interval_min;
    if (!(typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value))) || !Number.isInteger(Number(value)) || Number(value) < 5 || Number(value) > 1440) {
      return { field: 'sync_interval_min', error: 'IPAM interval must be a whole number between 5 and 1440 minutes.' };
    }
  }
  if (body.ca_certificate !== undefined) {
    const certificate = body.ca_certificate.trim();
    if (certificate.length > 64 * 1024) return { field: 'ca_certificate', error: 'CA certificate must be no larger than 64 KB.' };
    if (certificate && (!certificate.includes('-----BEGIN CERTIFICATE-----') || !certificate.includes('-----END CERTIFICATE-----'))) return { field: 'ca_certificate', error: 'Enter a PEM encoded CA certificate.' };
  }
  return null;
}

function collectPermissionNames(value, names = new Set()) {
  if (!value || typeof value !== 'object') return names;
  for (const [key, child] of Object.entries(value)) {
    if (key.includes('.') && child) names.add(key);
    if (child && typeof child === 'object') collectPermissionNames(child, names);
  }
  return names;
}

/** Register platform sources, inventory actions, updates and guest adoption. */
function registerPlatformRoutes({ db, router, listProxmoxConnectionRows, publicProxmoxConnection, readSavedProxmoxConnection, getProxmoxVms, getLastRun }) {
  router.use('/proxmox-connections/:connectionId/vms/:nodeName/:vmId', (req, res, next) => {
    try {
      guestId(req.params.vmId);
      if (!PROXMOX_IDENTIFIER_RE.test(req.params.nodeName)) return res.status(400).json({error:'Invalid Proxmox node name.'});
      next();
    } catch (error) { res.status(400).json({error:error.message}); }
  });

  function writeGuestAudit(target, req, action, detail) {
    db.db.transaction(() => {
      const id = writeObjectAudit(db, target.source, target.vm.node_name, action, `source_id=${JSON.stringify(target.source.id)} node=${JSON.stringify(target.vm.node_name)} ${detail}`, req.ip, req.user?.username);
      db.db.prepare('INSERT INTO proxmox_guest_audit (audit_id, connection_id, environment_id, node_name, vm_id) VALUES (?, ?, ?, ?, ?)')
        .run(id, target.source.id, target.source.environment_id, target.vm.node_name, target.vm.vm_id);
    })();
  }

  router.get('/proxmox-connections/:connectionId/vms/:nodeName/:vmId/audit', (req, res) => {
    if (!can(getPermissions(req.user), 'canViewAudit')) return res.status(403).json({error:'Permission denied'});
    const source = db.db.prepare('SELECT environment_id FROM tofu_proxmox_connections WHERE id = ?').get(req.params.connectionId);
    if (!source) return res.status(404).json({error:'Platform connection not found.'});
    const offset = req.query.offset === undefined ? 0 : Number(req.query.offset);
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000) return res.status(400).json({error:'Invalid audit offset.'});
    const values = [req.params.connectionId, source.environment_id, req.params.nodeName, req.params.vmId];
    const scope = 'FROM proxmox_guest_audit g JOIN audit_log a ON a.id=g.audit_id AND a.environment_id=g.environment_id WHERE g.connection_id=? AND g.environment_id=? AND g.node_name=? AND g.vm_id=?';
    const total = db.db.prepare(`SELECT COUNT(*) AS count ${scope}`).get(...values).count;
    const events = db.db.prepare(`SELECT a.* ${scope} ORDER BY a.created_at DESC, a.id DESC LIMIT 20 OFFSET ?`).all(...values, offset);
    res.json({events, total, offset, limit:20});
  });

  router.get('/proxmox-connections/:connectionId/audit', (req, res) => {
    if (!can(getPermissions(req.user), 'canViewAudit')) return res.status(403).json({error:'Permission denied'});
    const source = db.db.prepare('SELECT * FROM tofu_proxmox_connections WHERE id = ?').get(req.params.connectionId);
    if (!source) return res.status(404).json({error:'Platform connection not found.'});
    if (req.query.environment_id !== undefined && req.query.environment_id !== source.environment_id) return res.status(404).json({error:'Platform connection not found.'});
    const offset = req.query.offset === undefined ? 0 : Number(req.query.offset);
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000) return res.status(400).json({error:'Invalid audit offset.'});
    const nodeName = req.query.node_name;
    if (nodeName !== undefined && (typeof nodeName !== 'string' || !PROXMOX_IDENTIFIER_RE.test(nodeName))) return res.status(400).json({error:'Invalid node name.'});
    // Match the same endpoint grouping as infrastructure inventory, without
    // decrypting credentials or contacting Proxmox to retrieve historical data.
    const endpointKey = value => { try { const url = new URL(value); return `${url.origin}${url.pathname.replace(/\/+$/, '')}`; } catch { return null; } };
    const key = endpointKey(source.endpoint);
    const connections = db.db.prepare('SELECT id, endpoint FROM tofu_proxmox_connections WHERE environment_id = ?').all(source.environment_id)
      .filter(row => row.id === source.id || (key && endpointKey(row.endpoint) === key)).map(row => row.id);
    const values = [source.environment_id, ...connections];
    let scope = `FROM proxmox_object_audit o JOIN audit_log a ON a.id=o.audit_id AND a.environment_id=o.environment_id WHERE o.environment_id=? AND o.connection_id IN (${connections.map(() => '?').join(',')})`;
    if (nodeName !== undefined) { scope += ' AND o.node_name=?'; values.push(nodeName); }
    const total = db.db.prepare(`SELECT COUNT(*) AS count ${scope}`).get(...values).count;
    const events = db.db.prepare(`SELECT a.* ${scope} ORDER BY a.created_at DESC, a.id DESC LIMIT 20 OFFSET ?`).all(...values, offset);
    res.json({events, total, offset, limit:20});
  });

  router.get('/proxmox-connections', (req, res) => {
    const environmentId = String(req.query.environment_id || '').trim();
    if (!environmentId) return res.status(400).json({ error: 'environment_id is required' });
    if (!db.db.prepare('SELECT 1 FROM environments WHERE id = ?').get(environmentId)) return res.status(400).json({ error: 'Environment not found' });
    res.json(listProxmoxConnectionRows(environmentId).map(publicProxmoxConnection));
  });

  router.post('/proxmox-connections/test', async (req, res) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const invalid = validateConnectionInput(body);
    if (invalid) return res.status(400).json(invalid);
    const environmentId = String(body.environment_id || '').trim();
    if (!environmentId || !db.db.prepare('SELECT 1 FROM environments WHERE id = ?').get(environmentId)) return res.status(400).json({ error: 'Environment not found' });
    const existing = body.connection_id ? db.db.prepare('SELECT * FROM tofu_proxmox_connections WHERE id = ? AND environment_id = ?').get(String(body.connection_id), environmentId) : null;
    if (body.connection_id && !existing) return res.status(404).json({ error: 'Platform connection not found.' });
    const endpoint = String(body.endpoint || existing?.endpoint || '').trim();
    let token = String(body.api_token || '').trim();
    let caCertificate = String(body.ca_certificate || '').trim();
    try {
      if (!token && existing) token = readSavedProxmoxConnection(existing).apiToken;
      if (!caCertificate && existing?.ca_certificate) caCertificate = cryptoUtil.decrypt(String(existing.ca_certificate));
      const connection = createProxmoxConnection(endpoint, token, body.insecure === true, caCertificate);
      const [version, nodes, permissions] = await Promise.all([
        requestProxmoxApi(connection, '/version'),
        requestProxmoxApi(connection, '/nodes'),
        requestProxmoxApi(connection, '/access/permissions'),
      ]);
      const permissionNames = [...collectPermissionNames(permissions)].sort();
      const recommended = ['Datastore.Audit', 'Sys.Audit', 'VM.Audit'];
      const recommendedMissing = recommended.filter(permission => !permissionNames.includes(permission));
      res.json({
        reachable: true,
        authenticated: true,
        checked_at: new Date().toISOString(),
        identity: token.includes('=') ? token.slice(0, token.indexOf('=')) : token.split('=')[0] || 'API token',
        version: typeof version?.version === 'string' ? version.version : null,
        node_count: Array.isArray(nodes) ? nodes.length : 0,
        permissions: permissionNames,
        inventory_access: Array.isArray(nodes),
        recommended_missing: recommendedMissing,
      });
    } catch (error) {
      res.status(error.status || 502).json({ error: error.message || 'The Proxmox connection test failed.' });
    }
  });
  
  router.post('/proxmox-connections', (req, res) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const invalid = validateConnectionInput(body);
    if (invalid) return res.status(400).json(invalid);
    const environmentId = String(body.environment_id || '').trim();
    const name = String(body.name || '').trim();
    const endpoint = String(body.endpoint || '').trim();
    const token = String(body.api_token || '').trim();
    const sshPublicKey = String(body.ssh_public_key || '').trim();
    const caCertificate = String(body.ca_certificate || '').trim();
    if ((token || sshPublicKey || caCertificate) && !cryptoUtil.isEncryptionAvailable()) return res.status(503).json({ error: 'SHIPYARD_KEY_SECRET is required before platform secrets can be stored.' });
    if (!environmentId) return res.status(400).json({ error: 'environment_id is required' });
    if (!name) return res.status(400).json({ field: 'name', error: 'Connection name is required' });
    if (!db.db.prepare('SELECT 1 FROM environments WHERE id = ?').get(environmentId)) return res.status(400).json({ error: 'Environment not found' });
    if (!token) return res.status(400).json({ field: 'api_token', error: 'A Proxmox API token is required.' });
    try { createProxmoxConnection(endpoint, token, body.insecure === true, caCertificate); } catch (error) { return res.status(400).json({ field: 'endpoint', error: error.message }); }
    const id = randomUUID();
    try {
      db.db.prepare('INSERT INTO tofu_proxmox_connections (id, environment_id, name, endpoint, api_token, insecure, ssh_public_key, ca_certificate, auto_sync_ipam, sync_interval_min) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(id, environmentId, name, endpoint, cryptoUtil.encrypt(token), body.insecure === true ? 1 : 0, sshPublicKey ? cryptoUtil.encrypt(sshPublicKey) : '', caCertificate ? cryptoUtil.encrypt(caCertificate) : '', body.auto_sync_ipam === false ? 0 : 1, syncInterval(body.sync_interval_min));
      res.status(201).json(publicProxmoxConnection(db.db.prepare('SELECT * FROM tofu_proxmox_connections WHERE id = ?').get(id)));
    } catch (error) { res.status(409).json({ error: error.message || 'Connection already exists' }); }
  });
  
  router.put('/proxmox-connections/:id', (req, res) => {
    const existing = db.db.prepare('SELECT * FROM tofu_proxmox_connections WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Connection not found' });
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const invalid = validateConnectionInput(body);
    if (invalid) return res.status(400).json(invalid);
    if (body.environment_id !== undefined && body.environment_id !== existing.environment_id) return res.status(409).json({ field: 'environment_id', error: 'This connection belongs to a different environment. Reload its original environment before saving.' });
    const name = body.name === undefined ? existing.name : String(body.name || '').trim();
    const endpoint = body.endpoint === undefined ? existing.endpoint : String(body.endpoint || '').trim();
    const token = typeof body.api_token === 'string' && body.api_token.trim() ? body.api_token.trim() : null;
    const caCertificate = typeof body.ca_certificate === 'string' && body.ca_certificate.trim() ? body.ca_certificate.trim() : null;
    if ((token || caCertificate || (typeof body.ssh_public_key === 'string' && body.ssh_public_key.trim())) && !cryptoUtil.isEncryptionAvailable()) return res.status(503).json({ error: 'SHIPYARD_KEY_SECRET is required before platform secrets can be stored.' });
    const insecure = body.insecure === undefined ? Boolean(existing.insecure) : body.insecure === true;
    const autoSyncIpam = body.auto_sync_ipam === undefined ? Boolean(existing.auto_sync_ipam) : body.auto_sync_ipam === true;
    const syncIntervalMin = syncInterval(body.sync_interval_min, existing.sync_interval_min);
    if (!name) return res.status(400).json({ field: 'name', error: 'Connection name is required' });
    try { createProxmoxConnection(endpoint, token || readSavedProxmoxConnection(existing).apiToken, insecure, caCertificate || (existing.ca_certificate ? cryptoUtil.decrypt(String(existing.ca_certificate)) : '')); } catch (error) { return res.status(400).json({ field: 'endpoint', error: error.message }); }
    const sshKey = typeof body.ssh_public_key === 'string' && body.ssh_public_key.trim() ? cryptoUtil.encrypt(body.ssh_public_key.trim()) : existing.ssh_public_key;
    db.db.prepare("UPDATE tofu_proxmox_connections SET name = ?, endpoint = ?, api_token = ?, insecure = ?, ssh_public_key = ?, ca_certificate = ?, auto_sync_ipam = ?, sync_interval_min = ?, updated_at = datetime('now') WHERE id = ?")
      .run(name, endpoint, token ? cryptoUtil.encrypt(token) : existing.api_token, insecure ? 1 : 0, sshKey, caCertificate ? cryptoUtil.encrypt(caCertificate) : existing.ca_certificate, autoSyncIpam ? 1 : 0, syncIntervalMin, existing.id);
    res.json(publicProxmoxConnection(db.db.prepare('SELECT * FROM tofu_proxmox_connections WHERE id = ?').get(existing.id)));
  });
  
  router.delete('/proxmox-connections/:id', (req, res) => {
    // Acquire the SQLite write lock before checking references so another writer
    // cannot add a dependency between these reads and the deletion.
    const remove = db.db.transaction(() => {
      const connection = db.db.prepare('SELECT id, name, environment_id FROM tofu_proxmox_connections WHERE id = ?').get(req.params.id);
      if (!connection) return { status: 404, error: 'Connection not found' };
      const inUse = db.db.prepare('SELECT COUNT(*) AS count FROM tofu_workspaces WHERE proxmox_connection_id = ?').get(connection.id);
      if (inUse.count > 0) return { status: 409, error: `This platform connection is still used by ${inUse.count} deployment(s). Reassign or detach them first.` };
      const adopted = db.db.prepare('SELECT COUNT(*) AS count FROM proxmox_inventory_servers WHERE connection_id = ?').get(connection.id);
      if (adopted.count > 0) return { status: 409, error: `This platform connection is still used by ${adopted.count} adopted host(s). Remove their Proxmox mapping first.` };
      db.db.prepare('DELETE FROM tofu_proxmox_connections WHERE id = ?').run(connection.id);
      db.auditLog.write('tofu.connection_remove', `connection=${JSON.stringify(connection.name)} id=${JSON.stringify(connection.id)} remote_data_kept=true`, req.ip, true, req.user?.username, connection.environment_id);
      return { connection };
    });
    let result;
    try { result = remove.immediate(); }
    catch (error) {
      if (error.code === 'SQLITE_BUSY' || error.code === 'SQLITE_LOCKED') return res.status(409).json({ error: 'Platform connections are being changed by another operation. Try again.' });
      throw error;
    }
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.json({ success: true });
  });
  
  function getProxmoxConnectionSource(id) {
    const source = db.db.prepare('SELECT * FROM tofu_proxmox_connections WHERE id = ?').get(id);
    if (!source) {
      const error = new Error('Proxmox platform not found.'); error.status = 404; throw error;
    }
    return { source, connection: readSavedProxmoxConnection(source) };
  }
  
  async function getInventoryNodeTarget(connectionId, nodeName, req, { requireUpdate = false } = {}) {
    const permissions = getPermissions(req.user);
    if (!can(permissions, 'canViewServers') || (requireUpdate && !can(permissions, 'canRunUpdates'))) {
      const error = new Error('Permission denied'); error.status = 403; throw error;
    }
    const safeNodeName = String(nodeName || '').trim();
    if (!safeNodeName || !PROXMOX_IDENTIFIER_RE.test(safeNodeName)) {
      const error = new Error('A valid Proxmox node is required.'); error.status = 400; throw error;
    }
    const { source, connection } = getProxmoxConnectionSource(connectionId);
    const nodes = await requestProxmoxApi(connection, '/nodes');
    if (!(Array.isArray(nodes) ? nodes : []).some(node => String(node?.node || '') === safeNodeName)) {
      const error = new Error('Proxmox node not found on this platform.'); error.status = 404; throw error;
    }
    return { source, connection, node_name: safeNodeName };
  }
  
  router.get('/proxmox-connections/:connectionId/nodes/:nodeName/updates', async (req, res) => {
    try {
      const target = await getInventoryNodeTarget(req.params.connectionId, req.params.nodeName, req);
      const updates = await requestProxmoxApi(target.connection, `/nodes/${encodeURIComponent(target.node_name)}/apt/update`);
      res.json({ node_name: target.node_name, updates: Array.isArray(updates) ? updates : [] });
    } catch (error) { res.status(error.status || 502).json({ error: error.message || 'Could not load Proxmox updates.' }); }
  });
  
  router.post('/proxmox-connections/:connectionId/nodes/:nodeName/updates/refresh', async (req, res) => {
    try {
      const target = await getInventoryNodeTarget(req.params.connectionId, req.params.nodeName, req, { requireUpdate: true });
      const taskId = await requestProxmoxApi(target.connection, `/nodes/${encodeURIComponent(target.node_name)}/apt/update`, {
        method: 'POST', payload: { notify: 0, quiet: 1 },
      });
      writeObjectAudit(db, target.source, target.node_name, 'infrastructure.proxmox_update_catalog', `source_id=${JSON.stringify(target.source.id)} source=${JSON.stringify(target.source.name)} node=${JSON.stringify(target.node_name)} task=${JSON.stringify(taskId || 'started')}`, req.ip, req.user?.username);
      res.status(202).json({ status: 'started', task_id: taskId || null });
    } catch (error) { res.status(error.status || 502).json({ error: error.message || 'Could not refresh the Proxmox update catalog.' }); }
  });
  
  const guestApiPath = (guest, suffix = '') => `/nodes/${encodeURIComponent(guest.node_name)}/${guest.guest_type}/${guest.vm_id}${suffix}`;

  async function getGuestNetworkRecords(connection, guest) {
    if (guest.guest_type === 'lxc') {
      try {
        const payload = await requestProxmoxApi(connection, guestApiPath(guest, '/interfaces'));
        const records = extractProxmoxLxcNetworkRecords(payload);
        if (records.length) return records;
      } catch {
        // A stopped CT has no live interfaces. Its static netX configuration
        // can still provide a usable address without starting the guest.
      }
      const config = await requestProxmoxApi(connection, guestApiPath(guest, '/config'));
      const interfaces = Object.entries(config && typeof config === 'object' ? config : {})
        .filter(([key, value]) => /^net\d+$/.test(key) && typeof value === 'string')
        .map(([name, value]) => {
          const options = String(value).split(',').reduce((result, item) => {
            const separator = item.indexOf('=');
            if (separator > 0) result[item.slice(0, separator)] = item.slice(separator + 1);
            return result;
          }, {});
          return { name: options.name || name, inet: options.ip || '', hwaddr: options.hwaddr || '' };
        });
      return extractProxmoxLxcNetworkRecords(interfaces);
    }
    const payload = await requestProxmoxApi(connection, guestApiPath(guest, '/agent/network-get-interfaces'));
    return extractProxmoxGuestNetworkRecords(payload);
  }

  // Resolve a guest from the live Proxmox inventory before running an operation.
  // The browser never supplies a URL or credentials; it may only reference a
  // configured connection, node and guest ID. Looking up the guest again prevents a
  // stale UI or handcrafted request from targeting a different object.
  async function getInventoryVmTarget(connectionId, nodeName, vmId, req, { requireEdit = false, requirePower = false } = {}) {
    const permissions = getPermissions(req.user);
    if (!can(permissions, requireEdit ? 'canEditServers' : 'canViewServers')) {
      const error = new Error('Permission denied'); error.status = 403; throw error;
    }
    if (requirePower && !can(permissions, 'canRebootServers')) {
      const error = new Error('Permission denied'); error.status = 403; throw error;
    }
    const safeConnectionId = String(connectionId || '').trim();
    const safeNodeName = String(nodeName || '').trim();
    const safeVmId = guestId(vmId);
    if (!safeConnectionId || !safeNodeName || !PROXMOX_IDENTIFIER_RE.test(safeNodeName) || !Number.isInteger(safeVmId) || safeVmId <= 0) {
      const error = new Error('Connection, node and VM or container ID are required.'); error.status = 400; throw error;
    }
    const { source, connection } = getProxmoxConnectionSource(safeConnectionId);
    const resources = await requestProxmoxApi(connection, '/cluster/resources?type=vm');
    const resource = (Array.isArray(resources) ? resources : []).find(item =>
      ['qemu', 'lxc'].includes(String(item?.type || '').toLowerCase()) && String(item?.node || '') === safeNodeName && Number(item?.vmid) === safeVmId);
    if (!resource) {
      const error = new Error('The VM or container was not found on this Proxmox platform.'); error.status = 404; throw error;
    }
    const guestType = String(resource.type).toLowerCase();
    return { source, connection, vm: { name: String(resource.name || `${guestType === 'lxc' ? 'CT' : 'VM'} ${safeVmId}`), node_name: safeNodeName, vm_id: safeVmId, guest_type: guestType } };
  }
  
  function snapshotNameOrError(value) {
    const name = String(value || '').trim();
    if (name === 'current' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$/.test(name)) {
      const error = new Error('Snapshot names must contain 1–40 letters, digits, periods, underscores, or hyphens.'); error.status = 400; throw error;
    }
    return name;
  }
  
  router.get('/proxmox-connections/:connectionId/vms/:nodeName/:vmId/snapshots', async (req, res) => {
    try {
      const target = await getInventoryVmTarget(req.params.connectionId, req.params.nodeName, req.params.vmId, req);
      const snapshots = await requestProxmoxApi(target.connection, guestApiPath(target.vm, '/snapshot'));
      res.json({ connection_id: target.source.id, node_name: target.vm.node_name, vm_id: target.vm.vm_id, guest_type: target.vm.guest_type, snapshots: Array.isArray(snapshots) ? snapshots.filter(snapshot => snapshot?.name !== 'current') : [] });
    } catch (error) { res.status(error.status || 502).json({ error: error.message || 'Snapshots could not be loaded.' }); }
  });
  
  // An inventory VM can be entirely unmanaged, adopted as a host, or
  // declared by one or more OpenTofu workspaces.  Keep that relationship
  // explicit instead of guessing it in the browser from names or IPs.
  router.get('/proxmox-connections/:connectionId/vms/:nodeName/:vmId/context', async (req, res) => {
    try {
      const target = await getInventoryVmTarget(req.params.connectionId, req.params.nodeName, req.params.vmId, req);
      const adopted = db.db.prepare(`
        SELECT server.id, server.name
        FROM proxmox_inventory_servers inventory
        JOIN servers server ON server.id = inventory.server_id
        WHERE inventory.connection_id = ? AND inventory.node_name = ? AND inventory.vm_id = ?
        LIMIT 1
      `).get(target.source.id, target.vm.node_name, target.vm.vm_id) || null;
      const workspaces = db.db.prepare(`
        SELECT id, name FROM tofu_workspaces
        WHERE proxmox_connection_id = ?
        ORDER BY name COLLATE NOCASE
      `).all(target.source.id);
      const deployments = target.vm.guest_type === 'lxc' ? [] : workspaces.flatMap(workspace => getProxmoxVms(workspace.id)
        .filter(vm => vm.node_name === target.vm.node_name && Number(vm.vm_id) === target.vm.vm_id)
        .map(vm => {
          const resourceKey = `resource:proxmox_virtual_environment_vm.${vm.name}`;
          const mapping = db.db.prepare('SELECT server_id FROM tofu_managed_servers WHERE workspace_id = ? AND resource_key = ?').get(workspace.id, resourceKey);
          const lastRun = getLastRun(workspace.id);
          return {
            definition_id: db.db.prepare('SELECT id FROM tofu_proxmox_vms WHERE id = ? AND is_isolated = 1').get(vm.id)?.id || null,
            workspace_id: workspace.id,
            workspace_name: workspace.name,
            vm_name: vm.name,
            fleet_server_id: mapping?.server_id || null,
            last_run: lastRun ? {
              id: lastRun.id,
              action: lastRun.action,
              status: lastRun.status,
              started_at: lastRun.started_at,
              completed_at: lastRun.completed_at,
            } : null,
          };
        }));
      res.json({
        connection_id: target.source.id,
        node_name: target.vm.node_name,
        vm_id: target.vm.vm_id,
        guest_type: target.vm.guest_type,
        adopted_server: adopted,
        deployments,
      });
    } catch (error) { res.status(error.status || 502).json({ error: error.message || 'VM context could not be loaded.' }); }
  });
  
  // Return a deliberately small, display-oriented projection of the Proxmox
  // VM configuration.  The console needs hardware and network facts for the
  // object view, but must never turn this endpoint into a credential/config
  // dump (for example cloud-init passwords or arbitrary custom arguments).
  router.get('/proxmox-connections/:connectionId/vms/:nodeName/:vmId/configuration', async (req, res) => {
    try {
      const target = await getInventoryVmTarget(req.params.connectionId, req.params.nodeName, req.params.vmId, req);
      const config = await requestProxmoxApi(target.connection, guestApiPath(target.vm, '/config'));
      const source = config && typeof config === 'object' ? config : {};
      const parseOptions = (value) => String(value || '').split(',').reduce((result, item) => {
        const separator = item.indexOf('=');
        if (separator > 0) result[item.slice(0, separator)] = item.slice(separator + 1);
        return result;
      }, {});
      const disks = Object.entries(source)
        .filter(([key, value]) => (target.vm.guest_type === 'lxc' ? /^(rootfs|mp\d+)$/.test(key) : /^(scsi|virtio|sata|ide)\d+$/.test(key)) && typeof value === 'string')
        .map(([bus, value]) => {
          const options = parseOptions(value);
          const storage = String(value).split(',')[0] || '—';
          return { bus, storage, size: options.size || null, format: options.format || null, discard: options.discard === 'on' };
        });
      const networks = Object.entries(source)
        .filter(([key, value]) => /^net\d+$/.test(key) && typeof value === 'string')
        .map(([interfaceName, value]) => {
          const options = parseOptions(value);
          return {
            interface: interfaceName,
            model: target.vm.guest_type === 'lxc' ? (options.type || 'veth') : (String(value).split(',')[0] || 'virtio'),
            bridge: options.bridge || null,
            vlan_id: options.tag || null,
            mac_address: options.virtio || options.e1000 || options.hwaddr || null,
            firewall: options.firewall === '1',
          };
        });
      const ipConfig = Object.entries(source)
        .filter(([key, value]) => (target.vm.guest_type === 'lxc' ? /^net\d+$/.test(key) : /^ipconfig\d+$/.test(key)) && typeof value === 'string')
        .map(([interfaceName, value]) => {
          const options = parseOptions(value);
          return { interface: interfaceName.replace('ipconfig', 'net'), ipv4: options.ip || null, gateway: options.gw || null };
        });
      res.json({
        connection_id: target.source.id,
        node_name: target.vm.node_name,
        vm_id: target.vm.vm_id,
        guest_type: target.vm.guest_type,
        hardware: {
          sockets: Number(source.sockets || 1),
          cores: Number(source.cores || 0),
          memory_mb: Number(source.memory || 0),
          os_type: source.ostype || null,
          bios: source.bios || null,
          machine: source.machine || null,
          scsi_controller: source.scsihw || null,
          agent_enabled: target.vm.guest_type === 'lxc' ? null : (String(source.agent || '').includes('enabled=1') || String(source.agent || '') === '1'),
          boot_order: source.boot || null,
        },
        ...(target.vm.guest_type === 'lxc' ? { container: {
          architecture: typeof source.arch === 'string' ? source.arch : null,
          unprivileged: [1, '1', true].includes(source.unprivileged) ? true : [0, '0', false].includes(source.unprivileged) ? false : null,
          swap_mb: source.swap != null && source.swap !== '' && Number.isFinite(Number(source.swap)) && Number(source.swap) >= 0 ? Number(source.swap) : null,
          cpu_limit: source.cpulimit != null && source.cpulimit !== '' && Number.isFinite(Number(source.cpulimit)) && Number(source.cpulimit) >= 0 ? Number(source.cpulimit) : null,
        } } : {}),
        disks,
        networks,
        guest: { username: target.vm.guest_type === 'lxc' ? null : (source.ciuser || null), ip_config: ipConfig },
      });
    } catch (error) { res.status(error.status || 502).json({ error: error.message || 'VM configuration could not be loaded.' }); }
  });
  
  router.post('/proxmox-connections/:connectionId/vms/:nodeName/:vmId/snapshots', async (req, res) => {
    try {
      const name = snapshotNameOrError(req.body?.name);
      if (req.body?.description !== undefined && (typeof req.body.description !== 'string' || req.body.description.trim().length > 512)) return res.status(400).json({error:'Snapshot description must be text with at most 512 characters.'});
      if (req.body?.include_memory !== undefined && typeof req.body.include_memory !== 'boolean') return res.status(400).json({error:'include_memory must be true or false.'});
      const description = String(req.body?.description || '').trim();
      const target = await getInventoryVmTarget(req.params.connectionId, req.params.nodeName, req.params.vmId, req, { requireEdit: true });
      const payload = { snapname: name, description };
      if (target.vm.guest_type === 'lxc' && req.body?.include_memory === true) return res.status(400).json({error:'LXC snapshots do not include running memory.'});
      if (target.vm.guest_type === 'qemu') payload.vmstate = req.body?.include_memory === false ? 0 : 1;
      const task = await requestProxmoxApi(target.connection, guestApiPath(target.vm, '/snapshot'), { method: 'POST', payload });
      if (typeof task === 'string' && task.length > 0 && task.length <= 512) {
        db.db.prepare('INSERT OR IGNORE INTO proxmox_guest_tasks (connection_id, environment_id, endpoint, node_name, vm_id, task_id, action, resource_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .run(target.source.id, target.source.environment_id, target.source.endpoint, target.vm.node_name, target.vm.vm_id, task, 'snapshot_create', name);
      }
      writeGuestAudit(target, req, 'infrastructure.snapshot_create', `source=${target.source.name} vm=${target.vm.name} vm_id=${target.vm.vm_id} snapshot=${name}`);
      res.status(202).json({ success: true, task, name });
    } catch (error) { res.status(error.status || 502).json({ error: error.message || 'The snapshot could not be created.' }); }
  });
  
  router.get('/proxmox-connections/:connectionId/vms/:nodeName/:vmId/tasks', (req, res) => {
    if (!can(getPermissions(req.user), 'canViewServers')) return res.status(403).json({error:'Permission denied'});
    const source = db.db.prepare('SELECT environment_id FROM tofu_proxmox_connections WHERE id = ?').get(req.params.connectionId);
    if (!source) return res.status(404).json({error:'Platform connection not found.'});
    const offset = req.query.offset === undefined ? 0 : Number(req.query.offset);
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000) return res.status(400).json({error:'Invalid task offset.'});
    const values = [req.params.connectionId, source.environment_id, req.params.nodeName, req.params.vmId];
    const where = 'WHERE connection_id = ? AND environment_id = ? AND node_name = ? AND vm_id = ?';
    const total = db.db.prepare(`SELECT COUNT(*) AS count FROM proxmox_guest_tasks ${where}`).get(...values).count;
    const tasks = db.db.prepare(`SELECT task_id, action, resource_name, status, exit_status, created_at, checked_at FROM proxmox_guest_tasks ${where} ORDER BY created_at DESC, task_id DESC LIMIT 20 OFFSET ?`).all(...values, offset);
    res.json({tasks, total, offset, limit:20});
  });

  router.get('/proxmox-connections/:connectionId/vms/:nodeName/:vmId/tasks/:taskId/status', async (req, res) => {
    if (!can(getPermissions(req.user), 'canViewServers')) return res.status(403).json({error:'Permission denied'});
    const task = db.db.prepare('SELECT * FROM proxmox_guest_tasks WHERE connection_id = ? AND node_name = ? AND vm_id = ? AND task_id = ?')
      .get(req.params.connectionId, req.params.nodeName, req.params.vmId, req.params.taskId);
    if (!task) return res.status(404).json({error:'No tracked task exists for this guest.'});
    try {
      const {source, connection} = getProxmoxConnectionSource(task.connection_id);
      if (source.environment_id !== task.environment_id || source.endpoint !== task.endpoint) return res.status(409).json({error:'The platform connection changed. Check this task in the original Proxmox platform.'});
      const result = await requestProxmoxApi(connection, `/nodes/${encodeURIComponent(task.node_name)}/tasks/${encodeURIComponent(task.task_id)}/status`);
      const exitStatus = typeof result?.exitstatus === 'string' ? result.exitstatus.slice(0, 2048) : null;
      const status = result?.status === 'running' ? 'running' : result?.status === 'stopped' && exitStatus === 'OK' ? 'succeeded' : result?.status === 'stopped' && exitStatus ? 'failed' : 'unknown';
      db.db.prepare("UPDATE proxmox_guest_tasks SET status = ?, exit_status = ?, checked_at = datetime('now') WHERE connection_id = ? AND node_name = ? AND vm_id = ? AND task_id = ?")
        .run(status, exitStatus, task.connection_id, task.node_name, task.vm_id, task.task_id);
      res.json({task: task.task_id, action: task.action, snapshot: task.resource_name, status, exit_status: exitStatus});
    } catch (error) { res.status(error.status || 502).json({error:'The Proxmox task status could not be retrieved. Try again.'}); }
  });

  router.post('/proxmox-connections/:connectionId/vms/:nodeName/:vmId/snapshots/:snapshotName/restore', async (req, res) => {
    try {
      const name = snapshotNameOrError(req.params.snapshotName);
      const target = await getInventoryVmTarget(req.params.connectionId, req.params.nodeName, req.params.vmId, req, { requireEdit: true, requirePower: true });
      if (req.body?.confirm_guest_name !== target.vm.name) return res.status(409).json({error:'The guest name changed. Review the current guest before restoring.'});
      const snapshots = await requestProxmoxApi(target.connection, guestApiPath(target.vm, '/snapshot'));
      if (!Array.isArray(snapshots)) return res.status(502).json({error:'The current recovery points could not be verified.'});
      const snapshot = snapshots.find(item => item?.name === name);
      if (!snapshot) return res.status(409).json({error:'This snapshot is no longer available. Refresh the recovery points.'});
      if (req.body?.confirm_snaptime !== (snapshot.snaptime ?? null)) return res.status(409).json({error:'The recovery point changed. Refresh and select the snapshot again.'});
      const task = await requestProxmoxApi(target.connection, guestApiPath(target.vm, `/snapshot/${encodeURIComponent(name)}/rollback`), {method:'POST'});
      if (typeof task === 'string' && task.length > 0 && task.length <= 512) {
        db.db.prepare('INSERT OR IGNORE INTO proxmox_guest_tasks (connection_id, environment_id, endpoint, node_name, vm_id, task_id, action, resource_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .run(target.source.id, target.source.environment_id, target.source.endpoint, target.vm.node_name, target.vm.vm_id, task, 'snapshot_restore', name);
      }
      writeGuestAudit(target, req, 'infrastructure.snapshot_restore', `source=${target.source.name} vm=${target.vm.name} vm_id=${target.vm.vm_id} snapshot=${name}`);
      res.status(202).json({task});
    } catch (error) { res.status(error.status || 502).json({error:error.message || 'The snapshot could not be restored.'}); }
  });

  router.delete('/proxmox-connections/:connectionId/vms/:nodeName/:vmId/snapshots/:snapshotName', async (req, res) => {
    try {
      const name = snapshotNameOrError(req.params.snapshotName);
      const target = await getInventoryVmTarget(req.params.connectionId, req.params.nodeName, req.params.vmId, req, { requireEdit: true });
      const task = await requestProxmoxApi(target.connection, guestApiPath(target.vm, `/snapshot/${encodeURIComponent(name)}`), { method: 'DELETE' });
      if (typeof task === 'string' && task.length > 0 && task.length <= 512) {
        db.db.prepare('INSERT OR IGNORE INTO proxmox_guest_tasks (connection_id, environment_id, endpoint, node_name, vm_id, task_id, action, resource_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .run(target.source.id, target.source.environment_id, target.source.endpoint, target.vm.node_name, target.vm.vm_id, task, 'snapshot_delete', name);
      }
      writeGuestAudit(target, req, 'infrastructure.snapshot_delete', `source=${target.source.name} vm=${target.vm.name} vm_id=${target.vm.vm_id} snapshot=${name}`);
      res.status(202).json({ success: true, task, name });
    } catch (error) { res.status(error.status || 502).json({ error: error.message || 'The snapshot could not be deleted.' }); }
  });
  
  router.post('/proxmox-connections/:connectionId/vms/:nodeName/:vmId/power', async (req, res) => {
    const action = String(req.body?.action || '').trim().toLowerCase();
    if (!['start', 'shutdown', 'reboot', 'stop'].includes(action)) return res.status(400).json({ error: 'Invalid Proxmox action.' });
    try {
      const target = await getInventoryVmTarget(req.params.connectionId, req.params.nodeName, req.params.vmId, req, { requireEdit: true, requirePower: true });
      if (action === 'stop' && req.body?.confirm_guest_name !== target.vm.name) return res.status(409).json({error:'Force stop requires the current guest name. Refresh the inventory and confirm it again.'});
      const task = await requestProxmoxApi(target.connection, guestApiPath(target.vm, `/status/${action}`), { method: 'POST' });
      if (typeof task === 'string' && task.length > 0 && task.length <= 512) {
        db.db.prepare('INSERT OR IGNORE INTO proxmox_guest_tasks (connection_id, environment_id, endpoint, node_name, vm_id, task_id, action, resource_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .run(target.source.id, target.source.environment_id, target.source.endpoint, target.vm.node_name, target.vm.vm_id, task, `power_${action}`, target.vm.name);
      }
      writeGuestAudit(target, req, 'infrastructure.vm_power', `action=${action} source=${target.source.name} vm=${target.vm.name} vm_id=${target.vm.vm_id}`);
      res.status(202).json({ success: true, action, task });
    } catch (error) { res.status(error.status || 502).json({ error: error.message || 'The Proxmox action could not be started.' }); }
  });
  
  router.get('/proxmox-connections/:id/guest-ip', async (req, res) => {
    if (!can(getPermissions(req.user), 'canViewServers')) return res.status(403).json({ error: 'Permission denied' });
    try {
      const nodeName = String(req.query.node || '').trim();
      const vmId = guestId(req.query.vm_id);
      const target = await getInventoryVmTarget(req.params.id, nodeName, vmId, req);
      const records = await getGuestNetworkRecords(target.connection, target.vm);
      res.json({ ip_address: records[0]?.address || null, guest_type: target.vm.guest_type });
    } catch (error) { res.status(error.status || 502).json({ error: error.message || 'The VM or container IP could not be read.' }); }
  });
  
  // Synchronise guest addresses without making Proxmox the source of truth for
  // manual IPAM metadata. Existing manual addresses are deliberately left
  // untouched; only Shipyard's own Proxmox-sourced rows are refreshed.
  router.post('/proxmox-connections/:id/sync-ipam', async (req, res) => {
    if (!can(getPermissions(req.user), 'canEditServers')) return res.status(403).json({ error: 'Permission denied' });
    try {
      const subnetId = String(req.body?.subnet_id || '').trim();
      res.json(await syncProxmoxIpam(req.params.id, { subnetId: subnetId || null, ip: req.ip, actor: req.user?.username }));
    } catch (error) { res.status(error.status || 502).json({ error: error.message || 'Proxmox IPAM reconciliation failed.' }); }
  });
  
  router.post('/proxmox-connections/:id/import-vm', async (req, res) => {
    const permissions = getPermissions(req.user);
    if (!can(permissions, 'canEditServers')) return res.status(403).json({ error: 'Permission denied' });
    try {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const nodeName = String(body.node_name || '').trim();
      const vmId = guestId(body.vm_id);
      for (const field of ['node_name', 'name', 'ssh_user', 'ip_address', 'group_id']) {
        if (body[field] !== undefined && !(field === 'group_id' && body[field] === null) && typeof body[field] !== 'string') return res.status(400).json({field,error:`${field} must be text.`});
      }
      const name = (body.name || '').trim();
      const sshUser = body.ssh_user === undefined ? 'root' : body.ssh_user.trim();
      if (!name || name.length > 100) return res.status(400).json({field:'name',error:'Host name must contain 1 to 100 characters.'});
      if (!sshUser || sshUser.length > 100) return res.status(400).json({field:'ssh_user',error:'SSH user must contain 1 to 100 characters.'});
      const sshPort = parseSshPort(body.ssh_port);
      const groupId = String(body.group_id || '').trim() || null;
      if (!nodeName || !PROXMOX_IDENTIFIER_RE.test(nodeName) || !Number.isInteger(vmId) || vmId <= 0 || !name) return res.status(400).json({ error: 'Name, node, and VM or container ID are required.' });
      if (!Number.isInteger(sshPort) || sshPort < 1 || sshPort > 65535) return res.status(400).json({ error: 'Invalid SSH port.' });
      const target = await getInventoryVmTarget(req.params.id, nodeName, vmId, req, { requireEdit: true });
      const { source, connection } = target;
      let ipAddress = String(body.ip_address || '').trim();
      if (!ipAddress) {
        const records = await getGuestNetworkRecords(connection, target.vm);
        ipAddress = records[0]?.address || '';
      }
      if (!ipAddress || net.isIP(ipAddress) !== 4) return res.status(400).json({ error: `No usable IPv4 address was found. Enter one manually${target.vm.guest_type === 'qemu' ? ' or enable the QEMU Guest Agent' : ''}.` });
      const adopt = db.db.transaction(() => {
        const current = db.db.prepare('SELECT * FROM tofu_proxmox_connections WHERE id = ?').get(source.id);
        if (!current || ['environment_id', 'endpoint', 'api_token', 'insecure'].some(field => current[field] !== source[field])) {
          const error = new Error('The platform connection changed or was removed during discovery. Refresh the inventory and try again.'); error.status = 409; throw error;
        }
        if (groupId) {
          const group = db.db.prepare('SELECT environment_id FROM server_groups WHERE id = ?').get(groupId);
          if (!group || String(group.environment_id || 'default') !== String(current.environment_id || 'default')) {
            const error = new Error('The selected folder is no longer available in this environment. Choose a folder again.'); error.status = 409; throw error;
          }
        }
        if (db.db.prepare('SELECT 1 FROM proxmox_inventory_servers WHERE connection_id = ? AND node_name = ? AND vm_id = ?').get(current.id, nodeName, vmId)) {
          const error = new Error('This VM or container is already adopted as a host. Open the existing managed host instead.'); error.status = 409; throw error;
        }
        const existing = db.db.prepare('SELECT * FROM servers WHERE environment_id = ? AND (ip_address = ? OR name = ?)').get(current.environment_id, ipAddress, name);
        if (existing) { const error = new Error(`A host with this name or IP already exists (${existing.name}).`); error.status = 409; throw error; }
        const server = db.servers.create({ name, hostname: name, ip_address: ipAddress, ssh_port: sshPort, ssh_user: sshUser, environment_id: current.environment_id, tags: ['proxmox', target.vm.guest_type, `proxmox:${current.name}`] });
        if (groupId) db.serverGroups.setServerGroup(server.id, groupId);
        db.db.prepare('INSERT INTO proxmox_inventory_servers (server_id, connection_id, node_name, vm_id, guest_type) VALUES (?, ?, ?, ?, ?)').run(server.id, current.id, nodeName, vmId, target.vm.guest_type);
        writeGuestAudit({source:current, vm:target.vm}, req, 'infrastructure.vm_import', `source=${JSON.stringify(current.name)} type=${target.vm.guest_type} vm=${vmId} server=${JSON.stringify(server.name)}`);
        return server;
      });
      const server = adopt.immediate();
      res.status(201).json({ success: true, server: db.servers.getById(server.id) });
    } catch (error) {
      if (error.code === 'SQLITE_BUSY' || error.code === 'SQLITE_LOCKED') return res.status(409).json({ error: 'Inventory is being changed by another operation. Try again.' });
      res.status(error.status || 400).json({ error: error.message || 'The VM could not be adopted into Shipyard.' });
    }
  });
  
  
}

module.exports = { registerPlatformRoutes };
