# Shipyard Plugin Template

Starting point for building Shipyard plugins. Copy this directory, rename it to your plugin's ID, implement `index.js` and/or `ui.js`, and drop it into `/app/plugins/`.

Plugins can add backend routes, mount a frontend UI inside the Shipyard app, or both. Backend plugin code runs inside the Shipyard server process, so treat every plugin as trusted code.

## Directory Structure

```
my-plugin/
├── manifest.json   ← required: plugin metadata
├── index.js        ← optional: backend (Node.js / Express routes)
├── ui.js           ← optional: frontend entry point (ES Module)
├── src/            ← optional: frontend modules imported by ui.js
├── assets/         ← optional: frontend images/fonts/icons
├── public/         ← optional: frontend static assets
└── dist/           ← optional: bundled frontend output
```

## Getting Started

1. Copy this directory and rename it to your plugin's ID (e.g. `my-plugin`).
2. Edit `manifest.json` — set `id` to match the directory name exactly.
3. Implement `index.js` and/or `ui.js` (see sections below).
4. Place the directory in `/app/plugins/my-plugin/`.
5. Go to **Settings → Plugins**, click **Reload**, then enable your plugin.

**Docker:** mount your plugin directory into the container via `docker-compose.yml`:

```yaml
# docker-compose.yml
services:
  shipyard:
    volumes:
      - ./my-plugin:/app/plugins/my-plugin
```

## manifest.json

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "Short description shown in Settings → Plugins.",
  "author": "Your Name",
  "sidebar": {
    "icon": "fas fa-cube",
    "label": "My Plugin"
  }
}
```

| Field | Required | Notes |
|---|---|---|
| `id` | yes | Must match the directory name. Lowercase, `a-z 0-9 - _` only. |
| `name` | yes | Display name shown in the UI. |
| `version` | yes | Semver string. |
| `description` | yes | Shown in Settings → Plugins. |
| `author` | no | |
| `sidebar` | no | Adds a link to the sidebar. `icon` accepts common Font Awesome-style names; unknown values fall back to a puzzle icon. |

Currently recognized sidebar icon hints include `fa-cube`, `fa-terminal`, `fa-server`, `fa-shield`, `fa-cubes`, `fa-network`, `fa-anchor`, and `fa-ship`.

## index.js — Backend

```js
function register({ router, db, broadcast, sshManager, ansibleRunner, scheduler, pluginId, pluginDir }) {
  // Routes are mounted at /api/plugin/<id>/
  // JWT auth middleware is already applied — only authenticated requests reach here.

  router.get('/status', (req, res) => {
    res.json({ ok: true, pluginId });
  });

  router.post('/run', async (req, res) => {
    const servers = db.servers.getAll();
    res.json({ started: true });

    // Stream output to all connected browser clients
    broadcast({ type: 'my_plugin_output', data: `Running on ${servers.length} server(s)` });
  });
}

module.exports = { register };
```

### Injected helpers

| Helper | Type | Description |
|---|---|---|
| `router` | Express Router | Mounted at `/api/plugin/<id>/`, JWT-protected. |
| `db` | Object | Shipyard DB — `db.servers.getAll()`, `db.settings.get(key)`, `db.auditLog.write(...)`, etc. |
| `broadcast` | `(data) => void` | Send a WebSocket message to all connected browser clients. |
| `sshManager` | Object | SSH helpers — see table below. |
| `ansibleRunner` | Object | `runPlaybook(name, targets, vars, onOutput)`, `runAdHoc(targets, module, args, onOutput)` |
| `scheduler` | Object | Background polling scheduler. |
| `pluginId` | string | This plugin's ID as declared in `manifest.json`. |
| `pluginDir` | string | Absolute path to this plugin's directory inside the container. |

#### sshManager helpers

| Method | Description |
|---|---|
| `execCommand(server, cmd)` | Run a command via SSH, returns `{ stdout, stderr, code }`. |
| `execStream(server, cmd, onChunk)` | Run a command and stream stdout chunks; returns exit code. |
| `getPrivateKey()` | Returns the decrypted private key string (for use with ssh2 directly). |
| `testConnection(server)` | Returns `true` if the server is reachable via SSH. |

## ui.js — Frontend

```js
let _wsUnsub = null;

