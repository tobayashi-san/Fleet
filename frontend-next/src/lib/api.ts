import { getToken, notifyUnauthorized } from './auth';
import { serversApi } from './api/servers';

const API_BASE = '/api';

export class ApiError extends Error {
  status: number;
  field?: string;
  constructor(message: string, status: number, field?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.field = field;
  }
}

/** Explains an error response that carries no message of its own, e.g. from a reverse proxy. */
export function statusFallbackMessage(status: number, action = 'The request'): string {
  if (status === 0) return 'Fleet could not be reached. Check your network connection and that the server is running.';
  if (status === 413) return `${action} is too large for the server.`;
  if (status === 429) return 'Too many requests. Wait a moment and try again.';
  if (status === 502 || status === 503 || status === 504) return 'Fleet is not responding. It may be restarting; try again in a moment.';
  if (status >= 500) return `${action} failed on the server (error ${status}). The server log has details.`;
  return `${action} failed (error ${status}).`;
}

function permissionDeniedMessage(path: string, method = 'GET'): string {
  const p = path.toLowerCase();
  const m = method.toUpperCase();

  if (p.startsWith('/roles') || p.startsWith('/users')) {
    return 'Your role is not allowed to manage users and roles.';
  }
  if (p.startsWith('/system/key') || p.startsWith('/system/deploy')) {
    return 'Your role is not allowed to manage SSH keys.';
  }
  if (p.startsWith('/system/audit')) {
    return 'Your role is not allowed to view the audit log.';
  }
  if (p.startsWith('/adhoc')) {
    return 'Your role is not allowed to run ad-hoc commands.';
  }
  if (p.startsWith('/ansible/run')) {
    return 'Your role is not allowed to run this playbook or target.';
  }
  if (p.startsWith('/playbooks')) {
    if (m === 'GET') return 'Your role is not allowed to read this playbook.';
    return 'Your role is not allowed to modify playbooks.';
  }
  if (p.startsWith('/schedules') || p.startsWith('/schedule-history')) {
    return 'Your role is not allowed to access this schedule or history.';
  }
  if (p.startsWith('/ansible-vars')) {
    return 'Your role is not allowed to manage variables.';
  }
  if (p.includes('/docker/compose')) {
    return 'Your role is not allowed to manage Docker Compose on this server.';
  }
  if (p.includes('/docker')) {
    return 'Your role is not allowed to perform Docker actions on this server.';
  }
  if (p.includes('/custom-updates')) {
    return 'Your role is not allowed to use custom update tasks.';
  }
  if (p.endsWith('/update') || p.endsWith('/update-all')) {
    return 'Your role is not allowed to start updates.';
  }
  if (p.endsWith('/reboot')) {
    return 'Your role is not allowed to reboot servers.';
  }
  if (p.startsWith('/servers')) {
    if (m === 'GET') return 'Your role is not allowed to view this server.';
    return 'Your role is not allowed to modify this server.';
  }
  return 'Your role does not allow this action.';
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Skip Authorization header (used for /auth/login, /auth/setup, /auth/status). */
  skipAuth?: boolean;
  /** Override the default timeout; use 0 only for intentional long polling. */
  timeoutMs?: number;
  /** Explicit target for workflows that select an environment without changing navigation. */
  environmentId?: string;
}

