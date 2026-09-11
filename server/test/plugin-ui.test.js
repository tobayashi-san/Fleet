'use strict';

const os = require('os');
const path = require('path');
const fs = require('fs');

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'lab_test_plugin_ui_'));
process.env.DB_PATH = path.join(tmpRoot, 'test.db');
process.env.JWT_SECRET = 'test-jwt-secret-plugin-ui';
process.env.NODE_ENV = 'test';
process.env.PLUGINS_DIR = path.join(tmpRoot, 'plugins');

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const bcrypt = require('bcryptjs');

const db = require('../db');
const { createApp } = require('../app');

fs.mkdirSync(process.env.PLUGINS_DIR, { recursive: true });

function writePlugin(id, files = {}) {
  const pluginDir = path.join(process.env.PLUGINS_DIR, id);
  fs.mkdirSync(pluginDir, { recursive: true });
  fs.writeFileSync(path.join(pluginDir, 'manifest.json'), JSON.stringify({ id, name: id }), 'utf8');
  for (const [name, content] of Object.entries(files)) {
    const filePath = path.join(pluginDir, name);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
  }
  require('../services/plugin-loader').loadAll({});
}

after(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

test('serves ui.js only from an enabled plugin directory', async () => {
  writePlugin('safe_plugin', { 'ui.js': 'window.safePluginLoaded = true;\n' });
  db.settings.set('plugin_safe_plugin_enabled', '1');

  const { app } = createApp();
  const res = await request(app).get('/plugins/safe_plugin/ui.js');

  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /application\/javascript/);
  assert.equal(res.text, 'window.safePluginLoaded = true;\n');
});

test('rejects invalid plugin UI path inputs', async () => {
  const { app } = createApp();
  const invalidPaths = [
    '/plugins/%2e%2e/ui.js',
    '/plugins/bad.plugin/ui.js',
    '/plugins/x%2fy/ui.js',
    '/plugins/x/y/ui.js',
  ];

  for (const url of invalidPaths) {
    const res = await request(app).get(url);
    assert.equal(res.status, 404);
  }
});

test('returns 404 when enabled plugin has no ui.js', async () => {
  writePlugin('no_ui');
  db.settings.set('plugin_no_ui_enabled', '1');

  const { app } = createApp();
  const res = await request(app).get('/plugins/no_ui/ui.js');

  assert.equal(res.status, 404);
  assert.match(res.text, /ui\.js not found/);
});

test('serves frontend assets imported by an enabled plugin ui module', async () => {
  writePlugin('asset_plugin', {
    'ui.js': 'import { ensureStyles } from "./src/styles.js";\n',
    'src/styles.js': 'export function ensureStyles() {}\n',
    'assets/icon.svg': '<svg xmlns="http://www.w3.org/2000/svg"></svg>\n',
  });
  db.settings.set('plugin_asset_plugin_enabled', '1');

  const { app } = createApp();
  const jsRes = await request(app).get('/plugins/asset_plugin/src/styles.js');
  const svgRes = await request(app).get('/plugins/asset_plugin/assets/icon.svg');

  assert.equal(jsRes.status, 200);
  assert.match(jsRes.headers['content-type'], /application\/javascript/);
  assert.equal(jsRes.text, 'export function ensureStyles() {}\n');
  assert.equal(svgRes.status, 200);
  assert.match(svgRes.headers['content-type'], /image\/svg\+xml/);
});

test('does not serve plugin frontend assets when plugin is disabled', async () => {
  writePlugin('disabled_assets', {
    'ui.js': 'import "./src/styles.js";\n',
    'src/styles.js': 'export const ok = true;\n',
  });

  const { app } = createApp();
  const res = await request(app).get('/plugins/disabled_assets/src/styles.js');

  assert.equal(res.status, 404);
  assert.match(res.headers['content-type'], /application\/javascript/);
  assert.match(res.text, /not found or not enabled/);
});

