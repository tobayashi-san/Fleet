'use strict';
const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const Database = require('better-sqlite3');
const {createApplicationBackup, restoreApplicationBackup} = require('../services/application-backup');
const {stageApplicationActivation} = require('../services/recovery-activation-stage');
const {activateApplicationRecovery, rollbackApplicationRecovery, cleanupApplicationStaging} = require('../services/recovery-activation-switch');
let root, database, options;
const applicationKey = 'Synthetic original application encryption key';
before(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'recovery-stage-'));
  const source = path.join(root, 'source'); await fs.mkdir(source);
  await fs.writeFile(path.join(source, 'run.yml'), 'recovered-playbook');
  const cert = path.join(root, 'cert'); await fs.writeFile(cert, 'recovered-certificate');
  database = new Database(path.join(source, 'shipyard.db'));
  database.exec('CREATE TABLE users(id TEXT,token_version INTEGER); CREATE TABLE app_settings(key TEXT,value TEXT); CREATE TABLE environments(id TEXT); INSERT INTO users VALUES (\'admin\',4)');
  const crypto = require('node:crypto');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', crypto.createHash('sha256').update(applicationKey).digest(), iv);
  const encrypted = Buffer.concat([cipher.update('synthetic stored credential'), cipher.final()]);
  database.prepare('INSERT INTO app_settings VALUES (?,?)').run('synthetic-credential', 'enc:' + Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64'));
  const archive = path.join(root, 'archive'), prepared = path.join(root, 'prepared');
  const passphrase = 'Synthetic staging archive passphrase';
  await createApplicationBackup({database, destination: archive, passphrase, offline: true, roots: [{id: 'data', path: source}, {id: 'cert', path: cert}]});
  await restoreApplicationBackup(archive, prepared, passphrase);
  const destination = path.join(root, 'live-data'); await fs.mkdir(destination);
  await fs.writeFile(path.join(destination, 'keep'), 'original-live-data');
  const certTarget = path.join(root, 'live-cert'); await fs.writeFile(certTarget, 'original-live-certificate');
  options = {archive, prepared, passphrase, applicationKey, offline: true, targets: {database: path.join(destination, 'shipyard.db'), roots: {data: destination, cert: certTarget}}};
});
after(async () => { database?.close(); if (root) await fs.rm(root, {recursive: true, force: true}); });
async function originals() {
  assert.equal(await fs.readFile(path.join(root, 'live-data', 'keep'), 'utf8'), 'original-live-data');
  assert.equal(await fs.readFile(path.join(root, 'live-cert'), 'utf8'), 'original-live-certificate');
}
test('staging prepares synchronized sibling copies and database overlay without modifying existing targets', async () => {
  const journalDirectory = path.join(root, 'journal');
  const result = await stageApplicationActivation({...options, journalDirectory});
  assert.equal(result.activated, false);
  const journal = JSON.parse(await fs.readFile(result.journal, 'utf8'));
  assert.equal(journal.state, 'staged-not-activated');
  assert.equal(journal.operations.length, 2);
  assert.equal((await fs.stat(result.journal)).mode & 0o777, 0o600);
  for (const operation of journal.operations) {
    assert.equal(path.dirname(operation.staging), path.dirname(operation.target));
    assert.equal(operation.state, 'staged');
    assert.ok(operation.originalIdentity.ino);
    assert.equal((await fs.stat(operation.staging)).mode & 0o777, 0o700);
    if (operation.id === 'data') {
      const restored = new Database(path.join(operation.staging, 'payload', 'shipyard.db'), {readonly: true});
      try { assert.equal(restored.prepare('SELECT token_version FROM users').get().token_version, 5); }
      finally { restored.close(); }
      assert.equal(await fs.readFile(path.join(operation.staging, 'payload', 'run.yml'), 'utf8'), 'recovered-playbook');
    } else assert.equal(await fs.readFile(path.join(operation.staging, 'payload'), 'utf8'), 'recovered-certificate');
  }
  await originals();
});
test('staging fails closed without offline acknowledgement or with an existing journal', async () => {
  await assert.rejects(stageApplicationActivation({...options, journalDirectory: path.join(root, 'unused'), offline: false}), /stopped/);
  await assert.rejects(stageApplicationActivation({...options, journalDirectory: path.join(root, 'journal')}), {code: 'EEXIST'});
  await originals();
});
test('copy failure cleans only newly created staging material and preserves all target data', async () => {
  const before = (await fs.readdir(root)).sort();
  const cp = fs.cp; let calls = 0;
  fs.cp = async (...args) => { if (++calls === 2) throw Error('synthetic second-copy failure'); return cp(...args); };
  try { await assert.rejects(stageApplicationActivation({...options, journalDirectory: path.join(root, 'failed-journal')}), /synthetic second-copy/); }
  finally { fs.cp = cp; }
  assert.deepEqual((await fs.readdir(root)).sort(), before);
  await originals();
});

