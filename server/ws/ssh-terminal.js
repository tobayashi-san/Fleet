const { StringDecoder } = require('node:string_decoder');
const { terminalLimits, createTerminalTimers } = require('../utils/terminal-limits');
const { createTerminalAudit } = require('../utils/terminal-audit');
const { Client: SshClient } = require('ssh2');
const db = require('../db');
const sshManager = require('../services/ssh-manager');
const { getPermissions, filterServers, can, canAccessEnvironment } = require('../utils/permissions');
const log = require('../utils/logger');
const { verifyWsAuth, getWsUser } = require('./auth');

function attachSshTerminal(wssSsh) {
  wssSsh.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    const authorized = user => {
      if (!user) return false;
      const currentPermissions = getPermissions(user);
      const environment = String(url.searchParams.get('environment') || 'default').trim() || 'default';
      const currentServer = db.servers.getById(url.searchParams.get('serverId'));
      return !!currentServer && String(currentServer.environment_id || 'default') === environment
        && can(currentPermissions, 'canUseTerminal') && canAccessEnvironment(currentPermissions, environment)
        && (currentPermissions?.full || filterServers([currentServer], currentPermissions).length > 0);
    };
    if (!verifyWsAuth(ws, url, authorized)) return;

    const wsUser = getWsUser(url);
    const perms = getPermissions(wsUser);
    const environmentId = String(url.searchParams.get('environment') || 'default').trim() || 'default';
    if (!can(perms, 'canUseTerminal') || !canAccessEnvironment(perms, environmentId)) {
      ws.close(4003, 'Permission denied');
      return;
    }

    const serverId = url.searchParams.get('serverId');
    const server = db.servers.getById(serverId);
    if (!server || String(server.environment_id || 'default') !== environmentId) { ws.close(4004, 'Server not found'); return; }

    if (perms && !perms.full) {
      const allowed = filterServers([server], perms);
      if (allowed.length === 0) { ws.close(4003, 'Server access denied'); return; }
    }

    const audit = createTerminalAudit({write: (...args) => db.auditLog.write(...args), server, username:wsUser.username, ip:req.socket?.remoteAddress || ''});
    let privateKey;
    try { privateKey = sshManager.getPrivateKey(); }
    catch {
      audit.finish('missing_key');
      ws.send(JSON.stringify({ type: 'error', message: 'SSH key not found' }));
      ws.close();
      return;
    }

    const conn = new SshClient();
    let stream = null;
    let sessionTimers = null;
    const limits = terminalLimits();
    const stillAuthorized = () => {
      if (ws.readyState !== 1) return false;
      if (authorized(getWsUser(url))) return true;
      audit.finish('access_revoked');
      sessionTimers?.stop();
      ws.close(4003, 'Terminal access revoked');
      try { stream?.close(); } catch {}
      conn.end();
      return false;
    };

    conn.on('ready', () => {
      if (!stillAuthorized()) { conn.end(); return; }
      const cols = Math.min(Math.max(parseInt(url.searchParams.get('cols', 10)) || 80, 10), 500);
      const rows = Math.min(Math.max(parseInt(url.searchParams.get('rows', 10)) || 24, 2), 200);

      conn.shell({ term: 'xterm-256color', cols, rows }, (err, sh) => {
        if (err) {
          audit.finish('shell_error');
          if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'error', message: err.message }));
          ws.close();
          return;
        }
        if (!stillAuthorized()) { sh.close(); conn.end(); return; }
        stream = sh;
        audit.ready();
        sessionTimers = createTerminalTimers(limits, reason => {
          audit.finish(reason);
          if (ws.readyState === 1) ws.send(JSON.stringify({type:'closed',reason}));
          ws.close();
          try { stream?.close(); } catch {}
          conn.end();
        });
        ws.send(JSON.stringify({ type: 'ready', sessionId:audit.sessionId, sessionAudit:true, outputRecording:false, limits }));

        const stdoutDecoder = new StringDecoder('utf8');
        const stderrDecoder = new StringDecoder('utf8');
        const sendOutput = data => {
          if (data && ws.readyState === 1) ws.send(url.searchParams.get('output') === 'json-v1' ? JSON.stringify({type:'output',data}) : data);
        };
        sh.on('data', data => sendOutput(stdoutDecoder.write(data)));
        sh.stderr.on('data', data => sendOutput(stderrDecoder.write(data)));
        sh.on('close', () => {
          sendOutput(stdoutDecoder.end());
          sendOutput(stderrDecoder.end());
          audit.finish('shell_closed');
          if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'closed' }));
          ws.close();
          conn.end();
        });
      });
    });

    conn.on('close', () => { sessionTimers?.stop(); audit.finish('connection_closed'); if (ws.readyState === 1) ws.close(); });
    conn.on('error', err => {
      audit.finish('ssh_error');
      const stored = db.servers.getHostFingerprint(server.id);
      const looksLikeHostKey = stored && /handshake|host key|verification|All configured/i.test(err.message || '');
      const message = looksLikeHostKey
        ? `Host key verification failed for ${server.ip_address}. The remote host key does not match the trusted fingerprint. If the host was reinstalled, run "Reset host key" for this server.`
        : err.message;
      if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'error', message }));
      ws.close();
      conn.end();
    });

    ws.on('message', raw => {
      if (!stream || !stillAuthorized()) return;
      if (raw.length > 65536) return;
      try {
        const msg = JSON.parse(raw);
        if (msg.type === 'input' && typeof msg.data === 'string' && msg.data.length > 0) { sessionTimers?.touch(); stream.write(msg.data); }
        if (msg.type === 'resize') {
          const rows = Math.min(Math.max(parseInt(msg.rows, 10) || 24, 2), 200);
          const cols = Math.min(Math.max(parseInt(msg.cols, 10) || 80, 10), 500);
          stream.setWindow(rows, cols, 0, 0);
        }
      } catch (e) {
        log.debug({ err: e }, 'SSH terminal message error');
      }
    });

    ws.on('close', code => {
      sessionTimers?.stop();
      audit.finish(code === 4001 || code === 4003 ? 'access_revoked' : 'browser_closed');
      try { stream?.close(); } catch {}
      conn.end();
    });

    conn.connect({
      host: server.ip_address,
      port: server.ssh_port || 22,
      username: server.ssh_user || 'root',
      privateKey,
      readyTimeout: 10000,
      hostVerifier: sshManager.makeHostVerifier({
        serverId: server.id,
        hostLabel: server.ip_address,
      }),
    });
  });
}

module.exports = { attachSshTerminal };
