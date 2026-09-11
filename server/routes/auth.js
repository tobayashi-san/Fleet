const {mfaPolicy,requiresMfa}=require('../utils/mfa-policy');
const {createSession,revokeSession,revokeSignIn,validSession}=require('../utils/auth-sessions');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const otplib = require('otplib');
const QRCode = require('qrcode');
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { getJwtSecret } = require('../utils/jwt-secret');
const { serverError } = require('../utils/http-error');
const { authSensitiveLimiter } = require('../utils/rate-limiters');
const { normalizeUsername, validateUsername } = require('../utils/usernames');
const { normalizeEmail } = require('../utils/email');

const isTest = process.env.NODE_ENV === 'test';

function requestBody(req) {
  return req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
}

// Dummy hash for constant-time comparison when user not found (prevents timing attacks)
const DUMMY_HASH = '$2a$12$LJ3m4ys3Rl4Eqb4oNaeyxOV2OVXjoAiGxvuoQDcxXnQmYVG.gu0Vu';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skip: () => isTest,
  message: { error: 'Too many login attempts. Please wait 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const changeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skip: () => isTest,
  message: { error: 'Too many password change attempts. Please wait 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for the unauthenticated onboarding endpoint — prevents CPU DoS
// on bcrypt and a race to create the first admin account during the onboarding window.
const setupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skip: () => isTest,
  message: { error: 'Too many setup attempts. Please wait 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/invitations/preview',authSensitiveLimiter,(req,res)=>{
  res.set('Cache-Control','no-store');
  try { res.json(require('../services/user-invitations').previewInvitation(requestBody(req).token)); }
  catch(error){if(error.status)return res.status(error.status).json({error:error.message});serverError(res,error,'preview invitation');}
});

router.post('/invitations/accept',authSensitiveLimiter,async(req,res)=>{
  res.set('Cache-Control','no-store');
  try{
    const {token,password}=requestBody(req);
    const result=await require('../services/user-invitations').acceptInvitation(token,password,req);
    res.set('Cache-Control','no-store').status(201).json(result);
  }catch(error){if(error.status)return res.status(error.status).json({error:error.message});serverError(res,error,'accept invitation');}
});

function verifyTotp(code, secret) {
  const token=String(code).replace(/\s/g, '');
  if(!/^[0-9]{6}$/.test(token))return false;
  const result = otplib.verifySync({ token, secret });
  return result.valid;
}

function makeToken(user, req) {
  const sid=createSession(user,req);
  const enrollment=requiresMfa(user) && !user.totp_enabled;
  return jwt.sign(
    { userId: user.id, username: user.username, role: user.role, sid, tv: user.token_version || 0, mfa: !!user.totp_enabled, ...(enrollment ? {mfa_enrollment:true} : {}) },
    getJwtSecret(),
    { expiresIn: enrollment ? '10m' : '8h' }
  );
}

function makeTempToken(payload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '5m' });
}

router.post('/logout', authSensitiveLimiter, authMiddleware, (req, res) => {
 if (!revokeSignIn(req.user, req.authPayload, req.headers.authorization.slice(7))) {
  return res.status(404).json({error:'Session not found'});
 }
 res.json({success:true});
});

router.get('/sessions', authSensitiveLimiter, authMiddleware, (req, res) => {
 const offset = Number(req.query.offset || 0);
 if (!Number.isSafeInteger(offset) || offset < 0) return res.status(400).json({error:'Invalid session offset'});
 const scope = [req.user.id, req.user.token_version || 0, Date.now()];
 const where = 'user_id=? AND token_version=? AND revoked_at IS NULL AND expires_at>?';
 const total = db.db.prepare(`SELECT COUNT(*) AS count FROM auth_sessions WHERE ${where}`).get(...scope).count;
 const sessions = db.db.prepare(`SELECT id,created_at,last_seen_at,expires_at,ip,user_agent FROM auth_sessions WHERE ${where} ORDER BY (id=?) DESC,created_at DESC,id DESC LIMIT 20 OFFSET ?`).all(...scope, req.sessionId || '', offset);
 res.json({sessions:sessions.map(row=>({...row,current:row.id===req.sessionId})),total,offset,legacy_current:!req.sessionId});
});
router.delete('/sessions/:id', authSensitiveLimiter, authMiddleware, (req,res)=>{
 if(!revokeSession(req.user.id,req.params.id))return res.status(404).json({error:'Session not found'});
 res.json({success:true,current:req.params.id===req.sessionId});
});