test('activation switches all payloads and rollback preserves both originals and post-activation data', async () => {
  const recovery = {...options, journalDirectory: path.join(root, 'switch-journal')};
  await stageApplicationActivation(recovery);
  const activated = await activateApplicationRecovery(recovery);
  assert.equal(activated.activated, true);
  assert.equal(activated.keyVerification.keyVerified, true);
  assert.equal(activated.keyVerification.checkedValues, 1);
  assert.equal(JSON.stringify(activated).includes(applicationKey), false);
  assert.equal(await fs.readFile(path.join(root, 'live-cert'), 'utf8'), 'recovered-certificate');
  assert.equal(await fs.readFile(path.join(root, 'live-data', 'run.yml'), 'utf8'), 'recovered-playbook');
  await fs.writeFile(path.join(root, 'live-data', 'after-activation'), 'preserve-new-work');
  assert.equal((await rollbackApplicationRecovery(recovery)).state, 'rolled-back');
  await originals();
  const journal = JSON.parse(await fs.readFile(path.join(recovery.journalDirectory, 'journal.json'), 'utf8'));
  const data = journal.operations.find(item => item.id === 'data');
  assert.equal(await fs.readFile(path.join(data.staging, 'withdrawn', 'after-activation'), 'utf8'), 'preserve-new-work');
  assert.equal((await rollbackApplicationRecovery(recovery)).state, 'rolled-back');
});

test('failure after a payload rename rolls every target back using identity and retains recovered data', async () => {
  const recovery = {...options, journalDirectory: path.join(root, 'switch-failure-journal')};
  await stageApplicationActivation(recovery);
  const rename = fs.rename; let injected = false;
  fs.rename = async (source, target) => {
    await rename(source, target);
    if (!injected && source.endsWith('/payload') && target === path.join(root, 'live-data')) {
      injected = true; throw Error('synthetic failure after rename');
    }
  };
  try { await assert.rejects(activateApplicationRecovery(recovery), /synthetic failure after rename/); }
  finally { fs.rename = rename; }
  assert.equal(injected, true);
  await originals();
  const journal = JSON.parse(await fs.readFile(path.join(recovery.journalDirectory, 'journal.json'), 'utf8'));
  assert.equal(journal.state, 'rolled-back');
});

test('modified staged payload is refused before any existing target is moved', async () => {
  const recovery = {...options, journalDirectory: path.join(root, 'tampered-stage-journal')};
  const staged = await stageApplicationActivation(recovery);
  const journal = JSON.parse(await fs.readFile(staged.journal, 'utf8'));
  const data = journal.operations.find(item => item.id === 'data');
  await fs.writeFile(path.join(data.staging, 'payload', 'run.yml'), 'tampered');
  await assert.rejects(activateApplicationRecovery(recovery), /differs/);
  await originals();
});

test('a separate process can roll back after the activator exits between rename and journal completion', async () => {
  const recovery = {...options, journalDirectory: path.join(root, 'interrupted-switch-journal')};
  await stageApplicationActivation(recovery);
  const input = path.join(root, 'interrupt-options.json');
  await fs.writeFile(input, JSON.stringify(recovery), {mode: 0o600});
  const execFile = require('node:util').promisify(require('node:child_process').execFile);
  await assert.rejects(execFile(process.execPath, [path.join(__dirname, 'fixtures/recovery-switch-interrupt.js'), input]), error => error.code === 86);
  const journal = JSON.parse(await fs.readFile(path.join(recovery.journalDirectory, 'journal.json'), 'utf8'));
  assert.equal(journal.state, 'activating');
  assert.equal((await rollbackApplicationRecovery(recovery)).state, 'rolled-back');
  await originals();
});

