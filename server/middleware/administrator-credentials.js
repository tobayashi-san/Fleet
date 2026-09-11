'use strict';
const bcrypt = require('bcryptjs');
const otplib = require('otplib');
const db = require('../db');
const {validSession} = require('../utils/auth-sessions');
const {serverError} = require('../utils/http-error');

module.exports = function administratorCredentials(action = 'reset', retry = 'resetting') {
return async function verifyAdministratorCredentials(req,res,next) {
  const {password,code} = req.body || {};
  if (typeof password !== 'string' || !password || password.length > 1024) return res.status(400).json({error:`Enter your current password to authorize this ${action}.`,field:'password'});
  try {
    const load = () => db.db.prepare('SELECT id, disabled, role, password_hash, token_version, totp_enabled FROM users WHERE id=?').get(req.user?.id);
    const user = load();
    if (!user || user.disabled || user.role !== 'admin' || !await bcrypt.compare(password,user.password_hash)) return res.status(403).json({error:'Current password is incorrect or account access changed.',field:'password'});
    // Password comparison yields. Recheck authorization and MFA against current
    // state so a concurrent password/role/session change cannot authorize reset.
    const current = load();
    if (!current || current.disabled || current.role !== 'admin' || current.password_hash !== user.password_hash || current.token_version !== user.token_version || (req.authPayload && !validSession(req.authPayload,req.headers.authorization?.slice(7)))) return res.status(403).json({error:`Authorization changed. Sign in again before ${retry}.`});
    if (current.totp_enabled) {
      const secret = db.users.getTotpSecret(current.id);
      let valid = false;
      if (secret && typeof code === 'string' && /^\d{6}$/.test(code)) {
        try { valid = otplib.verifySync({token:code,secret}).valid; } catch { /* fail closed for unavailable MFA */ }
      }
      if (!valid) return res.status(403).json({error:`Enter a valid authenticator code to authorize this ${action}.`,field:'code'});
    }
    next();
  } catch (error) { serverError(res,error,`${action} authorization`); }
};

};
