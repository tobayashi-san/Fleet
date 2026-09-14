const {pluginCompatibility}=require('../utils/plugin-compatibility');
const fs   = require('fs');
const path = require('path');
const {pluginDigest,scheme:digestScheme}=require('../utils/plugin-digest');
const log  = require('../utils/logger').child('plugins');

const PLUGINS_DIR  = process.env.PLUGINS_DIR || path.resolve(__dirname, '../../plugins');
const PLUGIN_ID_RE = /^[a-z0-9][a-z0-9_-]*$/;
const PUBLIC_UI_DIRS = new Set(['assets', 'dist', 'public', 'src']);
const PUBLIC_UI_EXTENSIONS = new Set([
  '.css',
  '.gif',
  '.ico',
  '.jpeg',
  '.jpg',
  '.js',
  '.mjs',
  '.png',
  '.svg',
  '.ttf',
  '.wasm',
  '.webp',
  '.woff',
  '.woff2',
]);
const PRIVATE_UI_FILES = new Set([
  'index.js',
  'manifest.json',
  'package.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
]);
const PRIVATE_UI_DIRS = new Set([
  'data',
  'node_modules',
  'private',
  'secrets',
  'server',
  'storage',
]);

// Operators often keep an on-disk copy while upgrading a plugin. These are
// not plugins and should neither produce startup warnings nor appear as a
// broken plugin in the console.
function isIgnoredPluginDirectory(name) {
  // OpenTofu is a reserved core feature registered from server/routes/opentofu.js.
  // Ignore an on-disk copy left behind by installations that predate the move
  // from plugins/ to server/features/.
  return name === 'opentofu' || name.startsWith('.') || /(?:^|\.)bak(?:\.|$)/i.test(name) || /(?:^|[-_.])backup(?:[-_.]|$)/i.test(name);
}

const _loaded = new Map(); // id -> { manifest, router }
const _failed = new Map(); // id -> error message (plugins that loaded their manifest but threw during register)
let _helpers  = null;

// Plugins execute inside the Shipyard process and must therefore be treated as
// trusted server-side code. Operators can opt into an allowlist by setting
// SHIPYARD_PLUGIN_TRUST_POLICY=enforce and providing id:sha256 pairs in
// SHIPYARD_TRUSTED_PLUGIN_SHA256. "warn" is the production default to keep
// existing installations compatible while exposing the verification state.
const TRUST_POLICY = ['off', 'warn', 'enforce'].includes(process.env.SHIPYARD_PLUGIN_TRUST_POLICY)
  ? process.env.SHIPYARD_PLUGIN_TRUST_POLICY
  : (process.env.NODE_ENV === 'production' ? 'warn' : 'off');

function trustedPluginDigests() {
  const trusted = new Map();
  for (const raw of (process.env.SHIPYARD_TRUSTED_PLUGIN_SHA256 || '').split(',')) {
    const [id, digest] = raw.trim().split(':');
    if (PLUGIN_ID_RE.test(id || '') && /^[a-f0-9]{64}$/i.test(digest || '')) trusted.set(id, digest.toLowerCase());
  }
  return trusted;
}

function pluginTrust(id, digest) {
  const expected = trustedPluginDigests().get(id);
  return { digest, scheme:digestScheme, scope:'All regular package files, including dependencies', trusted: Boolean(expected && expected === digest), policy: TRUST_POLICY };
}

// ── DB helpers ──────────────────────────────────────────────────────────────

function _db()          { return require('../db'); }
function isEnabled(id)  { if (!PLUGIN_ID_RE.test(id)) return false; return _db().settings.get(`plugin_${id}_enabled`) === '1'; }

function setEnabled(id, enabled) {
  if (!_loaded.has(id) || (enabled && _failed.has(id))) throw new Error(`Plugin '${id}' is not loaded`);
  _db().settings.set(`plugin_${id}_enabled`, enabled ? '1' : '0');
}

