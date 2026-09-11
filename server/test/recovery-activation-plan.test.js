'use strict';
const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const Database = require('better-sqlite3');
const {createApplicationBackup, restoreApplicationBackup} = require('../services/application-backup');
const {planApplicationActivation} = require('../services/recovery-activation-plan');
let root, archive, prepared, target, database;
const passphrase = 'Synthetic activation planning passphrase';
before(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'recovery-activation-plan-'));
  const data = path.join(root, 'original');
  await fs.mkdir(path.join(data, 'ssh'), {recursive: true});
  await fs.writeFile(path.join(data, 'ssh', 'key.enc'), 'synthetic');
  database = new Database(path.join(data, 'shipyard.db'));
  database.exec('CREATE TABLE users (id TEXT, token_version INTEGER); CREATE TABLE app_settings (key TEXT, value TEXT); CREATE TABLE environments (id TEXT)');
  archive = path.join(root, 'application.backup');
  prepared = path.join(root, 'prepared');
  target = path.join(root, 'destination');
  await createApplicationBackup({database, destination: archive, passphrase, offline: true, roots: [{id: 'data', path: data}, {id: 'ssh', path: path.join(data, 'ssh')}, {id: 'ssh-alias', path: path.join(data, 'ssh')}, {id: 'absent', path: path.join(root, 'absent')}]});
  await restoreApplicationBackup(archive, prepared, passphrase);
});
after(async () => { database?.close(); if (root) await fs.rm(root, {recursive: true, force: true}); });
const mappings = () => ({database: path.join(target, 'shipyard.db'), roots: {data: target, ssh: path.join(target, 'ssh'), 'ssh-alias': path.join(target, 'ssh')}});
const plan = targets => planApplicationActivation({archive, prepared, passphrase, targets});

test('verified activation plan consolidates nested roots, aliases and database without changing targets', async () => {
  const result = await plan(mappings());
  assert.equal(result.state, 'planned-not-activated');
  assert.equal(result.operations.length, 1);
  assert.deepEqual(result.operations[0].coveredRoots, ['data', 'ssh', 'ssh-alias']);
  assert.equal(result.operations[0].database.relative, 'shipyard.db');
  assert.deepEqual(result.absentRoots, ['absent']);
  await assert.rejects(fs.stat(target), {code: 'ENOENT'});
});

test('missing mappings and conflicting nested targets are rejected', async () => {
  const missing = mappings(); delete missing.roots.ssh;
  await assert.rejects(plan(missing), /every included/);
  const conflict = mappings(); conflict.roots.ssh = path.join(target, 'wrong-subdirectory');
  await assert.rejects(plan(conflict), /relationships/);
});

test('database cannot overwrite an archived member or the prepared recovery itself', async () => {
  await assert.rejects(plan({...mappings(), database: path.join(target, 'ssh', 'key.enc')}), /overwrite an archived file/);
  await assert.rejects(plan({...mappings(), database: path.join(prepared, 'database.db')}), /separate/);
  await assert.rejects(plan({...mappings(), database: archive}), /source archive/);
});

test('target symlinks are rejected rather than following an unexpected destination', async () => {
  await fs.symlink(root, target);
  try { await assert.rejects(plan(mappings()), /symbolic links/); }
  finally { await fs.unlink(target); }
});

test('CLI emits the reviewed plan and leaves all destinations untouched', async () => {
  const mapping = path.join(root, 'targets.json');
  await fs.writeFile(mapping, JSON.stringify(mappings()));
  const execFile = require('node:util').promisify(require('node:child_process').execFile);
  const result = await execFile(process.execPath, [path.resolve(__dirname, '../cli/recovery-activation.js'), 'plan', archive, prepared, mapping], {env: {...process.env, SHIPYARD_BACKUP_PASSPHRASE: passphrase}});
  assert.equal(JSON.parse(result.stdout).state, 'planned-not-activated');
  assert.equal(result.stdout.includes(passphrase), false);
  await assert.rejects(fs.stat(target), {code: 'ENOENT'});
});

test('prepared content is reauthenticated against the archive before planning', async () => {
  await fs.writeFile(path.join(prepared, 'files', 'ssh', 'key.enc'), 'modified');
  await assert.rejects(plan(mappings()), /differs/);
});