export async function mount(container, { api, pluginApi, state, navigate, showToast, showConfirm, onWsMessage }) {
  container.textContent = 'Loading...';

  // Call your plugin's own backend routes
  const status = await pluginApi.request('/status');

  // Call any Shipyard core API
  const servers = await api.getServers();

  container.innerHTML = `
    <div>
      <h2>Hello from my-plugin!</h2>
      <p>${servers.length} server(s)</p>
    </div>
  `;

  // Subscribe to WebSocket messages (auto-unsubscribed on unmount)
  _wsUnsub = onWsMessage(msg => {
    if (msg.type === 'my_plugin_output') showToast(msg.data, 'info');
  });
}

export function unmount() {
  // Always clean up subscriptions
  if (_wsUnsub) { _wsUnsub(); _wsUnsub = null; }
}
```

### Frontend imports and assets

`ui.js` may import frontend files relative to the plugin directory:

```js
import { ensureStyles } from './src/styles.js';
import './assets/plugin.css';
```

Shipyard serves imported frontend assets only for enabled plugins. Supported public paths are root-level frontend modules and files below `src/`, `assets/`, `public/`, or `dist/`. Supported file types are `.js`, `.mjs`, `.css`, `.svg`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.ico`, `.woff`, `.woff2`, `.ttf`, and `.wasm`.

Backend/private files are not served as plugin UI assets. Keep secrets and runtime data out of frontend folders. Root files such as `index.js`, `manifest.json`, package files, hidden files, `node_modules/`, `data/`, `private/`, `secrets/`, `server/`, and `storage/` stay private.

### Injected helpers

| Helper | Description |
|---|---|
| `api` | Full Shipyard API client (`api.getServers()`, `api.getServer(id)`, etc.) |
| `pluginApi` | Namespaced client — `pluginApi.request('/path')` calls `/api/plugin/<id>/path` |
| `state` | Global app state: `state.servers`, `state.plugins`, `state.whiteLabel` |
| `navigate` | Navigate within Shipyard. Prefer core routes such as `/`, `/servers`, `/playbooks`, and `/settings`. |
| `showToast` | `(message, type)` — show a toast. `type`: `'info'` \| `'success'` \| `'warning'` \| `'error'` |
| `showConfirm` | `(message, opts) => Promise<boolean>` — show a confirmation dialog |
| `onWsMessage` | `(callback) => unsubscribeFn` — listen to WebSocket messages from the backend |

### Sending WebSocket messages to the frontend

Call `broadcast(data)` from your backend. `data` must be a plain object. The `type` field identifies the message:

```js
// index.js
broadcast({ type: 'my_plugin_done', result: 'success' });

// ui.js
_wsUnsub = onWsMessage(msg => {
  if (msg.type === 'my_plugin_done') showToast('Done!', 'success');
});
```

## Security

Plugins run as **Node.js code on the server** with full access to the file system, SSH connections, the Shipyard database, and the network.

- Only install plugins from sources you trust completely.
- Shipyard shows a security warning dialog when you enable a plugin for the first time.
- Plugin routes inherit Shipyard's JWT auth middleware — unauthenticated requests are rejected before reaching plugin code.

## Runtime compatibility

A manifest may declare `engines.node` and `engines.shipyard` using semantic-version ranges:

```json
{
  "engines": {
    "node": ">=22 <25",
    "shipyard": ">=3.0.8-rc.26 <4"
  }
}
```

Choose ranges you have actually tested; the example is not a compatibility promise for your plugin. The loader checks declared ranges before requiring backend code. A mismatch or invalid declaration blocks loading and appears in Plugin Management. Missing declarations remain supported for existing packages but are displayed as unverified, not compatible.

Prereleases follow standard semantic-version range rules. A broad stable range such as `^3.0.0` does not include `3.0.8-rc.26`; explicitly include the relevant prerelease when supporting it. Runtime checks cover version declarations only, not workflow behavior, dependencies, privileges or package trust. Changing manifest requirements changes the package digest, so an enforced digest allowlist must be reviewed and updated as part of the package change.

