const express = require('express');
const router = express.Router();
const db = require('../db');
const gitSync = require('../services/git-sync');
const { adminOnly } = require('../middleware/auth');
const { serverError } = require('../utils/http-error');

// All git-playbooks routes are admin-only
router.use(adminOnly);

function requireBool(val, name) {
  if (val === undefined) return undefined;
  if (typeof val !== 'boolean') throw Object.assign(new Error(`${name} must be a boolean`), { status: 400 });
  return val;
}

// Empty identities retain the documented default; local email domains are valid.
function requireGitIdentity(userName, userEmail) {
  for (const [field, value, limit] of [['userName', userName, 200], ['userEmail', userEmail, 254]]) {
    if (value === undefined) continue;
    if (typeof value !== 'string' || value.length > limit || /[\x00-\x1f\x7f<>]/.test(value)) {
      throw new Error(`${field} must be text of at most ${limit} characters without control characters or angle brackets`);
    }
  }
  if (userEmail?.trim() && !/^[^\s@]+@[^\s@]+$/.test(userEmail.trim())) {
    throw new Error('userEmail must contain an email address, for example shipyard@localhost');
  }
}

function gitPolicySnapshot() {
  const {autoPull,autoPush,readOnly}=gitSync.getConfig();
  return {autoPull,autoPush,readOnly};
}
function auditGitSettings(req, action, before) {
  const keys=['autoPull','autoPush','readOnly','userName','userEmail','credentialMode','authToken','sshKey'].filter(key=>req.body[key] !== undefined);
  db.auditLog.write(action, `fields=${JSON.stringify(keys.join(','))} before=${JSON.stringify(JSON.stringify(before))} after=${JSON.stringify(JSON.stringify(gitPolicySnapshot()))}`, req.ip, true, req.user?.username);
}

// Test submitted credentials without changing the configured repository.
router.post('/test', async (req, res) => {
  try { res.json(await require('../services/git-connection-test').testConnection(req.body || {})); }
  catch (error) { res.status(error.status || 500).json({ error: error.status ? error.message : 'Repository check could not be completed.' }); }
});

// GET /api/playbooks-git/config
router.get('/config', (req, res) => {
  const cfg = gitSync.getConfig();
  res.json({
    repoUrl:   cfg.repoUrl,
    hasToken:  !!cfg.authToken,
    hasSshKey: !!cfg.sshKey,
    autoPull:  cfg.autoPull,
    autoPush:  cfg.autoPush,
    readOnly:  cfg.readOnly,
    userName:  cfg.userName,
    userEmail: cfg.userEmail,
    branch:    cfg.branch,
    configured: gitSync.isConfigured(),
  });
});

// POST /api/playbooks-git/disconnect
router.post('/disconnect', async (req, res) => {
  try {
    await gitSync.clearConnectionArtifacts();
    db.db.transaction(() => {
      ['git_repo_url','git_auth_token','git_ssh_key','git_auto_pull','git_auto_push',
       'git_user_name','git_user_email','git_branch','git_read_only','git_last_pull_at','git_last_fetch_at','git_last_fetch_repo']
        .forEach(key => db.settings.set(key, ''));
      db.auditLog.write('git.disconnect', 'Repository connection removed; local workspace retained.', req.ip, true, req.user?.username);
    })();
    res.json({ success: true });
  } catch (error) { serverError(res, error, 'disconnect Git'); }
});

// POST /api/playbooks-git/settings
router.post('/settings', (req, res) => {
  const db = require('../db');
  const { autoPull, autoPush, readOnly } = req.body;
  try { requireBool(autoPull, 'autoPull'); requireBool(autoPush, 'autoPush'); requireBool(readOnly, 'readOnly'); }
  catch (e) { return res.status(400).json({ error: e.message }); }
  try {
  db.db.transaction(() => {
  const before = gitPolicySnapshot();
  if (readOnly !== undefined) {
    db.settings.set('git_read_only', readOnly ? '1' : '0');
    if (readOnly) db.settings.set('git_auto_push', '0');
  }
  if (autoPull !== undefined) db.settings.set('git_auto_pull', autoPull ? '1' : '0');
  if (autoPush !== undefined) db.settings.set('git_auto_push', autoPush && !gitSync.getConfig().readOnly ? '1' : '0');
  auditGitSettings(req, 'git.settings_update', before);
  })();
  res.json({ success: true });
  } catch (error) { serverError(res, error, 'update Git settings'); }
});

