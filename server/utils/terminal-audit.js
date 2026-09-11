const { randomUUID } = require('node:crypto');
// Metadata only: never accept terminal input, output, credentials or raw errors.
function createTerminalAudit({ write, server, username, ip, now = Date.now }) {
  const sessionId = randomUUID();
  let started = null;
  let finished = false;
  const safe = value => String(value || '').replace(/["\r\n]/g, ' ').slice(0, 200);
  const context = `session_id=${sessionId} server_id="${safe(server.id)}" server="${safe(server.name)}" ssh_user="${safe(server.ssh_user || 'root')}" environment="${safe(server.environment_id || 'default')}"`;
  return {
    sessionId,
    ready() {
      if (finished || started !== null) return;
      started = now();
      write('terminal.connect', context, ip, true, username, server.environment_id || 'default');
    },
    finish(reason = 'connection_closed') {
      if (finished) return;
      finished = true;
      const allowed = ['connection_closed','browser_closed','shell_closed','ssh_error','shell_error','missing_key','idle_timeout','duration_limit','access_revoked'];
      const code = allowed.includes(reason) ? reason : 'connection_closed';
      const duration = started === null ? 0 : Math.max(0, now() - started);
      write(started === null ? 'terminal.connect_failed' : 'terminal.disconnect', `${context} reason=${code} duration_ms=${duration}`, ip, started !== null && !['ssh_error','shell_error'].includes(code), username, server.environment_id || 'default');
    },
  };
}
module.exports = { createTerminalAudit };