test('missing or incorrect original encryption key prevents switching any target', async () => {
  const recovery = {...options, journalDirectory: path.join(root, 'wrong-key-journal')};
  await stageApplicationActivation(recovery);
  await assert.rejects(activateApplicationRecovery({...recovery, applicationKey: undefined}), /SHIPYARD_KEY_SECRET is required/);
  await assert.rejects(activateApplicationRecovery({...recovery, applicationKey: 'wrong synthetic key'}), /does not authenticate/);
  await originals();
  const journal = JSON.parse(await fs.readFile(path.join(recovery.journalDirectory, 'journal.json'), 'utf8'));
  assert.equal(journal.state, 'staged-not-activated');
  assert.equal(JSON.stringify(journal).includes(applicationKey), false);
});

test('operator CLI stages, activates and rolls back with the original key kept out of output', async () => {
  const mapping = path.join(root, 'cli-targets.json');
  const journalDirectory = path.join(root, 'cli-switch-journal');
  await fs.writeFile(mapping, JSON.stringify(options.targets));
  const {spawnLockedRecovery} = require('../services/recovery-cli-lock');
  // Isolated lock inode avoids competing with other tests' host-wide CLI lock.
  const run = action => new Promise((resolve, reject) => {
    const child = spawnLockedRecovery([action, options.archive, options.prepared, mapping, journalDirectory, '--offline'], {lockPath: root, env: {...process.env, SHIPYARD_BACKUP_PASSPHRASE: options.passphrase, SHIPYARD_KEY_SECRET: applicationKey}, stdio: 'pipe'});
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => {stdout += chunk;}); child.stderr.on('data', chunk => {stderr += chunk;});
    child.on('error', reject);
    child.on('exit', code => {
      if (code !== 0) return reject(Error(stderr || `CLI exited ${code}`));
      assert.equal(stdout.includes(applicationKey), false);
      resolve(JSON.parse(stdout));
    });
  });
  assert.equal((await run('stage')).state, 'staged-not-activated');
  assert.equal((await run('activate')).activated, true);
  assert.equal((await run('rollback')).state, 'rolled-back');
  await originals();
});

test('interrupted staging and interrupted cleanup can be cleaned repeatedly without touching targets', async () => {
  const recovery = {...options, journalDirectory: path.join(root, 'interrupted-staging-journal')};
  const input = path.join(root, 'staging-interrupt-options.json');
  await fs.writeFile(input, JSON.stringify(recovery), {mode: 0o600});
  const execFile = require('node:util').promisify(require('node:child_process').execFile);
  const fixture = path.join(__dirname, 'fixtures/recovery-staging-interrupt.js');
  await assert.rejects(execFile(process.execPath, [fixture, input]), error => error.code === 87);
  let journal = JSON.parse(await fs.readFile(path.join(recovery.journalDirectory, 'journal.json'), 'utf8'));
  assert.equal(journal.state, 'staging');
  await originals();
  await assert.rejects(execFile(process.execPath, [fixture, input, 'cleanup']), error => error.code === 88);
  journal = JSON.parse(await fs.readFile(path.join(recovery.journalDirectory, 'journal.json'), 'utf8'));
  assert.equal(journal.state, 'cleaning-staging');
  assert.equal((await cleanupApplicationStaging(recovery)).state, 'staging-cleaned');
  assert.equal((await cleanupApplicationStaging(recovery)).state, 'staging-cleaned');
  for (const item of journal.operations) await assert.rejects(fs.stat(item.staging), {code: 'ENOENT'});
  await originals();
});

test('cleanup refuses rollback history and unrecognized staging contents', async () => {
  await assert.rejects(cleanupApplicationStaging({...options, journalDirectory: path.join(root, 'switch-journal')}), /cannot remove activation or rollback history/);
  const recovery = {...options, journalDirectory: path.join(root, 'cleanup-preservation-journal')};
  const result = await stageApplicationActivation(recovery);
  const journal = JSON.parse(await fs.readFile(result.journal, 'utf8'));
  const sentinel = path.join(journal.operations[0].staging, 'previous');
  await fs.writeFile(sentinel, 'preserve this original');
  await assert.rejects(cleanupApplicationStaging(recovery), /preserved originals or unrecognized/);
  assert.equal(await fs.readFile(sentinel, 'utf8'), 'preserve this original');
  await originals();
});