// POST /api/playbooks-git/setup  (initial config + clone/init)
router.post('/setup', async (req, res) => {
  const { repoUrl, authToken, sshKey, autoPull, autoPush, readOnly, userName, userEmail, branch } = req.body;
  const urlCheck = gitSync.validateGitUrl(repoUrl);
  if (!urlCheck.ok) return res.status(400).json({ error: urlCheck.error });
  if (branch !== undefined && !gitSync.validateBranchName(branch)) {
    return res.status(400).json({ error: 'Invalid branch name' });
  }
  try { requireBool(autoPull, 'autoPull'); requireBool(autoPush, 'autoPush'); requireBool(readOnly, 'readOnly'); requireGitIdentity(userName, userEmail); }
  catch (e) { return res.status(400).json({ error: e.message }); }

  try {
    const result = await gitSync.setup({ repoUrl, authToken, sshKey, autoPull, autoPush, readOnly, userName: userName?.trim(), userEmail: userEmail?.trim(), branch });
    if (!result.success) return res.status(400).json({ error: result.error });
    res.json({ success: true, synchronized: result.synchronized, pullOutput: result.pullOutput });
  } catch (e) {
    serverError(res, e, 'git setup');
  }
});

// PUT /api/playbooks-git/config  (update settings without re-cloning)
router.put('/config', (req, res) => {
  const { autoPull, autoPush, readOnly, userName, userEmail, authToken, sshKey, credentialMode } = req.body;
  try { requireBool(autoPull, 'autoPull'); requireBool(autoPush, 'autoPush'); requireBool(readOnly, 'readOnly'); requireGitIdentity(userName, userEmail); }
  catch (e) { return res.status(400).json({ error: e.message }); }
  try {
    db.db.transaction(() => {
      const before = gitPolicySnapshot();
      if (readOnly !== undefined) {
        db.settings.set('git_read_only', readOnly ? '1' : '0');
        if (readOnly) db.settings.set('git_auto_push', '0');
      }
      if (autoPull  !== undefined) db.settings.set('git_auto_pull',  autoPull  ? '1' : '0');
      if (autoPush  !== undefined) db.settings.set('git_auto_push',  autoPush && !gitSync.getConfig().readOnly ? '1' : '0');
      if (userName  !== undefined) db.settings.set('git_user_name',  userName.trim());
      if (userEmail !== undefined) db.settings.set('git_user_email', userEmail.trim());
      if (credentialMode !== undefined || authToken !== undefined || sshKey !== undefined) {
        const mode = credentialMode !== undefined ? credentialMode : (sshKey !== undefined ? 'ssh' : 'https');
        try { gitSync.updateCredentials({ mode, authToken, sshKey }); }
        catch (error) { error.status = 400; throw error; }
      }
      auditGitSettings(req, 'git.config_update', before);
    })();
    res.json({ success: true });
  } catch (error) {
    if (error.status === 400) return res.status(400).json({error:error.message});
    serverError(res, error, 'update Git configuration');
  }
});


// GET /api/playbooks-git/branches
router.get('/branches', async (req, res) => {
  try { res.json(await gitSync.getBranches()); }
  catch (e) { serverError(res, e, 'git branches'); }
});

// POST /api/playbooks-git/checkout
router.post('/checkout', async (req, res) => {
  const { branch } = req.body;
  if (!gitSync.validateBranchName(branch)) return res.status(400).json({ error: 'Invalid branch name' });
  try {
    const r = await gitSync.checkout(branch);
    if (!r.success) return res.status(500).json({ error: r.stderr });
    res.json({ success: true, output: r.stdout });
  } catch (e) { serverError(res, e, 'git checkout'); }
});

// GET /api/playbooks-git/status
router.get('/status', async (req, res) => {
  try { res.json(await gitSync.getStatus()); }
  catch (e) { serverError(res, e, 'git status'); }
});

// GET /api/playbooks-git/log
router.get('/log', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  try { res.json(await gitSync.getLog({ page, limit })); }
  catch (e) { serverError(res, e, 'git log'); }
});

// Refresh remote refs without copying, staging, merging or publishing files.
router.post('/fetch', async (req, res) => {
  try {
    const result = await gitSync.fetchRemote();
    if (!result.success) return res.status(502).json({error:result.stderr || 'Remote check failed'});
    res.json({success:true});
  } catch (error) { serverError(res, error, 'git fetch'); }
});

// POST /api/playbooks-git/pull
router.post('/pull', async (req, res) => {
  try {
    const r = await gitSync.pull();
    if (!r.success) return res.status(500).json({ error: r.stderr });
    res.json({ success: true, output: r.stdout });
  } catch (e) { serverError(res, e, 'git pull'); }
});

// POST /api/playbooks-git/commit
router.post('/commit', async (req, res) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string') return res.status(400).json({ error: 'message required' });
  if (message.length > 500) return res.status(400).json({ error: 'message too long' });
  try {
    const r = await gitSync.commit(message);
    if (!r.success) return res.status(400).json({ error: r.stderr || 'Nothing to commit' });
    res.json({ success: true, output: r.stdout });
  } catch (e) { serverError(res, e, 'git commit'); }
});

// POST /api/playbooks-git/push
router.post('/push', async (req, res) => {
  const { message } = req.body || {};
  try {
    const r = await gitSync.push(message);
    if (!r.success) return res.status(r.code === 'READ_ONLY' ? 409 : 500).json({ error: r.stderr });
    res.json({ success: true, output: r.stdout });
  } catch (e) { serverError(res, e, 'git push'); }
});

module.exports = router;
