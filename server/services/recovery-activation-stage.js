'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const {randomUUID} = require('node:crypto');
const {planApplicationActivation} = require('./recovery-activation-plan');
const {verifyPreparedApplicationRecovery} = require('./application-backup');
const {compareRecoveryTree} = require('./compare-recovery-tree');
const {assertRecoveryTargetsUnmounted} = require('./recovery-mounts');
const within = (parent, child) => child === parent || child.startsWith(parent + path.sep);

async function syncPath(filename) {
  const handle = await fs.open(filename, 'r');
  try { await handle.sync(); } finally { await handle.close(); }
}
async function syncTree(filename) {
  const stat = await fs.lstat(filename);
  if (stat.isSymbolicLink()) return;
  if (stat.isDirectory()) for (const name of await fs.readdir(filename)) await syncTree(path.join(filename, name));
  await syncPath(filename);
}
async function writeJournal(directory, journal) {
  const temporary = path.join(directory, `journal.${randomUUID()}.next`);
  const handle = await fs.open(temporary, 'wx', 0o600);
  try { await handle.writeFile(JSON.stringify(journal, null, 2)); await handle.sync(); }
  finally { await handle.close(); }
  await fs.rename(temporary, path.join(directory, 'journal.json'));
  await syncPath(directory);
}

/** Stages private sibling copies; never renames, deletes or replaces a target. */
async function stageApplicationActivation({archive, prepared, passphrase, targets, journalDirectory, offline = false}) {
  if (!offline) throw Error('Recovery staging requires stopped application and filesystem writers');
  if (typeof journalDirectory !== 'string' || !path.isAbsolute(journalDirectory)) throw Error('Supply a new absolute journal directory');
  const plan = await planApplicationActivation({archive, prepared, passphrase, targets});
  await assertRecoveryTargetsUnmounted(plan.operations.map(item => item.target));
  const directory = path.join(await fs.realpath(path.dirname(journalDirectory)), path.basename(journalDirectory));
  for (const location of [plan.prepared, ...plan.operations.map(item => item.target)]) {
    if (within(directory, location) || within(location, directory)) throw Error('Activation journal must be separate from targets and prepared recovery');
  }
  const id = randomUUID();
  const operations = [];
  for (const [index, item] of plan.operations.entries()) {
    const parent = path.dirname(item.target);
    if (await fs.realpath(parent) !== parent) throw Error('Activation target parents must be physical directories');
    let current = null;
    try {
      const stat = await fs.lstat(item.target);
      if (!stat.isDirectory() && !stat.isFile()) throw Error('Activation target must be a regular file or directory');
      current = {dev: stat.dev, ino: stat.ino, type: stat.isDirectory() ? 'directory' : 'file'};
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    operations.push({...item, staging: path.join(parent, `.shipyard-activation-${id}-${index}`), originalIdentity: current, state: 'pending'});
  }
  await fs.mkdir(directory, {mode: 0o700});
  const created = [];
  const journal = {version: 1, id, state: 'staging', applicationVersion: plan.applicationVersion, prepared: plan.prepared, operations};
  try {
    await syncPath(path.dirname(directory));
    await writeJournal(directory, journal);
    for (const item of operations) {
      // The durable intent precedes exclusive creation so interrupted work is discoverable.
      await fs.mkdir(item.staging, {mode: 0o700});
      created.push(item.staging);
      await fs.writeFile(path.join(item.staging, 'owner.json'), JSON.stringify({journalId: id, target: item.target}), {flag: 'wx', mode: 0o600});
      await syncTree(item.staging);
      const payload = path.join(item.staging, 'payload');
      await fs.cp(item.source, payload, {recursive: true, force: false, errorOnExist: true, verbatimSymlinks: true});
      await compareRecoveryTree(item.source, payload);
      if (item.database) {
        const databaseTarget = path.join(payload, item.database.relative);
        await fs.copyFile(item.database.source, databaseTarget, require('node:fs').constants.COPYFILE_EXCL);
        await fs.chmod(databaseTarget, 0o600);
        await compareRecoveryTree(item.database.source, databaseTarget);
      }
      await syncTree(item.staging);
      await syncPath(path.dirname(item.staging));
      item.state = 'staged';
      await writeJournal(directory, journal);
    }
    await verifyPreparedApplicationRecovery(archive, plan.prepared, passphrase);
    journal.state = 'staged-not-activated';
    await writeJournal(directory, journal);
    return {state: journal.state, journal: path.join(directory, 'journal.json'), operations: operations.length, activated: false};
  } catch (error) {
    // Only remove paths whose exclusive creation succeeded in this invocation.
    // If cleanup fails, preserve the journal to identify the remaining material.
    try {
      await assertRecoveryTargetsUnmounted(created);
      for (const staging of created) await fs.rm(staging, {recursive: true, force: true});
      await fs.rm(directory, {recursive: true, force: true});
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], `Staging failed and cleanup is incomplete. Preserve activation journal: ${directory}`);
    }
    throw error;
  }
}

module.exports = {stageApplicationActivation, writeJournal, syncPath};