function validateEnableReview(id,review) {
  const loaded=_loaded.get(id);
  if(!loaded || _failed.has(id))throw Object.assign(new Error(`Plugin '${id}' is not loaded`),{status:404});
  const fail=(message,status)=>{throw Object.assign(new Error(message),{status,field:'plugin_review'});};
  if(!review || typeof review.digest!=='string' || typeof review.scheme!=='string')fail('Reload plugin inventory and review this package before enabling access.',428);
  if(review.scheme!==digestScheme || review.digest!==loaded.trust.digest)fail('The loaded package changed. Reload inventory and review it again.',409);
  const current=pluginDigest(path.join(PLUGINS_DIR,id));
  if(current!==loaded.trust.digest)fail('Package files changed since loading. Reload and review the package before enabling access.',409);
  if(TRUST_POLICY==='enforce' && !pluginTrust(id,current).trusted)fail('The package no longer matches the configured approval allowlist.',409);
  return loaded.trust;
}

// ── Manifest ────────────────────────────────────────────────────────────────

function _readManifest(pluginDir) {
  const manifestPath = path.join(pluginDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) throw new Error('manifest.json not found');
  let m;
  try { m = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); }
  catch (e) { throw new Error(`manifest.json parse error: ${e.message}`); }
  if (!m || typeof m!=='object' || Array.isArray(m))throw new Error('manifest.json must contain an object');
  if (typeof m.id!=='string' || !m.id || m.id.length>100 || !PLUGIN_ID_RE.test(m.id)) throw new Error('manifest.id is missing or invalid (must be lowercase a-z, 0-9, - or _)');
  if (m.id !== path.basename(pluginDir))  throw new Error(`manifest.id "${m.id}" must match the directory name "${path.basename(pluginDir)}"`);
  if (typeof m.name!=='string' || !m.name.trim() || m.name.length>200) throw new Error('manifest.name must be nonempty text of at most 200 characters');
  for(const [field,max] of [['version',100],['description',4000],['author',200]]) {
    if(m[field]!==undefined && (typeof m[field]!=='string' || m[field].length>max))throw new Error(`manifest.${field} must be text of at most ${max} characters`);
  }
  if(m.sidebar!==undefined) {
    if(!m.sidebar || typeof m.sidebar!=='object' || Array.isArray(m.sidebar))throw new Error('manifest.sidebar must be an object');
    for(const field of ['label','icon'])if(m.sidebar[field]!==undefined && (typeof m.sidebar[field]!=='string' || m.sidebar[field].length>200))throw new Error(`manifest.sidebar.${field} must be text of at most 200 characters`);
  }
  return m;
}

// Evict all CommonJS modules owned by this package, not only index.js.
// Canonical paths handle a configured plugins root reached through a symlink.
function clearPluginModules(pluginDir) {
  const root=fs.realpathSync(pluginDir);
  const prefix=root+path.sep;
  const removed=new Set();
  for(const [filename,module] of Object.entries(require.cache)) {
    if(filename.startsWith(prefix)) { removed.add(module);delete require.cache[filename]; }
  }
  // Long-lived server modules must not retain old package module trees.
  for(const module of Object.values(require.cache)) {
    if(module?.children)module.children=module.children.filter(child=>!removed.has(child));
  }
}

// ── Loader ──────────────────────────────────────────────────────────────────