export async function apiFetch<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.headers) Object.assign(headers, options.headers as Record<string, string>);

  if (!options.skipAuth) {
    const tok = getToken();
    if (tok) headers['Authorization'] = `Bearer ${tok}`;
    try {
      headers['X-Fleet-Environment'] = options.environmentId || localStorage.getItem('fleet_environment') || 'default';
    } catch {
      headers['X-Fleet-Environment'] = options.environmentId || 'default';
    }
  }

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs === 0 ? 0 : Math.max(1_000, options.timeoutMs || 30_000);
  const callerSignal = options.signal;
  const abortFromCaller = () => controller.abort(callerSignal?.reason);
  if (callerSignal?.aborted) abortFromCaller();
  else callerSignal?.addEventListener('abort', abortFromCaller, { once: true });
  const timeout = timeoutMs ? globalThis.setTimeout(() => controller.abort('timeout'), timeoutMs) : undefined;

  const init: RequestInit = { ...options, headers, signal: controller.signal } as RequestInit;
  delete (init as { skipAuth?: boolean }).skipAuth;
  delete (init as { timeoutMs?: number }).timeoutMs;
  delete (init as { environmentId?: string }).environmentId;

  if (options.body !== undefined && options.body !== null && typeof options.body === 'object' && !(options.body instanceof FormData) && !(options.body instanceof Blob)) {
    init.body = JSON.stringify(options.body);
  } else if (options.body !== undefined) {
    init.body = options.body as BodyInit;
  }

  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (error) {
    if (controller.signal.aborted && !callerSignal?.aborted) {
      throw new ApiError(`Request timed out after ${Math.round(timeoutMs / 1000)} seconds. Try again.`, 408);
    }
    if (error instanceof TypeError) throw new ApiError(statusFallbackMessage(0), 0);
    throw error;
  } finally {
    if (timeout !== undefined) globalThis.clearTimeout(timeout);
    callerSignal?.removeEventListener('abort', abortFromCaller);
  }

  if (res.status === 401 && !options.skipAuth) {
    notifyUnauthorized();
    throw new ApiError('Not signed in', 401);
  }

  if (!res.ok) {
    let msg = statusFallbackMessage(res.status);
    let field: string | undefined;
    try {
      const j = await res.json();
      if (typeof j?.error === 'string') msg = j.error;
      if (typeof j?.field === 'string' && /^[a-z][a-z0-9_]{0,63}$/.test(j.field)) field = j.field;
    } catch { /* ignore */ }
    if (res.status === 403 && field === 'mfa_enrollment_required' && typeof window !== 'undefined' && window.location.pathname !== '/mfa-enrollment') window.location.assign('/mfa-enrollment');
    if (res.status === 403 && msg === 'Permission denied') msg = permissionDeniedMessage(path, options.method || 'GET');
    throw new ApiError(msg, res.status, field);
  }

  if (res.status === 204) return null as T;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return (await res.json()) as T;
  return (await res.text()) as unknown as T;
}

/** Collection endpoint wrapper that makes stale/malformed responses safe for UI consumers. */
export async function apiFetchArray<T = unknown>(path: string, options: RequestOptions = {}): Promise<T[]> {
  const response = await apiFetch<unknown>(path, options);
  return Array.isArray(response) ? response as T[] : [];
}

/** Download helper for binary endpoints (e.g. server export). */
export async function apiDownload(path: string, filename: string, options: { body?: Record<string, unknown>; environmentId?: string } = {}): Promise<void> {
  const tok = getToken();
  let environmentId = 'default';
  try { environmentId = localStorage.getItem('fleet_environment') || 'default'; } catch { /* use default */ }
  environmentId = options.environmentId || environmentId;
  const res = await fetch(`${API_BASE}${path}`, {
    method: options.body ? 'POST' : 'GET',
    body: options.body ? JSON.stringify(options.body) : undefined,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
      'X-Fleet-Environment': environmentId,
    },
  });
  if (!res.ok) {
    let message = statusFallbackMessage(res.status, 'The download');
    try {
      const payload = await res.json() as { error?: unknown };
      if (typeof payload?.error === 'string' && payload.error.trim()) message = payload.error;
    } catch { /* keep the status fallback for non-JSON proxy errors */ }
    throw new ApiError(message, res.status);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Upload a binary file without buffering it into JSON, with browser progress events. */
export function apiUploadFile(
  path: string,
  file: File,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', abortRequest);
      callback();
    };
    const abortRequest = () => request.abort();
    request.open('PUT', `${API_BASE}${path}`);
    const token = getToken();
    if (token) request.setRequestHeader('Authorization', `Bearer ${token}`);
    try {
      request.setRequestHeader('X-Fleet-Environment', localStorage.getItem('fleet_environment') || 'default');
    } catch {
      request.setRequestHeader('X-Fleet-Environment', 'default');
    }
    request.setRequestHeader('Content-Type', 'application/octet-stream');
    request.upload.onprogress = event => {
      if (!settled && event.lengthComputable && event.total > 0 && onProgress) onProgress(Math.min(100, Math.max(0, Math.floor((event.loaded / event.total) * 100))));
    };
    request.onerror = () => finish(() => reject(new ApiError(statusFallbackMessage(0), 0)));
    request.onabort = () => finish(() => reject(new ApiError('Upload canceled', 499)));
    request.onload = () => {
      let payload: unknown = null;
      try { payload = request.responseText ? JSON.parse(request.responseText) : null; } catch { payload = request.responseText; }
      if (request.status >= 200 && request.status < 300) return finish(() => resolve(payload));
      const message = payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : statusFallbackMessage(request.status, 'The upload');
      finish(() => reject(new ApiError(message, request.status)));
    };
    if (signal?.aborted) return finish(() => reject(new ApiError('Upload canceled', 499)));
    signal?.addEventListener('abort', abortRequest, { once: true });
    request.send(file);
  });
}