// GET /api/auth/status – is a password configured? Is onboarding done?
router.get('/status', (req, res) => {
  const configured = db.users.count() > 0;
  const appName = db.settings.get('wl_app_name') || 'Shipyard';
  const appTagline = db.settings.get('wl_app_tagline') || 'Infrastructure';
  const accentColor = db.settings.get('wl_accent_color') || '#3b82f6';
  const logoIcon = db.settings.get('wl_logo_icon') || 'fa-ship';
  const logoImage = db.settings.get('wl_logo_image') || '';
  res.json({
    configured,
    onboardingDone: !!db.settings.get('onboarding_done'),
    username: 'admin',
    appName,
    appTagline,
    accentColor,
    showIcon: db.settings.get('wl_show_icon') !== '0',
    logoIcon,
    logoImage,
  });
});

// GET /api/auth/profile
router.get('/profile', authSensitiveLimiter, authMiddleware, (req, res) => {
  const { getPermissions } = require('../utils/permissions');
  const permissions = getPermissions(req.user);
  const fullUser = db.users.getById(req.user.id);
  res.json({
    id:          req.user.id,
    username:    req.user.username,
    displayName: fullUser?.display_name || '',
    email:       fullUser?.email || req.user.email || '',
    role:        req.user.role,
    permissions,
  });
});

// PUT /api/auth/profile – users can update their display name and email only
router.put('/profile', authSensitiveLimiter, authMiddleware, (req, res) => {
  const { displayName, email } = requestBody(req);
  const fields = {};
  if (displayName !== undefined) {
    if (typeof displayName !== 'string') return res.status(400).json({ error: 'displayName must be a string' });
    fields.display_name = displayName.trim().replace(/\s+/g, ' ').slice(0, 100);
  }
  if (email !== undefined) {
    const normalizedEmail = normalizeEmail(email);
    if (normalizedEmail && normalizedEmail.error) return res.status(400).json({ error: normalizedEmail.error });
    fields.email = normalizedEmail;
  }

  if (Object.keys(fields).length) {
    try {
      db.users.update(req.user.id, fields);
    } catch (e) {
      return serverError(res, e, 'update profile');
    }
  }

  db.auditLog.write('auth.profile', 'Profile updated', req.ip, true, req.user?.username);
  res.json({ success: true });
});

// POST /api/auth/setup – first-time password setup (only when no users exist)
router.post('/setup', setupLimiter, async (req, res) => {
  if (db.users.count() > 0) {
    return res.status(400).json({ error: 'Users already exist. Use /api/auth/change.' });
  }
  let { username, password } = requestBody(req);
  username = normalizeUsername(username) || 'admin';
  const usernameErr = validateUsername(username);
  if (usernameErr) return res.status(400).json({ error: usernameErr });
  if (!password || typeof password !== 'string' || password.length < 12) {
    return res.status(400).json({ error: 'Password must be at least 12 characters' });
  }
  const hash = await bcrypt.hash(password, 12);
  let user;
  try {
    // Atomic: race-safe when two setup requests arrive concurrently.
    user = db.users.createFirstAdmin(username, hash);
  } catch (e) {
    if (e.code === 'ALREADY_SETUP') {
      return res.status(400).json({ error: 'Users already exist. Use /api/auth/change.' });
    }
    return serverError(res, e, 'setup');
  }

  db.auditLog.write('auth.setup', `Initial admin user created: ${username}`, req.ip, true, username);
  res.json({ token: makeToken(user, req) });
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = requestBody(req);
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Password required' });
  }

  let user = null;

  if (username) {
    user = db.users.getByUsername(normalizeUsername(username));
  } else {
    // No username provided — try single-user shortcut
    const all = db.users.getAll();
    if (all.length === 1) {
      user = db.users.getByUsername(all[0].username);
    }
  }

  if (!user) {
    // Constant-time comparison to prevent timing leaks
    await bcrypt.compare(password, DUMMY_HASH);
    return res.status(401).json({ error: 'Incorrect credentials' });
  }

  const valid = await bcrypt.compare(password, user.password_hash || DUMMY_HASH);
  if (!valid) {
    db.auditLog.write('auth.login', `Failed login attempt for ${user.username}`, req.ip, false, user.username);
    return res.status(401).json({ error: 'Incorrect credentials' });
  }
  // Password hashing yields: use the current account and MFA state, not the
  // snapshot from before verification, when deciding which token to issue.
  const verifiedHash=user.password_hash;
  const verifiedVersion=user.token_version || 0;
  const currentIdentity=db.users.getById(user.id);
  user=currentIdentity ? db.users.getByUsername(currentIdentity.username) : null;
  if(!user || user.password_hash!==verifiedHash || (user.token_version || 0)!==verifiedVersion) {
    return res.status(401).json({error:'Credentials changed. Please sign in again.'});
  }
  if (user.disabled) {
    db.auditLog.write('auth.login', `Login blocked for disabled account: ${user.username}`, req.ip, false, user.username);
    return res.status(401).json({ error: 'Account disabled' });
  }

  // If 2FA is enabled for this user, issue a short-lived temp token
  if (user.totp_enabled) {
    // Bind the intermediate token to this exact account session generation.
    // It becomes unusable immediately when 2FA, the password, or the role is
    // changed and its token version is rotated.
    const tempToken = makeTempToken({ totp_pending: true, userId: user.id, tv: user.token_version || 0 });
    return res.json({ requires2FA: true, tempToken });
  }

  if(requiresMfa(user)) {
    db.auditLog.write('auth.mfa_enrollment','Password verified; MFA enrollment required',req.ip,true,user.username);
    return res.set('Cache-Control','no-store').json({token:makeToken(user,req),requiresMfaEnrollment:true});
  }

  db.users.markLogin(user.id);
  db.auditLog.write('auth.login', `Successful login: ${user.username}`, req.ip, true, user.username);
  res.json({ token: makeToken(user, req) });
});

