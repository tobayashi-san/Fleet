const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'update-dashboard-'));
process.env.DB_PATH = path.join(root, 'test.db');
process.env.NODE_ENV = 'test';
const db = require('../db');
const express = require('express');
const request = require('supertest');
const app = express();
app.use((req, res, next) => { req.environmentId = req.headers['x-environment'] || 'default'; req.user = { role: req.headers['x-role'] || 'admin', username: 'tester' }; next(); });
app.use('/servers', require('../routes/servers'));
after(() => { db.db.close(); fs.rmSync(root, { recursive: true, force: true }); });
const first = db.servers.create({ name: 'updates-host', hostname: 'updates-host', ip_address: '192.0.2.1', docker_enabled: true });
db.db.prepare('UPDATE servers SET docker_enabled=1 WHERE id=?').run(first.id);
const second = db.servers.create({ name: 'unknown-host', hostname: 'unknown-host', ip_address: '192.0.2.2' });
db.db.prepare('INSERT INTO environments(id,name) VALUES (?,?)').run('stage', 'Stage');
const stage = db.servers.create({ name: 'stage-host', hostname: 'stage-host', ip_address: '192.0.2.3', environment_id: 'stage' });

test('dashboard returns cached catalogs, freshness and failed checks without host credentials', async () => {
  db.updatesCache.set(first.id, [{ package: 'openssl', version: '2' }, { package: 'phased', phased: true }]);
  db.dockerImageUpdatesCache.set(first.id, [{ container_name: 'web', image: 'nginx:latest', status: 'update_available' }]);
  db.checkAttempts.failed(first.id, 'images', 'Registry unavailable');
  const response = await request(app).get('/servers/update-dashboard');
  assert.equal(response.status, 200);
  assert.equal(response.body.length, 2);
  const row = response.body.find(item => item.id === first.id);
  assert.equal(row.system.updates[0].package, 'openssl');
  assert.equal(row.system.stale, false);
  assert.equal(row.docker.updates[0].container_name, 'web');
  assert.equal(row.docker.failure.reason, 'Registry unavailable');
  assert.equal('ssh_password' in row, false);
  const unknown = response.body.find(item => item.id === second.id);
  assert.equal(unknown.system.checked_at, null);
  assert.equal(unknown.system.stale, true);
  db.db.prepare("UPDATE server_updates_cache SET updated_at='2000-01-01' WHERE server_id=?").run(first.id);
  assert.equal((await request(app).get('/servers/update-dashboard')).body.find(item => item.id === first.id).system.stale, true);
});

test('dashboard enforces update capability, host scope, environment and Docker visibility', async () => {
  const reader = db.roles.create('System reader', { canViewServers: true, canViewUpdates: true, canViewDocker: false, servers: { servers: [first.id], groups: [] } });
  const response = await request(app).get('/servers/update-dashboard').set('x-role', reader.id);
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.map(item => item.id), [first.id]);
  assert.equal('docker' in response.body[0], false);
  assert.deepEqual((await request(app).get('/servers/update-dashboard').set('x-environment', 'stage')).body.map(item => item.id), [stage.id]);
  const denied = db.roles.create('Host reader', { canViewServers: true, canViewUpdates: false, servers: 'all' });
  assert.equal((await request(app).get('/servers/update-dashboard').set('x-role', denied.id)).status, 403);
});

test('host inventory exposes imported and managed VM IDs without live Proxmox requests', async () => {
  require('../features/opentofu/schema').setupOpenTofuDatabase(db.db);
  db.db.prepare('INSERT INTO proxmox_inventory_servers(server_id,connection_id,node_name,vm_id) VALUES (?,?,?,?)').run(first.id, 'source', 'pve', 123);
  db.db.prepare('INSERT INTO tofu_proxmox_vms(id,workspace_id,name,config,vm_numeric_id) VALUES (?,?,?,?,?)').run('vm', 'workspace', 'managed', JSON.stringify({ vm_id: 456 }), 456);
  db.db.prepare('INSERT INTO tofu_managed_servers(workspace_id,resource_key,server_id) VALUES (?,?,?)').run('workspace', 'resource:proxmox_virtual_environment_vm.managed', second.id);
  const response = await request(app).get('/servers');
  assert.equal(response.status, 200);
  assert.equal(response.body.find(item => item.id === first.id).proxmox_vm_id, 123);
  assert.equal(response.body.find(item => item.id === second.id).proxmox_vm_id, 456);
});