// ─────────────────────────── Typed API surface ──────────────────────────────
// Field names preserve snake_case at the API boundary (per AGENTS.md). Return types are deliberately
// loose (`unknown`/`any`) for now to avoid blocking parity work; tighten per view.

export type AnyObj = Record<string, unknown>;

export const api = {
  // Auth
  authStatus:        () => apiFetch<{ configured: boolean; appName?: string; appTagline?: string; accentColor?: string; showIcon?: boolean; logoIcon?: string; logoImage?: string }>('/auth/status', { skipAuth: true }),
  authSetup:         (username: string, password: string) =>
    apiFetch<{ token: string }>('/auth/setup', { method: 'POST', body: { username, password }, skipAuth: true }),
  authLogin:         (username: string, password: string) =>
    apiFetch<{ token?: string; tempToken?: string; requires2FA?: boolean; requiresMfaEnrollment?: boolean; user?: AnyObj }>('/auth/login', { method: 'POST', body: { username, password }, skipAuth: true }),
  authChangePassword:(currentPassword: string, newPassword: string) =>
    apiFetch('/auth/change', { method: 'POST', body: { currentPassword, newPassword } }),
  totpStatus:        () => apiFetch<{ enabled: boolean; required: boolean; policy: string }>('/auth/totp/status'),
  totpSetup:         () => apiFetch<{ otpauthUrl: string; secret: string }>('/auth/totp/setup', { method: 'POST' }),
  totpConfirm:       (code: string) => apiFetch<{ success: boolean; token: string }>('/auth/totp/confirm', { method: 'POST', body: { code } }),
  totpDisable:       (password: string) => apiFetch<{ success: boolean; token: string }>('/auth/totp', { method: 'DELETE', body: { password } }),
  totpLogin:         (tempToken: string, code: string) =>
    apiFetch<{ token: string }>('/auth/totp/login', { method: 'POST', body: { tempToken, code }, skipAuth: true }),
  getProfile:        () => apiFetch<AnyObj>('/auth/profile'),
  updateProfile:     (data: AnyObj) => apiFetch('/auth/profile', { method: 'PUT', body: data }),

  // Dashboard
  getDashboard:      () => apiFetch<AnyObj>('/dashboard'),
  getEnvironments:   () => apiFetchArray<AnyObj>('/environments'),
  createEnvironment: (name: string) => apiFetch<AnyObj>('/environments', { method: 'POST', body: { name } }),
  updateEnvironment: (id: string | number, name: string) => apiFetch(`/environments/${id}`, { method: 'PUT', body: { name } }),
  deleteEnvironment: (id: string | number) => apiFetch(`/environments/${id}`, { method: 'DELETE' }),
  getAlerts:         (status = 'active') => apiFetchArray<AnyObj>(`/alerts?status=${encodeURIComponent(status)}`),
  acknowledgeAlert:  (id: string | number) => apiFetch(`/alerts/${id}/ack`, { method: 'POST' }),
  unacknowledgeAlert:(id: string | number) => apiFetch(`/alerts/${id}/unack`, { method: 'POST' }),
  ping:              () => apiFetch<{ ok: boolean; ts: number }>('/ping'),

  ...serversApi,


  // SSH / System
  getSSHKey:         () => apiFetch<{ publicKey: string }>('/system/key'),
  exportSSHKey:      (passphrase = '', password = '', code = '') => apiFetch<{ privateKey: string }>('/system/key/export', { method: 'POST', body: { passphrase, password, code } }),
  previewSSHKeyImport: (privateKey: string, passphrase = '') => apiFetch<{candidate:{fingerprint:string;algorithm:string;publicKey:string};current:{id:string;fingerprint:string;algorithm:string}|null}>('/system/key/import-preview', {method:'POST',body:{privateKey,passphrase}}),
  importSSHKey: (privateKey: string, passphrase: string, review:{expectedKeyId:string|null;expectedFingerprint:string}) => apiFetch('/system/key/import', {method:'POST',body:{privateKey,passphrase,...review}}),
  generateSSHKey:    (name?: string) => apiFetch('/system/generate', { method: 'POST', body: { name } }),
  deploySSHKey:      (data: AnyObj) => apiFetch('/system/deploy', { method: 'POST', body: data, environmentId: typeof data.environment_id === 'string' ? data.environment_id : undefined }),
  deploySSHKeyAll:   (data: AnyObj) => apiFetch('/system/deploy-all', { method: 'POST', body: data }),
  getSSHKeyAssignments: (environmentId = 'default') => apiFetch(`/system/key-assignments?environment_id=${encodeURIComponent(environmentId)}`),
  getSSHKeyAssignmentTargets: (environmentId = 'default') => apiFetch(`/system/key-assignment-targets?environment_id=${encodeURIComponent(environmentId)}`),
  saveSSHKeyAssignment: (data: AnyObj) => apiFetch('/system/key-assignments', { method: 'PUT', body: data }),
  deleteSSHKeyAssignment: (id: string) => apiFetch(`/system/key-assignments/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // App Settings
  getSettings:       () => apiFetch<AnyObj>('/system/settings'),
  saveSettings:      (data: AnyObj) => apiFetch('/system/settings', { method: 'PUT', body: data }),
  getAnsibleStatus:  () => apiFetch<AnyObj>('/system/status'),
  getOpenTofuStatus: () => apiFetch<AnyObj>('/opentofu/status'),
  getOpenTofuReleases: () => apiFetch<{ releases: string[] }>('/opentofu/releases'),
  installOpenTofu:   (version: string) => apiFetch<AnyObj>('/opentofu/install', { method: 'POST', body: { version } }),
  getAuditLog:       (params: Record<string, string | number | undefined> = {}) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') q.set(k, String(v));
    return apiFetch<AnyObj>(`/system/audit?${q}`);
  },
  getAuditMeta:      (params: Record<string, string | number | undefined> = {}) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') q.set(k, String(v));
    return apiFetch<AnyObj>(`/system/audit/meta?${q}`);
  },
  exportAuditLog:    (params: Record<string, string | number | undefined> = {}) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') q.set(k, String(v));
    return apiDownload(`/system/audit/export?${q}`, 'fleet-audit-log.csv', { environmentId: typeof params.environment_id === 'string' ? params.environment_id : undefined });
  },
  getPollingConfig:  () => apiFetch<AnyObj>('/system/polling-config'),
  savePollingConfig: (data: AnyObj) => apiFetch('/system/polling-config', { method: 'PUT', body: data }),
  testWebhook:       () => apiFetch('/system/webhook-test', { method: 'POST' }),
  testSmtp:          () => apiFetch('/system/smtp-test',    { method: 'POST' }),
  markOnboardingDone:() => apiFetch('/system/onboarding-complete', { method: 'POST' }),

  // Playbooks
  getPlaybooks:      () => apiFetchArray<AnyObj>('/playbooks'),
  getPlaybook:       (filename: string) => apiFetch<{ content: string; revision: string; status: 'draft' | 'approved'; author?: string | null; modifiedAt?: string; approvedBy?: string | null; approvedAt?: string | null }>(`/playbooks/${encodeURIComponent(filename)}`),
  savePlaybook:      (filename: string, content: string, revision: string | null) => apiFetch('/playbooks', { method: 'POST', body: { filename, content, revision } }),
  approvePlaybook:   (filename: string, revision: string) => apiFetch(`/playbooks/${encodeURIComponent(filename)}/approve`, { method: 'POST', body: { revision } }),
  deletePlaybook:    (filename: string) => apiFetch(`/playbooks/${encodeURIComponent(filename)}`, { method: 'DELETE' }),
  getPlaybookHistory:(filename: string) => apiFetchArray<AnyObj>(`/playbooks/${encodeURIComponent(filename)}/history`),
  getPlaybookVersion:(filename: string, version: string | number) => apiFetch(`/playbooks/${encodeURIComponent(filename)}/history/${version}`),
  restorePlaybook:   (filename: string, version: string | number) => apiFetch(`/playbooks/${encodeURIComponent(filename)}/restore/${version}`, { method: 'POST' }),

  // Ansible / actions
  runUpdate:         (serverId: string | number) => apiFetch(`/servers/${serverId}/update`, { method: 'POST' }),
  runUpdateAll:      () => apiFetch('/servers/update-all', { method: 'POST' }),
  runSelectedUpdates: (serverIds: string[], environmentId: string) => apiFetch('/servers/update-all', { method: 'POST', body: {server_ids:serverIds}, environmentId }),
  runReboot:         (serverId: string | number) => apiFetch(`/servers/${serverId}/reboot`, { method: 'POST' }),
  runPlaybook:       (playbook: string, targets: unknown, extraVars?: AnyObj, options: AnyObj = {}) =>
    apiFetch('/ansible/run', { method: 'POST', body: { playbook, targets, extraVars, ...options }, environmentId: typeof options.environment_id === 'string' ? options.environment_id : undefined }),
  previewPlaybookTargets: (targets: unknown, environmentId: string) =>
    apiFetch<{ environment_id: string; count: number; targets: string[] }>('/ansible/preview-targets', { method: 'POST', body: { targets, environment_id: environmentId } }),
  getPlaybookRunStatus: (id: string | number, environmentId?: string) => apiFetch<AnyObj>(`/ansible/runs/${id}/status`, { environmentId }),
  cancelPlaybookRun: (id: string | number, environmentId?: string) => apiFetch(`/ansible/runs/${id}/cancel`, { method: 'POST', environmentId }),
  runAdhoc:          (targets: unknown, module: string, args: string) =>
    apiFetch('/adhoc/run', { method: 'POST', body: { targets, module, args } }),

  // Schedules
  getSchedules:      (environmentId?: string) => apiFetchArray<AnyObj>(`/schedules${environmentId ? `?environment_id=${encodeURIComponent(environmentId)}` : ''}`),
  createSchedule:    (data: AnyObj) => apiFetch('/schedules', { method: 'POST', body: data }),
  updateSchedule:    (id: string | number, data: AnyObj) => apiFetch(`/schedules/${id}`, { method: 'PUT', body: data }),
  deleteSchedule:    (id: string | number) => apiFetch(`/schedules/${id}`, { method: 'DELETE' }),
  toggleSchedule:    (id: string | number) => apiFetch(`/schedules/${id}/toggle`, { method: 'POST' }),
  getScheduleHistory:(limit = 100, scheduleId: string | number | null = null, environmentId?: string) => {
    const q = new URLSearchParams({ limit: String(limit) });
    if (scheduleId) q.set('scheduleId', String(scheduleId));
    if (environmentId) q.set('environment_id', environmentId);
    return apiFetchArray<AnyObj>(`/schedule-history?${q}`);
  },
  getScheduleHistoryEntry: (id: string | number, environmentId?: string) => apiFetch<AnyObj>(`/schedule-history/${id}`, { environmentId }),

  // Ansible vars
  getAnsibleVars:    (environmentId?: string) => apiFetchArray<AnyObj>(`/ansible-vars${environmentId ? `?environment_id=${encodeURIComponent(environmentId)}` : ''}`),
  createAnsibleVar:  (data: AnyObj) => apiFetch('/ansible-vars', { method: 'POST', body: data }),
  updateAnsibleVar:  (id: string | number, data: AnyObj) => apiFetch(`/ansible-vars/${id}`, { method: 'PUT', body: data }),
  deleteAnsibleVar:  (id: string | number) => apiFetch(`/ansible-vars/${id}`, { method: 'DELETE' }),

  // Git
  getGitConfig:      () => apiFetch<AnyObj>('/playbooks-git/config'),
  saveGitConfig:     (data: AnyObj) => apiFetch('/playbooks-git/config', { method: 'PUT', body: data }),
  saveGitSettings:   (data: AnyObj) => apiFetch('/playbooks-git/settings', { method: 'POST', body: data }),
  gitDisconnect:     () => apiFetch('/playbooks-git/disconnect', { method: 'POST' }),
  testGitConnection: (data: AnyObj) => apiFetch<{ reachable: boolean; branches: string[]; defaultBranch: string | null; branchExists: boolean; checkedAt: string }>('/playbooks-git/test', { method: 'POST', body: data }),
  gitSetup:          (data: AnyObj) => apiFetch('/playbooks-git/setup', { method: 'POST', body: data }),
  getGitStatus:      () => apiFetch<AnyObj>('/playbooks-git/status'),
  getGitLog:         (page?: number, limit?: number) =>
    apiFetch<AnyObj>(`/playbooks-git/log${page || limit ? `?page=${page || 1}&limit=${limit || 10}` : ''}`),
  getGitBranches:    () => apiFetch<AnyObj>('/playbooks-git/branches'),
  gitCheckout:       (branch: string) => apiFetch('/playbooks-git/checkout', { method: 'POST', body: { branch } }),
  gitCommit:         (message: string) => apiFetch('/playbooks-git/commit', { method: 'POST', body: { message } }),
  gitPull:           () => apiFetch('/playbooks-git/pull', { method: 'POST' }),
  gitPush:           () => apiFetch('/playbooks-git/push', { method: 'POST' }),

  // Reset / danger
  resetServers: (confirmation: string, environmentId: string, credentials: { password: string; code?: string }) => apiFetch('/reset/servers', { method: 'DELETE', environmentId, body: { ...credentials, confirmation, scope: environmentId } }),
  resetSchedules: (confirmation: string, environmentId: string, credentials: { password: string; code?: string }) => apiFetch('/reset/schedules', { method: 'DELETE', environmentId, body: { ...credentials, confirmation, scope: environmentId } }),
  resetPlaybooks: (confirmation: string, credentials: { password: string; code?: string }) => apiFetch('/reset/playbooks', { method: 'DELETE', body: { ...credentials, confirmation, scope: 'all-environments' } }),
  resetAuth: (confirmation: string, credentials: { password: string; code?: string }) => apiFetch('/reset/auth', { method: 'DELETE', body: { ...credentials, confirmation, scope: 'all-environments' } }),
  resetAll: (confirmation: string, credentials: { password: string; code?: string }) => apiFetch('/reset/all', { method: 'DELETE', body: { ...credentials, confirmation, scope: 'all-environments' } }),

  // Users / Roles
  getUsers:          () => apiFetch<AnyObj[]>('/users'),
  createUser:        (data: AnyObj) => apiFetch('/users', { method: 'POST', body: data }),
  updateUser:        (id: string | number, data: AnyObj) => apiFetch(`/users/${id}`, { method: 'PUT', body: data }),
  resetUserPassword: (id: string | number, password: string) => apiFetch(`/users/${id}/password`, { method: 'PUT', body: { password } }),
  disableUserTotp:   (id: string | number) => apiFetch(`/users/${id}/totp-disable`, { method: 'PUT', body: {} }),
  setUserDisabled:   (id: string | number, disabled: boolean) => apiFetch(`/users/${id}/status`, { method: 'PUT', body: { disabled } }),
  revokeUserSessions:(id: string | number) => apiFetch(`/users/${id}/revoke-sessions`, { method: 'POST' }),
  deleteUser:        (id: string | number) => apiFetch(`/users/${id}`, { method: 'DELETE' }),

  getRoles:          () => apiFetch<AnyObj[]>('/roles'),
  createRole:        (data: AnyObj) => apiFetch('/roles', { method: 'POST', body: data }),
  updateRole:        (id: string | number, data: AnyObj) => apiFetch(`/roles/${id}`, { method: 'PUT', body: data }),
  deleteRole:        (id: string | number, revision: string) => apiFetch(`/roles/${id}`, { method: 'DELETE', body: {revision} }),
};

export type Api = typeof api;