// POST /api/auth/change – change password (requires valid JWT)
router.post('/change', changeLimiter, authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = requestBody(req);
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword required' });
  }
  if (typeof newPassword !== 'string' || newPassword.length < 12) {
    return res.status(400).json({ error: 'New password must be at least 12 characters' });
  }

  const fullUser = db.users.getByUsername(req.user.username);
  if (!fullUser) return res.status(404).json({ error: 'User not found' });
  const valid = await bcrypt.compare(currentPassword, fullUser.password_hash);
  if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
  const newHash = await bcrypt.hash(newPassword, 12);
  db.users.setPasswordHash(req.user.id, newHash);
  // Increment per-user token version to invalidate only this user's tokens
  db.users.incrementTokenVersion(req.user.id);
  db.auditLog.write('auth.change', `Password changed for ${req.user.username}, user tokens invalidated`, req.ip, true, req.user.username);
  // Issue a fresh token so the user isn't logged out
  const updatedUser = db.users.getById(req.user.id);
  res.json({ success: true, token: makeToken(updatedUser, req) });
});

// ── TOTP / 2FA ───────────────────────────────────────────────

// POST /api/auth/totp/login – verify TOTP code after password step
router.post('/totp/login', loginLimiter, (req, res) => {
  const { tempToken, code } = requestBody(req);
  if (!tempToken || !code) return res.status(400).json({ error: 'tempToken and code required' });

  let payload;
  try { payload = jwt.verify(tempToken, getJwtSecret()); }
  catch { return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' }); }

  if (!payload.totp_pending || !payload.userId || !Number.isInteger(payload.tv)) {
    return res.status(401).json({ error: 'Invalid token type' });
  }

  const user = db.users.getByUsername(
    db.users.getById(payload.userId)?.username || ''
  );
  if (!user) return res.status(401).json({ error: 'User not found' });
  if (user.disabled) return res.status(401).json({ error: 'Account disabled' });
  if (!user.totp_enabled || payload.tv !== (user.token_version || 0)) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
  const secret = db.users.getTotpSecret(user.id);
  if (!secret) return res.status(400).json({ error: '2FA not configured' });
  if (!verifyTotp(code, secret)) {
    db.auditLog.write('auth.totp', 'Invalid TOTP code', req.ip, false, user.username);
    return res.status(401).json({ error: 'Invalid authenticator code' });
  }
  db.users.markLogin(user.id);
  db.auditLog.write('auth.login', `Successful login (2FA): ${user.username}`, req.ip, true, user.username);
  res.json({ token: makeToken(user, req) });
});

// GET /api/auth/totp/status – is 2FA enabled?
router.get('/totp/status', authSensitiveLimiter, authMiddleware, (req, res) => {
  res.json({ enabled: !!req.user.totp_enabled, required: requiresMfa(req.user), policy: mfaPolicy() });
});

function currentMfaUser(req) {
  const user=db.users.getById(req.user.id);
  if(!user || user.disabled || (user.token_version || 0)!==(req.user.token_version || 0)
    || !validSession(req.authPayload,req.headers.authorization.slice(7))) {
    throw Object.assign(new Error('Session changed. Sign in again before changing MFA.'),{status:401});
  }
  return user;
}
function mfaError(res,error,context) {
  if(error.status)return res.status(error.status).json({error:error.message});
  return serverError(res,error,context);
}

// Prepare the QR first; failed rendering must not replace a working pending setup.
router.post('/totp/setup', authSensitiveLimiter, authMiddleware, async (req, res) => {
  res.set('Cache-Control','no-store');
  try {
    if(req.user.totp_enabled)return res.status(409).json({error:'MFA is already enabled. Disable the existing factor before setting up a replacement.'});
    const previousPending=db.users.getPendingTotpSecret(req.user.id);
    const secret=previousPending || otplib.generateSecret();
    const appName=db.settings.get('wl_app_name') || 'Shipyard';
    const otpauthUrl=otplib.generateURI({label:req.user.username,issuer:appName,secret});
    const qrDataUrl=await QRCode.toDataURL(otpauthUrl);
    db.db.transaction(()=>{
      const current=currentMfaUser(req);
      if(current.totp_enabled || db.users.getPendingTotpSecret(current.id)!==previousPending) {
        throw Object.assign(new Error('MFA setup changed. Reload before starting again.'),{status:409});
      }
      if(!previousPending) {
        db.users.setPendingTotp(current.id,secret);
        db.auditLog.write('auth.totp','MFA setup prepared',req.ip,true,current.username);
      }
    }).immediate();
    res.json({secret,otpauthUrl,qrDataUrl});
  } catch(error) { mfaError(res,error,'totp setup'); }
});

router.post('/totp/confirm', authSensitiveLimiter, authMiddleware, (req, res) => {
  res.set('Cache-Control','no-store');
  const {code}=requestBody(req);
  if(!code)return res.status(400).json({error:'code required'});
  try {
    const token=db.db.transaction(()=>{
      const current=currentMfaUser(req);
      if(current.totp_enabled)throw Object.assign(new Error('MFA is already enabled.'),{status:409});
      const secret=db.users.getPendingTotpSecret(current.id);
      if(!secret)throw Object.assign(new Error('No pending TOTP setup. Call /totp/setup first.'),{status:400});
      if(!verifyTotp(code,secret))throw Object.assign(new Error('Invalid code – try again'),{status:400});
      db.users.setTotp(current.id,secret,true);
      db.users.setPendingTotp(current.id,'');
      db.users.incrementTokenVersion(current.id);
      db.auditLog.write('auth.totp','2FA enabled',req.ip,true,current.username);
      return makeToken(db.users.getById(current.id),req);
    }).immediate();
    res.json({success:true,token});
  } catch(error) { mfaError(res,error,'totp confirm'); }
});

router.delete('/totp', authSensitiveLimiter, authMiddleware, async (req,res)=>{
  res.set('Cache-Control','no-store');
  const {password}=requestBody(req);
  if(!password || typeof password!=='string')return res.status(400).json({error:'Password required to disable 2FA'});
  try {
    const full=db.users.getByUsername(req.user.username);
    if(!full)return res.status(404).json({error:'User not found'});
    if(!await bcrypt.compare(password,full.password_hash))return res.status(401).json({error:'Incorrect password'});
    const token=db.db.transaction(()=>{
      const current=currentMfaUser(req);
      if(requiresMfa(current))throw Object.assign(new Error('MFA is required by workspace policy and cannot be disabled.'),{status:403});
      const latest=db.users.getByUsername(current.username);
      if(latest.password_hash!==full.password_hash)throw Object.assign(new Error('Credentials changed. Sign in again.'),{status:401});
      db.users.setTotp(current.id,'',false);
      db.users.setPendingTotp(current.id,'');
      db.users.incrementTokenVersion(current.id);
      db.auditLog.write('auth.totp','2FA disabled',req.ip,true,current.username);
      return makeToken(db.users.getById(current.id),req);
    }).immediate();
    res.json({success:true,token});
  } catch(error) { mfaError(res,error,'totp disable'); }
});

module.exports = { router };
