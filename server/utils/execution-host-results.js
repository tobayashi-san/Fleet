'use strict';

/** Extract Ansible's recorded recap without attributing a run duration to each host. */
function executionHostResults(output) {
  const results = new Map();
  const lines = String(output || '').replace(/\x1b\[[0-9;]*m/g, '').split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*(\S+)\s*:\s*ok=(\d+)\s+changed=(\d+)\s+unreachable=(\d+)\s+failed=(\d+)(.*)$/);
    if (!match) continue;
    const [, name, ok, changed, unreachable, failed, rest] = match;
    results.set(name, { name, ok: Number(ok), changed: Number(changed), unreachable: Number(unreachable), failed: Number(failed), skipped: Number(rest.match(/skipped=(\d+)/)?.[1] || 0), status: Number(failed) || Number(unreachable) ? 'failed' : 'success', duration_seconds: null });
  }
  for (const line of lines) {
    const host = line.match(/^fatal:\s*\[([^\]]+?)\](?:\s|:|$)/)?.[1]?.split(' -> ')[0];
    if (host && !results.has(host)) results.set(host, {name: host, status: 'failed', ok: null, changed: null, failed: null, unreachable: null, skipped: null, duration_seconds: null});
  }
  for (const line of lines) {
    if (!line.startsWith('__FLEET_HOST_TIMING__')) continue;
    try {
      const timings = JSON.parse(line.slice('__FLEET_HOST_TIMING__'.length));
      for (const [name, duration] of Object.entries(timings)) {
        if (results.has(name) && typeof duration === 'number' && Number.isFinite(duration) && duration >= 0) results.get(name).duration_seconds = duration;
      }
    } catch { /* Older, truncated or malformed output has no verified timing. */ }
  }
  return [...results.values()].sort((a,b) => (a.status === 'failed' ? 0 : 1) - (b.status === 'failed' ? 0 : 1) || a.name.localeCompare(b.name));
}
module.exports = { executionHostResults };
