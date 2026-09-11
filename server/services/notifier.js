/**
 * Unified notification service — sends webhooks and/or SMTP email.
 * Call notify(title, message, success) anywhere in the app.
 */
const { createHash } = require('crypto');
const { coveredByMaintenance } = require('../utils/notification-maintenance');
const { currentEnvironment } = require('../utils/request-environment');
const { createNotificationDeduper } = require('../utils/notification-dedupe');
const dedupe = createNotificationDeduper();
const https = require('https');
const http = require('http');
const dns = require('dns').promises;
const log = require('../utils/logger').child('webhook');
const db = require('../db');
const { getSecret } = require('../utils/crypto');

// ── SSRF IP-range check (applied to both hostname and resolved IP) ──────────

function isPrivateOrSpecialIpv4(ip) {
  const m = String(ip).match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const octets = m.slice(1).map(Number);
  if (octets.some(n => n < 0 || n > 255)) return false;
  const [a, b] = octets;
  if (a === 127 || a === 10 || a === 0) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

function parseMappedIpv4FromIpv6(v6) {
  const m = String(v6).toLowerCase().match(/^::ffff:(.+)$/);
  if (!m) return null;
  const tail = m[1];
  if (tail.includes('.')) return isPrivateOrSpecialIpv4(tail) ? tail : null;

  const hexGroups = tail.split(':').filter(Boolean);
  if (hexGroups.length !== 2) return null;
  const hi = Number.parseInt(hexGroups[0], 16);
  const lo = Number.parseInt(hexGroups[1], 16);
  if (!Number.isInteger(hi) || !Number.isInteger(lo) || hi < 0 || hi > 0xffff || lo < 0 || lo > 0xffff) return null;

  const ipv4 = [
    (hi >> 8) & 0xff,
    hi & 0xff,
    (lo >> 8) & 0xff,
    lo & 0xff,
  ].join('.');
  return isPrivateOrSpecialIpv4(ipv4) ? ipv4 : null;
}

function isBlockedHost(host) {
  const h = String(host || '').replace(/^\[|\]$/g, ''); // strip IPv6 brackets
  const blockedHosts = ['localhost', '0.0.0.0', 'metadata.google.internal',
    'metadata.google.internal.', '169.254.169.254'];
  if (blockedHosts.includes(h)) return true;
  if (isPrivateOrSpecialIpv4(h)) return true;

  // IPv6 loopback, link-local, and private ranges
  const hLower = h.toLowerCase();
  if (parseMappedIpv4FromIpv6(hLower)) return true;
  if (hLower === '::1' || hLower === '::' ||
      hLower.startsWith('fe80:') || hLower.startsWith('fc') || hLower.startsWith('fd')) return true;
  return false;
}

function isDiscordWebhookUrl(parsedUrl) {
  const hostname = parsedUrl.hostname.toLowerCase();
  return hostname === 'discord.com' && parsedUrl.pathname.startsWith('/api/webhooks/');
}

// ── Webhook ────────────────────────────────────────────────────────────────

async function performWebhook(title, message, success) {
  const url = db.settings.get('webhook_url');
  if (!url) return;

  const secret = getSecret(db, 'webhook_secret') || '';
  let payload;

  try {
    const parsedUrl = new URL(url);

    // Block obviously internal hostnames/IPs before DNS resolution
    if (isBlockedHost(parsedUrl.hostname)) {
      log.warn({ host: parsedUrl.hostname }, 'Blocked request to internal address');
      return { ok: false };
    }

    // Resolve hostname and re-check the resulting IP (prevents DNS-rebinding / SSRF via
    // public domains that point to private addresses)
    try {
      const resolvedIps = await dns.lookup(parsedUrl.hostname, { all: true, verbatim: true });
      for (const record of resolvedIps) {
        if (isBlockedHost(record.address)) {
          log.warn({ host: parsedUrl.hostname, resolvedIp: record.address }, 'Blocked: hostname resolves to internal IP');
          return { ok: false };
        }
      }
    } catch {
      log.warn({ host: parsedUrl.hostname }, 'Blocked: DNS resolution failed');
      return { ok: false };
    }

    if (isDiscordWebhookUrl(parsedUrl)) {
      payload = {
        embeds: [{
          title,
          description: message,
          color: success ? 0x22c55e : 0xef4444,
          timestamp: new Date().toISOString(),
        }],
      };
    } else if (parsedUrl.hostname === 'hooks.slack.com') {
      payload = {
        text: `${success ? '✅' : '❌'} *${title}*`,
        attachments: [{ text: message, color: success ? '#22c55e' : '#ef4444' }],
      };
    } else {
      payload = { title, message, success, timestamp: new Date().toISOString() };
    }

    const body = JSON.stringify(payload);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    };
    if (secret) headers['Authorization'] = `Bearer ${secret}`;

    return new Promise((resolve) => {
      let settled = false;
      const done = (result) => { if (!settled) { settled = true; resolve(result); } };
      const req = (parsedUrl.protocol === 'https:' ? https : http).request(
        {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || undefined,
          path: parsedUrl.pathname + parsedUrl.search,
          method: 'POST',
          headers,
          timeout: 10000,
        },
        (res) => {
          // Cap response body to 64 KB and abort slow-drip responses.
          // Body is discarded, but we must not let a malicious endpoint hold
          // the connection open indefinitely by trickling bytes.
          let received = 0;
          const MAX_BYTES = 64 * 1024;
          const result = { ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode };
          res.on('data', (chunk) => {
            received += chunk.length;
            if (received > MAX_BYTES) res.destroy();
          });
          res.on('end',   () => done(result));
          res.on('close', () => done(result));
          res.on('error', () => done({ ok: false }));
        }
      );
      req.on('error', () => done({ ok: false }));
      req.on('timeout', () => { req.destroy(); done({ ok: false }); });
      req.write(body);
      req.end();
    });
  } catch {
    return { ok: false };
  }
}

