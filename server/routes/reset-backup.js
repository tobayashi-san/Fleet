'use strict';
const express = require('express');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {Transform} = require('node:stream');
const {pipeline} = require('node:stream/promises');
const {createWriteStream} = require('node:fs');
const {createHash} = require('node:crypto');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const {adminOnly} = require('../middleware/auth');
const credentials = require('../middleware/administrator-credentials')('backup verification', 'verifying a backup');
const {validSession} = require('../utils/auth-sessions');
const {verifyResetBackup} = require('../services/reset-backup-proof');
const {createResetBackupTickets} = require('../services/reset-backup-tickets');
const router = express.Router();
const uploads = createResetBackupTickets();
const approvals = createResetBackupTickets();
const maxBytes = 1024 * 1024 * 1024;
const playbooksDirectory = path.resolve(process.env.FLEET_PLAYBOOKS_DIR || path.join(__dirname, '..', 'playbooks'));
const actions = new Set(['servers', 'schedules', 'playbooks', 'auth', 'all']);
const scopeFor = req => ['servers', 'schedules'].includes(req.params.action) ? req.environmentId || 'default' : 'all-environments';
const ownerFor = req => createHash('sha256').update(JSON.stringify([req.user?.id, req.headers.authorization || ''])).digest('hex');
let busy = false;
const limiter = rateLimit({windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false});
function identity(req) {
  const user = db.db.prepare('SELECT id, disabled, role, password_hash, token_version, totp_enabled FROM users WHERE id=?').get(req.user?.id);
  if (!user || user.disabled || user.role !== 'admin' || (req.authPayload && !validSession(req.authPayload, req.headers.authorization?.slice(7)))) throw Error('Authorization changed. Sign in again before verifying a backup.');
  return createHash('sha256').update(JSON.stringify([user.id, user.password_hash, user.token_version, user.totp_enabled])).digest('hex');
}
router.param('action', (req, res, next, action) => actions.has(action) ? next() : res.status(404).json({error: 'Unknown reset action'}));
router.post('/:action/backup', adminOnly, limiter, credentials, (req, res) => {
  const {passphrase, format, scope} = req.body || {};
  if (scope !== scopeFor(req)) return res.status(409).json({error: 'Reset scope changed. Review the target again.', field: 'backup'});
  if (typeof passphrase !== 'string' || passphrase.length < 12 || Buffer.byteLength(passphrase) > 1024) return res.status(400).json({error: 'Enter the archive passphrase (12 characters minimum, 1024 UTF-8 bytes maximum).', field: 'backup'});
  if (!['database', 'application'].includes(format) || (['all', 'playbooks'].includes(req.params.action) && format !== 'application')) return res.status(400).json({error: 'Select an application archive for resets that remove playbook files.', field: 'backup'});
  try {
    const ticket = uploads.issue(ownerFor(req), req.params.action, scope, {passphrase, format, identity: identity(req)});
    res.set('Cache-Control', 'no-store').json({...ticket, maxBytes});
  } catch (error) { res.status(409).json({error: error.message, field: 'backup'}); }
});

router.put('/:action/backup/:id', adminOnly, async (req, res) => {
  if (!req.is('application/octet-stream')) return res.status(415).json({error: 'Upload the encrypted archive as a binary file.', field: 'backup'});
  if (Number(req.headers['content-length']) > maxBytes) return res.status(413).json({error: 'Backup exceeds the 1 GiB upload limit.', field: 'backup'});
  if (busy) return res.status(409).json({error: 'Another backup verification is running. Wait for it to finish.', field: 'backup'});
  let ticket;
  try {
    ticket = uploads.take(req.params.id, ownerFor(req), req.params.action, scopeFor(req));
    if (ticket.identity !== identity(req)) throw Error('Authorization changed. Start backup verification again.');
  } catch (error) { return res.status(409).json({error: error.message, field: 'backup'}); }
  busy = true;
  let directory;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);
  try {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-reset-check-'));
    const filename = path.join(directory, 'archive');
    let bytes = 0;
    const limit = new Transform({transform(chunk, _encoding, callback) {
      bytes += chunk.length;
      callback(bytes > maxBytes ? Error('Backup exceeds the 1 GiB upload limit.') : null, chunk);
    }});
    await pipeline(req, limit, createWriteStream(filename, {flags: 'wx', mode: 0o600}), {signal: controller.signal});
    clearTimeout(timeout);
    const proof = await verifyResetBackup({filename, passphrase: ticket.passphrase, format: ticket.format, database: db.db, action: req.params.action, environmentId: req.environmentId || 'default', playbooksDirectory});
    if (ticket.identity !== identity(req)) throw Error('Authorization changed during verification. Sign in again.');
    const approval = approvals.issue(ownerFor(req), proof.action, proof.scope, {fingerprint: proof.fingerprint, identity: ticket.identity});
    res.set('Cache-Control', 'no-store').json({...approval, action: proof.action, scope: proof.scope, verifiedAt: proof.verifiedAt});
  } catch (error) {
    if (!res.destroyed && !res.headersSent) res.status(409).json({error: error.message, field: 'backup'});
  } finally {
    clearTimeout(timeout);
    ticket.passphrase = '';
    try { if (directory) await fs.rm(directory, {recursive: true, force: true}); }
    finally { busy = false; }
  }
});

function takeBackupApproval(req) {
  const approval = approvals.take(req.body?.backupApproval, ownerFor(req), req.params.action, scopeFor(req));
  if (approval.identity !== identity(req)) throw Error('Authorization changed. Verify the backup again.');
  return approval.fingerprint;
}
module.exports = {router, takeBackupApproval};