function _loadOne(pluginDir) {
  const manifest = _readManifest(pluginDir);
  const { id }   = manifest;
  const compatibility=pluginCompatibility(manifest);
  if(compatibility.status==='invalid')throw new Error(compatibility.error);
  if(compatibility.status==='incompatible')throw new Error('Runtime requirements not met: '+compatibility.requirements.filter(item=>!item.matches).map(item=>`${item.name} ${item.current} does not satisfy ${item.range}`).join('; '));
  const trust = pluginTrust(id, pluginDigest(pluginDir));
  if (TRUST_POLICY === 'enforce' && !trust.trusted) {
    throw new Error(`Plugin '${id}' is not trusted by SHIPYARD_TRUSTED_PLUGIN_SHA256`);
  }
  if (TRUST_POLICY === 'warn' && !trust.trusted) {
    log.warn({ plugin: id, digest: trust.digest }, 'Loaded untrusted plugin; configure a digest allowlist before enabling strict plugin trust');
  }

  const express        = require('express');
  const authMiddleware = require('../middleware/auth');
  const { pluginApiLimiter } = require('../utils/rate-limiters');
  const pluginRouter   = express.Router();
  pluginRouter.use(pluginApiLimiter);
  pluginRouter.use(authMiddleware);

  const indexPath = path.join(pluginDir, 'index.js');
  clearPluginModules(pluginDir);
  if (fs.existsSync(indexPath)) {
    const mod = require(indexPath);
    if (typeof mod.register === 'function') {
      mod.register({ ..._helpers, router: pluginRouter, pluginId: id, pluginDir });
    }
  }

  _loaded.set(id, { manifest, router: pluginRouter, trust, compatibility });
  return manifest;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Called once at server startup with the shared helper context.
 * helpers = { db, broadcast, sshManager, ansibleRunner, scheduler }
 */
function loadAll(helpers) {
  _helpers = helpers;
  if (!fs.existsSync(PLUGINS_DIR)) return;
  for (const entry of fs.readdirSync(PLUGINS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory() || isIgnoredPluginDirectory(entry.name)) continue;
    const pluginDir = path.join(PLUGINS_DIR, entry.name);
    try {
      _loadOne(pluginDir);
      _failed.delete(entry.name);
      log.info({ plugin: entry.name }, 'Loaded plugin');
    } catch (e) {
      _failed.set(entry.name, e.message || String(e));
      log.warn({ err: e, plugin: entry.name }, 'Failed to load plugin');
    }
  }
}

/**
 * Reload a single plugin from disk (hot-reload without restart).
 */
function reload(id) {
  if (!_helpers) throw new Error('Plugin loader not initialized');
  if (!PLUGIN_ID_RE.test(id)) throw new Error(`Invalid plugin ID: ${id}`);
  const pluginDir = path.join(PLUGINS_DIR, id);
  if (!fs.existsSync(pluginDir)) throw new Error(`Plugin directory not found: ${id}`);
  try {
    _loadOne(pluginDir);
    _failed.delete(id);
  } catch (e) {
    _failed.set(id, e.message || String(e));
    throw e;
  }
}

/**
 * Reload all plugins (scans directory again for new ones too).
 */
function reloadAll() {
  if (!_helpers) throw new Error('Plugin loader not initialized');
  _loaded.clear();
  _failed.clear();
  loadAll(_helpers);
}

/**
 * Returns an array of all known plugins (loaded + failed to load).
 */
function list() {
  const result = [];
  const seen   = new Set();

  for (const [id, { manifest, trust, compatibility }] of _loaded) {
    let packageStatus;
    try {
      const installed = _readManifest(path.join(PLUGINS_DIR, id));
      const installedVersion = installed.version || null, loadedVersion = manifest.version || null;
      packageStatus = {installedVersion, loadedVersion, state: !installedVersion || !loadedVersion ? 'version-unavailable' : installedVersion !== loadedVersion ? 'reload-required' : 'same-version', checkedAt: Date.now(), rollback: 'manual'};
    } catch {
      packageStatus = {installedVersion: null, loadedVersion: manifest.version || null, state: 'unreadable', checkedAt: Date.now(), rollback: 'manual'};
    }
    result.push({ ...manifest, packageStatus, enabled: !_failed.has(id) && isEnabled(id), loaded: !_failed.has(id), hasUi:!!getUiRoot(id), trust, compatibility, ...(_failed.has(id) ? {error:_failed.get(id)} : {}) });
    seen.add(id);
  }

  // Also include directories that failed to load (broken plugins)
  if (fs.existsSync(PLUGINS_DIR)) {
    for (const entry of fs.readdirSync(PLUGINS_DIR, { withFileTypes: true })) {
      if (!entry.isDirectory() || isIgnoredPluginDirectory(entry.name) || seen.has(entry.name)) continue;
      const pluginDir = path.join(PLUGINS_DIR, entry.name);
      const loadError = _failed.get(entry.name) || null;
      try {
        const manifest = _readManifest(pluginDir);
        result.push({ ...manifest, enabled: false, loaded: false, hasUi:false, compatibility: pluginCompatibility(manifest), error: loadError || 'Plugin not loaded' });
      } catch (e) {
        result.push({ id: entry.name, name: entry.name, enabled: false, loaded: false, hasUi:false, error: loadError || e.message });
      }
    }
  }

  return result.sort((a, b) => (a.id || '').localeCompare(b.id || ''));
}

/**
 * Returns the Express router for a plugin (only if the plugin is enabled).
 */
function getRouter(id) {
  if (!isEnabled(id) || _failed.has(id)) return null;
  return _loaded.get(id)?.router || null;
}

/**
 * Returns the safe root directory for a plugin's ui.js, or null if not found.
 */
function getUiRoot(id) {
  if (!PLUGIN_ID_RE.test(id) || !_loaded.has(id) || _failed.has(id)) return null;
  const pluginsRoot = path.resolve(PLUGINS_DIR);
  const pluginDir = path.resolve(pluginsRoot, id);
  if (!pluginDir.startsWith(`${pluginsRoot}${path.sep}`)) return null;
  const uiPath = path.join(pluginDir, 'ui.js');
  try {
    if (!fs.lstatSync(pluginDir).isDirectory() || !fs.lstatSync(uiPath).isFile()) return null;
  } catch {
    return null;
  }
  return pluginDir;
}

/**
 * Resolves a frontend asset imported by ui.js.
 *
 * Public plugin UI files may live at the plugin root or below src/, assets/,
 * public/, or dist/. Backend and metadata files stay private.
 */
function getUiAsset(id, requestPath) {
  const uiRoot = getUiRoot(id);
  if (!uiRoot || typeof requestPath !== 'string') return null;
  if (requestPath.includes('\0') || requestPath.includes('\\')) return null;

  const normalized = path.posix.normalize(requestPath.replace(/^\/+/, ''));
  if (!normalized || normalized === '.' || normalized.startsWith('../') || normalized.includes('/../')) return null;

  const parts = normalized.split('/');
  if (parts.some(part => !part || part === '.' || part === '..' || part.startsWith('.'))) return null;
  if (parts.some(part => PRIVATE_UI_DIRS.has(part))) return null;

  const ext = path.extname(normalized).toLowerCase();
  if (!PUBLIC_UI_EXTENSIONS.has(ext)) return null;

  const rootFile = parts.length === 1;
  if (rootFile && PRIVATE_UI_FILES.has(parts[0].toLowerCase())) return null;
  if (!rootFile && !PUBLIC_UI_DIRS.has(parts[0])) return null;

  const filePath = path.resolve(uiRoot, ...parts);
  if (!filePath.startsWith(`${uiRoot}${path.sep}`)) return null;
  try {
    let current=uiRoot;
    for(let index=0;index<parts.length;index++){
      current=path.join(current,parts[index]);
      const info=fs.lstatSync(current);
      if(index===parts.length-1 ? !info.isFile() : !info.isDirectory())return null;
    }
  } catch {
    return null;
  }
  return { root: uiRoot, file: normalized, ext };
}

module.exports = {
  loadAll,
  reload,
  reloadAll,
  list,
  isEnabled,
  setEnabled,
  validateEnableReview,
  getRouter,
  getUiRoot,
  getUiAsset,
  PLUGINS_DIR,
};