test('rejects private plugin files and unsafe asset paths', async () => {
  writePlugin('private_assets', {
    'ui.js': 'export function mount() {}\n',
    'index.js': 'module.exports = {};\n',
    'manifest.json': '{"id":"private_assets","name":"private_assets"}',
    'data/devices.js': 'export const secret = true;\n',
    'src/.hidden.js': 'export const hidden = true;\n',
  });
  db.settings.set('plugin_private_assets_enabled', '1');

  const { app } = createApp();
  const blockedPaths = [
    '/plugins/private_assets/index.js',
    '/plugins/private_assets/manifest.json',
    '/plugins/private_assets/data/devices.js',
    '/plugins/private_assets/src/.hidden.js',
    '/plugins/private_assets/src/../index.js',
  ];

  for (const url of blockedPaths) {
    const res = await request(app).get(url);
    assert.equal(res.status, 404);
    assert.match(res.headers['content-type'], /application\/javascript/);
  }
});

test('allows Font Awesome stylesheet and font CDN in CSP for plugin UIs', async () => {
  const { app } = createApp();
  const res = await request(app).get('/api/health');
  const csp = res.headers['content-security-policy'];

  assert.match(csp, /style-src[^;]*https:\/\/cdnjs\.cloudflare\.com/);
  assert.match(csp, /font-src[^;]*https:\/\/cdnjs\.cloudflare\.com/);
  assert.doesNotMatch(csp, /script-src[^;]*cdnjs\.cloudflare\.com/);
});

test('marks API responses as non-cacheable without changing static plugin asset caching', async () => {
  const { app } = createApp();
  const apiRes = await request(app).get('/api/health');
  assert.equal(apiRes.headers['cache-control'], 'no-store');
});

test('rejects JSON root values that are not objects before route handlers run', async () => {
  const { app } = createApp();
  const nullRes = await request(app)
    .post('/api/auth/login')
    .set('Content-Type', 'application/json')
    .send('null');
  assert.equal(nullRes.status, 400);
  assert.deepEqual(nullRes.body, { error: 'Invalid JSON body' });

  const arrayRes = await request(app)
    .post('/api/auth/login')
    .send([]);
  assert.equal(arrayRes.status, 400);
  assert.deepEqual(arrayRes.body, { error: 'JSON body must be an object' });
});

test('returns sanitized JSON when an enabled plugin API route throws', async () => {
  writePlugin('throwing_plugin', {
    'ui.js': 'export function mount() {}\n',
    'index.js': `
      function register({ router }) {
        router.get('/boom', () => {
          throw new Error('plugin secret path /tmp/private/devices.json');
        });
      }
      module.exports = { register };
    `,
  });
  db.settings.set('plugin_throwing_plugin_enabled', '1');
  const pluginLoader = require('../services/plugin-loader');
  pluginLoader.loadAll({});

  const { app } = createApp();
  const hash = await bcrypt.hash('pluginadminpass123', 12);
  db.users.create('pluginadmin', '', hash, 'admin');
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ username: 'pluginadmin', password: 'pluginadminpass123' });
  const res = await request(app)
    .get('/api/plugin/throwing_plugin/boom')
    .set('Authorization', `Bearer ${loginRes.body.token}`);

  assert.equal(res.status, 500);
  assert.match(res.headers['content-type'], /application\/json/);
  assert.deepEqual(res.body, { error: 'Internal server error' });
  assert.doesNotMatch(res.text, /private\/devices/);
});

