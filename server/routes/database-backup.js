'use strict';
const express = require('express');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const otplib = require('otplib');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const db = require('../db');
const {adminOnly} = require('../middleware/auth');
const {validSession} = require('../utils/auth-sessions');
const backupService = require('../services/database-backup');
const {serverError} = require('../utils/http-error');
const router = express.Router();
let busy = false;
const limiter = rateLimit({windowMs:15*60*1000,max:5,skip:()=>process.env.NODE_ENV==='test',standardHeaders:true,legacyHeaders:false,message:{error:'Too many backup attempts. Try again in 15 minutes.'}});
router.post('/',adminOnly,limiter,async(req,res)=>{
  const body = req.body || {};
  if (typeof body.password !== 'string' || !body.password || body.password.length > 1024) return res.status(400).json({error:'Current password is required',field:'password'});
  if (typeof body.passphrase !== 'string' || body.passphrase.length < 12 || Buffer.byteLength(body.passphrase) > 1024) return res.status(400).json({error:'Backup passphrase requires at least 12 characters and at most 1024 UTF-8 bytes',field:'passphrase'});
  if (body.scope !== 'all-environments-database') return res.status(400).json({error:'Confirm the all-environments database scope',field:'scope'});
  const user = db.users.getByUsername(req.user.username);
  if (!user || !await bcrypt.compare(body.password,user.password_hash)) return res.status(403).json({error:'Current password is incorrect',field:'password'});
  if (user.totp_enabled) {
    const secret = db.users.getTotpSecret(user.id);
    let validCode = false;
    if (secret && typeof body.code === 'string' && /^\d{6}$/.test(body.code)) {
      try { validCode = otplib.verifySync({token:body.code,secret}).valid; } catch { /* invalid/unavailable MFA configuration */ }
    }
    if (!validCode) return res.status(403).json({error:'A valid authenticator code is required',field:'code'});
  }
  if (busy) return res.status(409).json({error:'A database backup is already being prepared. Try again shortly.'});
  busy = true;
  let dir;
  try {
    dir = await fs.mkdtemp(path.join(os.tmpdir(),'shipyard-export-'));
    const archive = path.join(dir,'database.backup');
    const info = await backupService.createEncryptedDatabaseBackup(db.db,archive,body.passphrase);
    await backupService.verifyEncryptedDatabaseBackup(archive,body.passphrase);
    const current = db.users.getById(user.id);
    if (!current || current.disabled || current.role !== 'admin' || current.token_version !== user.token_version || !validSession(req.authPayload,req.headers.authorization.slice(7))) return res.status(403).json({error:'Authorization changed. Sign in again before exporting.'});
    db.auditLog.write('backup.database_export',`Encrypted database archive prepared and verified; scope=all-environments; bytes=${info.bytes}`,req.ip,true,user.username);
    res.set('Cache-Control','no-store');
    res.set('X-Shipyard-Backup-Verification','authenticated-decryption-and-sqlite-integrity');
    await new Promise((resolve,reject)=>res.download(archive,`shipyard-database-${new Date().toISOString().slice(0,10)}.backup`,error=>error?reject(error):resolve()));
  } catch (error) {
    if (res.headersSent) res.destroy(); else serverError(res,error,'database backup export');
  } finally { try { if(dir)await fs.rm(dir,{recursive:true,force:true}); } finally { busy=false; } }
});
module.exports = router;
