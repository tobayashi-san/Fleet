'use strict';
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'shipyard-git-preserve-'));
const workspace = path.join(root, 'workspace');
const runtime = path.join(root, 'playbooks');
const remote = path.join(root, 'remote');
process.env.DB_PATH = path.join(root, 'test.db');
process.env.SHIPYARD_GIT_WORKSPACE_DIR = workspace;
process.env.SHIPYARD_PLAYBOOKS_DIR = runtime;
process.env.NODE_ENV = 'test';
fs.mkdirSync(runtime);
fs.mkdirSync(remote);
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
git(remote, 'init', '-b', 'main');
git(remote, 'config', 'user.name', 'Test');
git(remote, 'config', 'user.email', 'test@example.invalid');
fs.mkdirSync(path.join(remote, 'playbooks'));
fs.writeFileSync(path.join(remote, 'playbooks', 'example.yml'), 'original\n');
git(remote, 'add', '.'); git(remote, 'commit', '-m', 'initial');
git(root, 'clone', remote, workspace);
fs.writeFileSync(path.join(runtime, 'example.yml'), 'original\n');
const db = require('../db');
const service = require('../services/git-sync');
// Trusted local repository only: this test must never contact a network remote.
db.settings.set('git_repo_url', remote);
db.settings.set('git_branch', 'main');
after(() => { db.db.close(); fs.rmSync(root, { recursive: true, force: true }); });

test('auto-push requires explicit opt-in', () => {
  assert.equal(service.getConfig().autoPush, false);
  db.settings.set('git_auto_push', '1');
  assert.equal(service.getConfig().autoPush, true);
  db.settings.set('git_auto_push', '0');
  assert.equal(service.getConfig().autoPush, false);
});

test('pull and branch switch preserve local runtime edits and report changed filenames accurately', async () => {
  fs.writeFileSync(path.join(runtime, 'example.yml'), 'local edit\n');
  const before = git(workspace, 'rev-parse', 'HEAD');
  const status = await service.getStatus();
  assert.deepEqual(status.changed, [{ status: 'M', file: 'playbooks/example.yml' }]);
  assert.equal(status.revision, before);
  assert.match((await service.pull()).stderr, /Local changes/);
  assert.match((await service.checkout('another')).stderr, /Local changes/);
  assert.equal(git(workspace, 'rev-parse', 'HEAD'), before);
  assert.equal(fs.readFileSync(path.join(runtime, 'example.yml'), 'utf8'), 'local edit\n');
  fs.writeFileSync(path.join(runtime, 'example.yml'), 'original\n');
});

test('clean fast-forward imports remote content and records successful collection time', async () => {
  fs.writeFileSync(path.join(remote, 'playbooks', 'example.yml'), 'remote update\n');
  git(remote, 'add', '.'); git(remote, 'commit', '-m', 'remote update');
  const result = await service.pull();
  assert.equal(result.success, true, result.stderr);
  assert.equal(fs.readFileSync(path.join(runtime, 'example.yml'), 'utf8'), 'remote update\n');
  const status = await service.getStatus();
  assert.ok(Date.parse(status.lastPullAt));
  assert.deepEqual(status.changed, []);
  assert.deepEqual(status.comparison, {state:'aligned',ahead:0,behind:0});
  assert.ok(Date.parse(status.lastFetchAt));
});

test('remote check refreshes comparison without importing or staging local files', async () => {
  const head = git(workspace, 'rev-parse', 'HEAD');
  const index = git(workspace, 'ls-files', '--stage');
  const imported = fs.readFileSync(path.join(runtime, 'example.yml'), 'utf8');
  fs.writeFileSync(path.join(remote, 'playbooks', 'example.yml'), 'fetched only\n');
  git(remote, 'add', '.'); git(remote, 'commit', '-m', 'fetch only');
  assert.equal((await service.fetchRemote()).success, true);
  assert.equal(git(workspace, 'rev-parse', 'HEAD'), head);
  assert.equal(git(workspace, 'ls-files', '--stage'), index);
  assert.equal(fs.readFileSync(path.join(runtime, 'example.yml'), 'utf8'), imported);
  assert.equal(fs.readFileSync(path.join(workspace, 'playbooks', 'example.yml'), 'utf8'), imported);
  assert.deepEqual((await service.getStatus()).comparison, {state:'behind',ahead:0,behind:1});
  assert.equal((await service.pull()).success, true);
});