test('plugin API requires role access to the enabled plugin', async () => {
  writePlugin('permission_plugin', {
    'ui.js': 'export function mount() {}\n',
    'index.js': `
      function register({ router }) {
        router.get('/ok', (_req, res) => res.json({ ok: true }));
      }
      module.exports = { register };
    `,
  });
  db.settings.set('plugin_permission_plugin_enabled', '1');
  const pluginLoader = require('../services/plugin-loader');
  pluginLoader.loadAll({});

  const { app } = createApp();
  db.db.prepare("INSERT OR IGNORE INTO server_groups (id, environment_id, name) VALUES ('plugin-api-default', 'default', 'Plugin API')").run();
  const limitedRole = db.roles.create('plugin-api-limited', {
    plugins: [],
    servers: { groups: ['plugin-api-default'], servers: [] },
    canViewServers: true,
  });
  const limitedHash = await bcrypt.hash('pluginlimitedpass123', 12);
  db.users.create('pluginlimited', '', limitedHash, limitedRole.id);
  const limitedLogin = await request(app)
    .post('/api/auth/login')
    .send({ username: 'pluginlimited', password: 'pluginlimitedpass123' });

  const forbidden = await request(app)
    .get('/api/plugin/permission_plugin/ok')
    .set('Authorization', `Bearer ${limitedLogin.body.token}`);
  assert.equal(forbidden.status, 403);

  const adminHash = await bcrypt.hash('pluginadminpass456', 12);
  db.users.create('pluginapiadmin', '', adminHash, 'admin');
  const adminLogin = await request(app)
    .post('/api/auth/login')
    .send({ username: 'pluginapiadmin', password: 'pluginadminpass456' });

  const allowed = await request(app)
    .get('/api/plugin/permission_plugin/ok')
    .set('Authorization', `Bearer ${adminLogin.body.token}`);
  assert.equal(allowed.status, 200);
  assert.deepEqual(allowed.body, { ok: true });
});
test('enabled but rejected packages cannot publish their frontend entry or assets',async()=>{
 writePlugin('blocked_ui',{'ui.js':'export const blocked=true;','assets/app.js':'export const blocked=true;','index.js':"throw new Error('Rejected package');"});
 db.settings.set('plugin_blocked_ui_enabled','1');const {app}=createApp();
 assert.equal((await request(app).get('/plugins/blocked_ui/ui.js')).status,404);
 assert.equal((await request(app).get('/plugins/blocked_ui/assets/app.js')).status,404);
});
test('symlink substitutions after load cannot expose private files through frontend paths',async()=>{
 writePlugin('linked_ui',{'ui.js':'export const ok=true;','assets/app.js':'export const ok=true;','private/secret.js':'PRIVATE_FIXTURE_CONTENT'});
 db.settings.set('plugin_linked_ui_enabled','1');const {app}=createApp();const dir=path.join(process.env.PLUGINS_DIR,'linked_ui');
 fs.unlinkSync(path.join(dir,'assets/app.js'));fs.symlinkSync(path.join(dir,'private/secret.js'),path.join(dir,'assets/app.js'));
 assert.equal((await request(app).get('/plugins/linked_ui/assets/app.js')).status,404);
 fs.rmSync(path.join(dir,'assets'),{recursive:true});fs.symlinkSync(path.join(dir,'private'),path.join(dir,'assets'));
 assert.equal((await request(app).get('/plugins/linked_ui/assets/secret.js')).status,404);
 fs.unlinkSync(path.join(dir,'ui.js'));fs.symlinkSync(path.join(dir,'private/secret.js'),path.join(dir,'ui.js'));
 assert.equal((await request(app).get('/plugins/linked_ui/ui.js')).status,404);
});
test('inventory derives UI availability from the loaded files rather than a manifest claim',()=>{
 writePlugin('backend_only',{'manifest.json':JSON.stringify({id:'backend_only',name:'Backend only',hasUi:true})});
 writePlugin('frontend_only',{'manifest.json':JSON.stringify({id:'frontend_only',name:'Frontend only',hasUi:false}),'ui.js':'export function mount(){}'});
 const list=require('../services/plugin-loader').list();
 assert.equal(list.find(plugin=>plugin.id==='backend_only').hasUi,false);
 assert.equal(list.find(plugin=>plugin.id==='frontend_only').hasUi,true);
});
test('invalid display metadata is rejected before plugin registration and remains readable in inventory',()=>{
 const invalid=[{name:{unexpected:true}},{version:7},{description:[]},{sidebar:{label:{unexpected:true}}},{sidebar:'wrong'}];
 for(const [index,fields] of invalid.entries()){
  const id=`bad_metadata_${index}`;
  writePlugin(id,{'manifest.json':JSON.stringify({id,name:'Valid name',...fields}),'index.js':"global.__badMetadataExecuted=true;"});
  const row=require('../services/plugin-loader').list().find(plugin=>plugin.id===id);
  assert.equal(row.loaded,false);assert.equal(row.hasUi,false);assert.equal(typeof row.name,'string');assert.match(row.error,/manifest\./);
 }
 assert.equal(global.__badMetadataExecuted,undefined);
});