// ── SMTP ───────────────────────────────────────────────────────────────────

let _smtpTransporter = null;
let _smtpConfigHash  = '';

async function performEmail(title, message, success) {
  const host = db.settings.get('smtp_host');
  const to   = db.settings.get('smtp_to');
  if (!host || !to) return;

  const nodemailer = require('nodemailer');

  const port     = parseInt(db.settings.get('smtp_port', 10) || '587');
  const user     = db.settings.get('smtp_user') || '';
  const pass     = getSecret(db, 'smtp_pass') || '';
  const from     = db.settings.get('smtp_from') || user;
  const secure   = port === 465;

  // Reuse transporter unless SMTP config has changed
  const cfgHash = `${host}:${port}:${user}:${pass}:${secure}`;
  if (_smtpTransporter && _smtpConfigHash !== cfgHash) {
    try { _smtpTransporter.close(); } catch {}
    _smtpTransporter = null;
  }
  if (!_smtpTransporter) {
    _smtpTransporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user ? { user, pass } : undefined,
      tls: { rejectUnauthorized: true },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
    _smtpConfigHash = cfgHash;
  }
  const transporter = _smtpTransporter;

  function escHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  const icon = success ? '✅' : '❌';
  const delivery = await transporter.sendMail({
    from,
    to,
    subject: `${icon} ${title}`,
    text: `${title}\n\n${message}`,
    html: `<p><strong>${icon} ${escHtml(title)}</strong></p><p>${escHtml(message).replace(/\n/g, '<br>')}</p>`,
  });
  const accepted = Array.isArray(delivery.accepted) ? delivery.accepted.length : 0;
  const rejected = Array.isArray(delivery.rejected) ? delivery.rejected.length : 0;
  return { ok: accepted > 0 && rejected === 0, partial: accepted > 0 && rejected > 0 };
}

// Only delivery metadata is retained: never message bodies, credentials or webhook paths.
async function recordedDelivery(channel, title, send) {
  const configured = channel === 'webhook' ? db.settings.get('webhook_url') : db.settings.get('smtp_host');
  if (!configured || (channel === 'smtp' && !db.settings.get('smtp_to'))) return;
  let destination = 'Configured endpoint';
  try { destination = channel === 'webhook' ? new URL(configured).hostname : new URL(`smtp://${configured}`).hostname; } catch {}
  const started = Date.now();
  let result;
  let failed = false;
  try {
    result = await send();
    failed = result?.ok === false;
    return result;
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    try {
      db.db.transaction(() => {
        db.db.prepare('INSERT INTO notification_deliveries (id, channel, destination, event_title, status, status_code, duration_ms) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(db.uuidv4(), channel, destination, String(title || '').slice(0, 200), result?.reason === 'maintenance' ? 'maintenance' : result?.suppressed ? 'suppressed' : result?.partial ? 'partial' : failed ? 'failed' : 'accepted', Number.isInteger(result?.status) ? result.status : null, Date.now() - started);
        db.db.prepare("DELETE FROM notification_deliveries WHERE created_at < datetime('now', '-30 days') OR id NOT IN (SELECT id FROM notification_deliveries ORDER BY created_at DESC, rowid DESC LIMIT 1000)").run();
      })();
    } catch (error) { log.warn({ error: error.code }, 'Delivery history could not be recorded'); }
  }
}
function sendWebhook(title, message, success) {
  return recordedDelivery('webhook', title, () => performWebhook(title, message, success));
}
function sendEmail(title, message, success) {
  return recordedDelivery('smtp', title, () => performEmail(title, message, success));
}

// ── Public API ─────────────────────────────────────────────────────────────

async function notify(title, message, success, options = {}) {
  const minutes = Number(db.settings.get('notify_dedupe_minutes') || 0);
  const environmentId = options.environmentId || currentEnvironment();
  const inMaintenance = db.settings.get('notify_suppress_maintenance') === '1' && coveredByMaintenance(db.db, environmentId, options.serverIds);
  const windowMs = Number.isInteger(minutes) && minutes >= 0 && minutes <= 60 ? minutes * 60000 : 0;
  await Promise.allSettled(['webhook', 'smtp'].map(channel => {
    const keys = channel === 'webhook' ? ['webhook_url', 'webhook_secret'] : ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from', 'smtp_to'];
    const key = environmentId ? createHash('sha256').update(JSON.stringify([environmentId, Array.isArray(options.serverIds) ? [...options.serverIds].sort() : null, channel, windowMs, keys.map(name => db.settings.get(name)), title, message, success])).digest('hex') : null;
    return recordedDelivery(channel, title, () => inMaintenance ? {ok:true,suppressed:true,reason:'maintenance'} : dedupe(key, windowMs, () => channel === 'webhook' ? performWebhook(title, message, success) : performEmail(title, message, success)));
  }));
}

module.exports = { notify, sendWebhook, sendEmail };