## Reload behavior

Reload clears CommonJS modules and JSON imports within the plugin's canonical directory before registering the new package. Modules in other plugin directories or shared server dependencies stay cached. This avoids mixing a new entry point with old helper modules. Loaded-module references held by the Node module cache are removed; active requests or resources held by plugin code can still reference old objects.

This does not unload timers, listeners, connections or other side effects created by a plugin. It also does not clear Node's separate dynamic ESM import cache or provide package rollback. Plugins using persistent resources or dynamic imports require a controlled service restart to guarantee replacement of that state. Registration success alone is not proof that an update is safe or fully verified.

## Package digest scope (v2)

The `package-files-v2` SHA-256 digest covers every regular file in the plugin directory, including `node_modules` and `.bundle-version`. It hashes an unambiguous, sorted list of relative paths and individual file hashes. Symbolic links and special files are rejected; use a self-contained package with regular files. File reads reject final-component symlinks and detect changes in size/timestamps during each read.

This replaces the earlier digest that excluded dependencies and installation metadata. Existing `SHIPYARD_TRUSTED_PLUGIN_SHA256` entries must be regenerated after reviewing the complete installed package; strict enforcement will block the old digest. Dependency changes require renewed review. The digest is a load-time snapshot, not a signature, continuous file monitor, immutable execution snapshot or sandbox. Stop concurrent package writes while loading. Runtime data written into the package directory changes its next digest; keep mutable application data outside the package.

Inspect a package without executing its code:

```sh
node server/cli/plugin-digest.js /absolute/path/to/plugin
```

Compare the reviewed package and reported scheme/digest before putting `plugin-id:digest` in the allowlist. The command only computes a digest; it does not approve or load the package.

Frontend entry points and assets are served only for successfully loaded packages. A failed single-package reload blocks API/UI access until a successful retry, even if access was enabled previously. Files and intermediate directories used for frontend assets must be regular files/directories, not symlinks. These request-time checks do not replace a read-only deployment: do not modify package files concurrently with serving requests.

Enabling access through `POST /api/plugins/:id/enable` requires the `digest` and `scheme` from the reviewed inventory entry. Missing review metadata returns 428; a stale loaded digest, changed on-disk package or removed strict allowlist match returns 409. Reload the package and review the updated inventory before retrying. Successful activation audits the reviewed digest. Disabling access requires no digest. This check binds the activation decision to a package snapshot; it is not continuous integrity monitoring.

Display metadata is validated before registration. `name` must be nonempty text (maximum 200 characters); optional `version`, `description` and `author` must be text with limits of 100, 4,000 and 200 characters. Optional `sidebar` must be an object with text `label`/`icon` values of at most 200 characters. Malformed metadata remains visible as a load error rather than reaching UI rendering. The inventory's `hasUi` field is computed from the loaded package's regular `ui.js` file; a manifest cannot override it. Backend-only packages have no navigation or Open action.

## UI lifecycle

The UI context includes `signal`, an AbortSignal triggered when the host page is left or initialization fails. Use it for fetches and other cancellable work. Subscriptions registered through `ctx.onWsMessage` are also removed by the host; late registration after disposal is ignored.

Each mount receives its own container, detached on navigation. If an asynchronous mount completes after navigation, the host calls its module's `unmount()` once after completion and suppresses late host-state updates. Failed mounts are also cleaned up. Plugin-owned timers, global listeners and other resources still need cleanup in `unmount()`; a mount that never settles must cooperate with `ctx.signal` to release its own resources. A visible Retry loading plugin action starts a fresh host lifecycle after a load error.

Changing the selected environment disposes the plugin view and mounts a new instance. `ctx.state.environmentId` identifies that instance's environment. Use `ctx.pluginApi.request` or `ctx.api.request` for requests bound to this environment: they combine caller cancellation with the host signal, pin the environment header, and reject calls after disposal. `refreshServersState` reads the same environment. Legacy named `ctx.api` helpers retain their documented arguments, but reject new calls once their host is disposed or the environment changes. Pending server-side work may already have started; cancellation does not undo it. Persist important editor state deliberately rather than assuming a view survives an environment change.