test('divergent commits are not reset or merged automatically', async () => {
  fs.writeFileSync(path.join(runtime, 'local.yml'), 'local commit\n');
  assert.equal((await service.commit('local')).success, true);
  const head = git(workspace, 'rev-parse', 'HEAD');
  const lastPull = db.settings.get('git_last_pull_at');
  fs.writeFileSync(path.join(remote, 'playbooks', 'remote.yml'), 'remote commit\n');
  git(remote, 'add', '.'); git(remote, 'commit', '-m', 'divergent remote');
  const result = await service.pull();
  assert.equal(result.success, false);
  assert.match(result.stderr, /fast-forward/);
  assert.equal(git(workspace, 'rev-parse', 'HEAD'), head);
  assert.equal(fs.readFileSync(path.join(runtime, 'local.yml'), 'utf8'), 'local commit\n');
  assert.equal(db.settings.get('git_last_pull_at'), lastPull);
  const status = await service.getStatus();
  assert.deepEqual(status.comparison, {state:'diverged',ahead:1,behind:1});
  assert.ok(Date.parse(status.lastFetchAt));
});

test('remote read-only blocks direct and automatic publishing before staging or committing', async () => {
  db.settings.set('git_read_only', '1');
  db.settings.set('git_auto_push', '1');
  fs.writeFileSync(path.join(runtime, 'local.yml'), 'unpublished edit\n');
  const before = git(workspace, 'rev-parse', 'HEAD');
  const result = await service.push('must not commit');
  assert.equal(result.code, 'READ_ONLY');
  assert.equal(result.success, false);
  await service.autoPush('must not auto-commit');
  assert.equal(git(workspace, 'rev-parse', 'HEAD'), before);
  assert.equal(service.getConfig().autoPush, false);
  assert.equal(fs.readFileSync(path.join(runtime, 'local.yml'), 'utf8'), 'unpublished edit\n');
});

test('API validates and enforces remote read-only without implicitly restoring automatic pushes', async () => {
  const express = require('express');
  const request = require('supertest');
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => { req.user = { role: req.headers['x-test-role'] || 'admin' }; next(); });
  app.use('/git', require('../routes/git-playbooks'));
  assert.equal((await request(app).post('/git/settings').send({ readOnly: 'true' })).status, 400);
  assert.equal((await request(app).post('/git/settings').set('x-test-role', 'viewer').send({ readOnly: false })).status, 403);
  assert.equal((await request(app).post('/git/settings').send({ readOnly: true, autoPush: true })).status, 200);
  const cfg = await request(app).get('/git/config');
  assert.equal(cfg.body.readOnly, true);
  assert.equal(cfg.body.autoPush, false);
  assert.equal((await request(app).post('/git/push').send({})).status, 409);
  assert.equal((await request(app).put('/git/config').send({ readOnly: false })).status, 200);
  assert.equal(service.getConfig().autoPush, false);
  assert.equal(service.getConfig().readOnly, false);
});

test('conflict inspection and publishing preserve unresolved merge files and index stages', async () => {
  db.settings.set('git_read_only', '0');
  git(workspace, 'reset', '--hard', 'HEAD');
  git(workspace, 'checkout', '-b', 'conflict-side');
  fs.writeFileSync(path.join(workspace, 'playbooks', 'example.yml'), 'side version\n');
  git(workspace, 'add', '.'); git(workspace, 'commit', '-m', 'side conflict');
  git(workspace, 'checkout', 'main');
  fs.writeFileSync(path.join(workspace, 'playbooks', 'example.yml'), 'main version\n');
  git(workspace, 'add', '.'); git(workspace, 'commit', '-m', 'main conflict');
  assert.throws(() => git(workspace, 'merge', 'conflict-side'));
  const conflicted = fs.readFileSync(path.join(workspace, 'playbooks', 'example.yml'), 'utf8');
  assert.match(conflicted, /<<<<<<< HEAD/);
  const stages = git(workspace, 'ls-files', '-u');
  const head = git(workspace, 'rev-parse', 'HEAD');
  fs.writeFileSync(path.join(runtime, 'example.yml'), 'runtime must not replace conflict\n');
  const status = await service.getStatus();
  assert.deepEqual(status.conflicts, ['playbooks/example.yml']);
  assert.ok(status.changed.some(row => row.status === 'UU'));
  db.settings.set('git_auto_push', '1');
  await service.autoPush('must preserve conflict');
  assert.equal(git(workspace, 'ls-files', '-u'), stages);
  assert.equal(fs.readFileSync(path.join(workspace, 'playbooks', 'example.yml'), 'utf8'), conflicted);
  for (const action of [() => service.commit('unsafe'), () => service.push('unsafe'), () => service.pull(), () => service.checkout('conflict-side')]) {
    const result = await action();
    assert.equal(result.code, 'MERGE_CONFLICT');
    assert.equal(result.success, false);
    assert.equal(git(workspace, 'rev-parse', 'HEAD'), head);
    assert.equal(git(workspace, 'ls-files', '-u'), stages);
    assert.equal(fs.readFileSync(path.join(workspace, 'playbooks', 'example.yml'), 'utf8'), conflicted);
    assert.equal(fs.readFileSync(path.join(runtime, 'example.yml'), 'utf8'), 'runtime must not replace conflict\n');
  }
});


