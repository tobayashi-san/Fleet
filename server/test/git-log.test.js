'use strict';
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'shipyard-git-log-'));
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

test('commit history preserves delimiters and exposes absolute author time', async () => {
  const subject = 'Fix | deploy | status';
  execFileSync('git', ['-c', 'user.name=Review | Author', '-c', 'user.email=review@example.invalid', 'commit', '--allow-empty', '-m', subject], {
    cwd: workspace, stdio: 'pipe',
    env: { ...process.env, GIT_AUTHOR_DATE: '2026-09-09T13:45:00+02:00', GIT_COMMITTER_DATE: '2026-09-09T14:00:00+02:00' },
  });
  const result = await service.getLog({page:1,limit:1});
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].message, subject);
  assert.equal(result.items[0].author, 'Review | Author');
  assert.equal(result.items[0].date, '2026-09-09T13:45:00+02:00');
  assert.equal(result.pagination.has_next, true);
});

test('unborn branches are empty but damaged commit references produce a load error', async () => {
 const original = git(workspace,'symbolic-ref','HEAD');
 try {
  git(workspace,'symbolic-ref','HEAD','refs/heads/unborn-review');
  assert.equal((await service.getLog()).items.length,0);
  fs.writeFileSync(path.join(workspace,'.git','refs','heads','unborn-review'),'a'.repeat(40)+'\n');
  await assert.rejects(service.getLog(),/could not be counted/);
 } finally {
  fs.rmSync(path.join(workspace,'.git','refs','heads','unborn-review'),{force:true});
  git(workspace,'symbolic-ref','HEAD',original);
 }
});

test('branch listing reports repository failure rather than an empty inventory', async () => {
 const configPath = path.join(workspace,'.git','config');
 const original = fs.readFileSync(configPath);
 try {
  fs.writeFileSync(configPath,'[invalid config');
  await assert.rejects(service.getBranches(),/branches could not be read/);
 } finally { fs.writeFileSync(configPath,original); }
});

test('detached status is explicit and failed runtime file synchronization is not hidden', async () => {
 const branch = git(workspace,'symbolic-ref','HEAD');
 const revision = git(workspace,'rev-parse','HEAD');
 try {
  git(workspace,'checkout','--detach',revision);
  assert.equal((await service.getStatus()).branch,'Detached HEAD');
  fs.mkdirSync(path.join(runtime,'invalid.yml'));
  await assert.rejects(service.getStatus());
 } finally {
  fs.rmSync(path.join(runtime,'invalid.yml'),{recursive:true,force:true});
  git(workspace,'symbolic-ref','HEAD',branch);
 }
});

test('disconnect cleanup removes legacy credential-bearing origin while retaining files and commits', async () => {
 const revision=git(workspace,'rev-parse','HEAD');
 const contents=fs.readFileSync(path.join(workspace,'playbooks','example.yml'),'utf8');
 git(workspace,'remote','set-url','origin','https://oauth2:legacy-secret@example.test/repo');
 await service.clearConnectionArtifacts();
 assert.ok(!fs.readFileSync(path.join(workspace,'.git','config'),'utf8').includes('legacy-secret'));
 assert.equal(git(workspace,'remote'),'');
 assert.equal(git(workspace,'rev-parse','HEAD'),revision);
 assert.equal(fs.readFileSync(path.join(workspace,'playbooks','example.yml'),'utf8'),contents);
 await service.clearConnectionArtifacts();
});