test('remote check can refresh refs during a conflict and prunes a deleted remote branch', async () => {
  const bytes = fs.readFileSync(path.join(workspace, 'playbooks', 'example.yml'), 'utf8');
  const stages = git(workspace, 'ls-files', '-u');
  git(remote, 'branch', '-m', 'retired');
  assert.equal((await service.fetchRemote()).success, true);
  assert.equal(git(workspace, 'ls-files', '-u'), stages);
  assert.equal(fs.readFileSync(path.join(workspace, 'playbooks', 'example.yml'), 'utf8'), bytes);
  assert.deepEqual((await service.getStatus()).comparison, {state:'unavailable',ahead:null,behind:null});
});

test('remote-check route requires admin access and does not record a failed fetch as fresh', async () => {
  const express = require('express');
  const request = require('supertest');
  const app = express();
  app.use((req, _res, next) => { req.user = {role:req.headers['x-test-role'] || 'viewer'}; next(); });
  app.use('/git', require('../routes/git-playbooks'));
  assert.equal((await request(app).post('/git/fetch')).status, 403);
  const lastFetch = db.settings.get('git_last_fetch_at');
  fs.renameSync(remote, `${remote}-offline`);
  try {
    const result = await request(app).post('/git/fetch').set('x-test-role', 'admin');
    assert.equal(result.status, 502);
    assert.equal(db.settings.get('git_last_fetch_at'), lastFetch);
  } finally { fs.renameSync(`${remote}-offline`, remote); }
  assert.equal((await request(app).post('/git/fetch').set('x-test-role', 'admin')).status, 200);
});

test('pull removes remotely deleted tracked playbooks without deleting local backups', async () => {
 // Separate clean branch avoids depending on earlier divergence/conflict cases.
 git(workspace,'reset','--hard','origin/retired');
 git(workspace,'checkout','-B','deletion-review');
 git(remote,'checkout','-B','deletion-review');
 fs.writeFileSync(path.join(remote,'playbooks','removed.yml'),'remove me\n');
 git(remote,'add','.');git(remote,'commit','-m','add removable playbook');
 db.settings.set('git_branch','deletion-review');
 // Align runtime with the existing workspace before importing the new branch.
 for(const f of fs.readdirSync(runtime)) if(/\.ya?ml$/.test(f)) fs.rmSync(path.join(runtime,f));
 for(const f of fs.readdirSync(path.join(workspace,'playbooks'))) if(/\.ya?ml$/.test(f)) fs.copyFileSync(path.join(workspace,'playbooks',f),path.join(runtime,f));
 assert.equal((await service.pull()).success,true);
 fs.writeFileSync(path.join(runtime,'removed.bak.yml'),'backup retained\n');
 git(remote,'rm','playbooks/removed.yml');git(remote,'commit','-m','remove playbook');
 assert.equal((await service.pull()).success,true);
 assert.equal(fs.existsSync(path.join(runtime,'removed.yml')),false);
 assert.equal(fs.readFileSync(path.join(runtime,'removed.bak.yml'),'utf8'),'backup retained\n');
});

test('checkout of a branch without playbooks removes old runtime files and status cannot resurrect them', async () => {
 const originalBranch = git(workspace,'branch','--show-current');
 const originalFiles = fs.readdirSync(path.join(workspace,'playbooks')).filter(file=>/\.ya?ml$/.test(file));
 assert.ok(originalFiles.length);
 git(workspace,'checkout','-b','empty-playbooks-review');
 git(workspace,'rm','-r','playbooks');
 git(workspace,'commit','-m','remove playbook directory');
 git(workspace,'checkout',originalBranch);
 const result = await service.checkout('empty-playbooks-review');
 assert.equal(result.success,true,result.stderr);
 for(const file of originalFiles) assert.equal(fs.existsSync(path.join(runtime,file)),false);
 assert.equal(fs.readFileSync(path.join(runtime,'removed.bak.yml'),'utf8'),'backup retained\n');
 const status = await service.getStatus();
 assert.deepEqual(status.changed,[]);
 for(const file of originalFiles) assert.equal(fs.existsSync(path.join(workspace,'playbooks',file)),false);
 assert.equal((await service.checkout(originalBranch)).success,true);
 for(const file of originalFiles) assert.equal(fs.existsSync(path.join(runtime,file)),true);
});
