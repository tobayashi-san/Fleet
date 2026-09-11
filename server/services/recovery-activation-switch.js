'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const {planApplicationActivation} = require('./recovery-activation-plan');
const {verifyPreparedApplicationRecovery, verifyApplicationDatabaseKey} = require('./application-backup');
const {compareRecoveryTree} = require('./compare-recovery-tree');
const {writeJournal, syncPath} = require('./recovery-activation-stage');
const {assertRecoveryTargetsUnmounted} = require('./recovery-mounts');

async function identity(filename) {
  try {
    const stat = await fs.lstat(filename);
    if (!stat.isFile() && !stat.isDirectory()) throw Error('Recovery switch encountered an unexpected link or special file');
    return {dev: stat.dev, ino: stat.ino, type: stat.isDirectory() ? 'directory' : 'file'};
  } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
const same = (left, right) => left === null || right === null ? left === right : left.dev === right.dev && left.ino === right.ino && left.type === right.type;
async function move(source, target) {
  await assertRecoveryTargetsUnmounted([source, target]);
  if (await identity(target)) throw Error('Recovery destination unexpectedly exists; files preserved');
  await fs.rename(source, target);
  await syncPath(path.dirname(source));
  await syncPath(path.dirname(target));
}
async function load(options, {allowMissingStaging = false} = {}) {
  if (!options.offline) throw Error('Recovery switching requires stopped application and filesystem writers');
  const plan = await planApplicationActivation(options);
  const directory = await fs.realpath(options.journalDirectory);
  for (const target of [plan.prepared, ...plan.operations.map(item => item.target)]) {
    if (directory === target || directory.startsWith(target + path.sep) || target.startsWith(directory + path.sep)) throw Error('Activation journal overlaps recovery targets');
  }
  const journalPath = path.join(directory, 'journal.json');
  const stat = await fs.lstat(journalPath);
  if (!stat.isFile() || stat.size > 1024 * 1024) throw Error('Invalid activation journal');
  const journal = JSON.parse(await fs.readFile(journalPath, 'utf8'));
  if (journal.version !== 1 || !/^[a-f0-9-]{36}$/.test(journal.id) || journal.prepared !== plan.prepared || !Array.isArray(journal.operations) || journal.operations.length !== plan.operations.length) throw Error('Activation journal does not match verified recovery');
  for (const [index, item] of journal.operations.entries()) {
    const expected = plan.operations[index];
    for (const key of ['id', 'source', 'target', 'database', 'coveredRoots']) if (JSON.stringify(item[key]) !== JSON.stringify(expected[key])) throw Error('Activation journal target mapping changed');
    if (item.staging !== path.join(path.dirname(item.target), `.shipyard-activation-${journal.id}-${index}`)) throw Error('Invalid activation staging path');
    try {
      if ((await fs.realpath(item.staging)) !== item.staging) throw Error('Invalid activation staging path');
    } catch (error) { if (!allowMissingStaging || error.code !== 'ENOENT') throw error; }
  }
  await assertRecoveryTargetsUnmounted(journal.operations.flatMap(item => [item.target, item.staging]));
  return {directory, journal};
}

async function rollbackLoaded({directory, journal}) {
  if (!['activating', 'activated', 'rolling-back', 'rolled-back'].includes(journal.state)) throw Error('Journal has no activation to roll back');
  // Inspect every target before starting; unfamiliar replacements are preserved.
  for (const item of journal.operations) {
    const current = await identity(item.target);
    const previous = await identity(path.join(item.staging, 'previous'));
    if (current && !same(current, item.originalIdentity) && !same(current, item.payloadIdentity)) throw Error('Recovery target changed identity; manual review required before rollback');
    if (previous && !same(previous, item.originalIdentity)) throw Error('Preserved original changed identity; rollback refused');
    if (item.originalIdentity && !previous && !same(current, item.originalIdentity)) throw Error('Preserved original is missing; rollback refused');
  }
  journal.state = 'rolling-back'; await writeJournal(directory, journal);
  for (const item of [...journal.operations].reverse()) {
    if (same(await identity(item.target), item.payloadIdentity)) {
      await move(item.target, path.join(item.staging, 'withdrawn'));
    }
    const previous = path.join(item.staging, 'previous');
    if (await identity(previous)) await move(previous, item.target);
    item.state = 'rolled-back'; await writeJournal(directory, journal);
  }
  journal.state = 'rolled-back'; await writeJournal(directory, journal);
  return {state: journal.state, activated: false, recoveredPayloadsPreserved: true};
}

async function activateApplicationRecovery(options) {
  const loaded = await load(options);
  const {directory, journal} = loaded;
  if (journal.state !== 'staged-not-activated') throw Error('Activation requires completed staging; use rollback after an interrupted switch');
  const keyCheck = await verifyApplicationDatabaseKey(options.archive, options.passphrase, options.applicationKey);
  for (const item of journal.operations) {
    if (!same(await identity(item.target), item.originalIdentity)) throw Error('Target changed since staging; review and stage recovery again');
    if (await identity(path.join(item.staging, 'previous')) || await identity(path.join(item.staging, 'withdrawn'))) throw Error('Staging already contains recovery history');
    const temporary = await fs.mkdtemp(path.join(directory, 'verify-'));
    try {
      const expected = path.join(temporary, 'payload');
      await fs.cp(item.source, expected, {recursive: true, force: false, errorOnExist: true, verbatimSymlinks: true});
      if (item.database) {
        await fs.copyFile(item.database.source, path.join(expected, item.database.relative), require('node:fs').constants.COPYFILE_EXCL);
        await fs.chmod(path.join(expected, item.database.relative), 0o600);
      }
      await compareRecoveryTree(expected, path.join(item.staging, 'payload'));
    } finally { await fs.rm(temporary, {recursive: true, force: true}); }
    item.payloadIdentity = await identity(path.join(item.staging, 'payload'));
  }
  await verifyPreparedApplicationRecovery(options.archive, options.prepared, options.passphrase);
  journal.keyVerification = keyCheck;
  journal.state = 'activating'; await writeJournal(directory, journal);
  try {
    for (const item of journal.operations) {
      item.state = 'moving-original'; await writeJournal(directory, journal);
      if (item.originalIdentity) await move(item.target, path.join(item.staging, 'previous'));
      item.state = 'installing'; await writeJournal(directory, journal);
      await move(path.join(item.staging, 'payload'), item.target);
      item.state = 'installed'; await writeJournal(directory, journal);
    }
    journal.state = 'activated'; await writeJournal(directory, journal);
    return {state: journal.state, activated: true, originalsPreserved: true, keyVerification: keyCheck};
  } catch (error) {
    try { await rollbackLoaded(loaded); }
    catch (rollbackError) { throw new AggregateError([error, rollbackError], 'Activation failed and rollback needs recovery; preserve all journal and staging files'); }
    throw error;
  }
}
async function rollbackApplicationRecovery(options) { return rollbackLoaded(await load(options)); }

async function cleanupApplicationStaging(options) {
  const {directory, journal} = await load(options, {allowMissingStaging: true});
  if (!['staging', 'staged-not-activated', 'cleaning-staging', 'staging-cleaned'].includes(journal.state)) throw Error('Staging cleanup cannot remove activation or rollback history');
  for (const item of journal.operations) {
    if (!same(await identity(item.target), item.originalIdentity)) throw Error('Target changed since staging; cleanup requires manual review');
    let names;
    try { names = await fs.readdir(item.staging); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    if (names.some(name => !['owner.json', 'payload'].includes(name))) throw Error('Staging contains preserved originals or unrecognized files; cleanup refused');
    if (!names.length) continue; // Interrupted exclusive directory creation.
    const ownerPath = path.join(item.staging, 'owner.json');
    const stat = await fs.lstat(ownerPath);
    if (!stat.isFile() || stat.size > 4096) throw Error('Staging ownership cannot be verified');
    const owner = JSON.parse(await fs.readFile(ownerPath, 'utf8'));
    if (owner.journalId !== journal.id || owner.target !== item.target) throw Error('Staging belongs to a different recovery');
  }
  journal.state = 'cleaning-staging'; await writeJournal(directory, journal);
  for (const item of journal.operations) {
    item.state = 'cleaning'; await writeJournal(directory, journal);
    await assertRecoveryTargetsUnmounted([item.staging]);
    // Keep ownership evidence until all payload data has been removed, allowing
    // the same command to resume after interruption during recursive removal.
    await fs.rm(path.join(item.staging, 'payload'), {recursive: true, force: true});
    try { await fs.unlink(path.join(item.staging, 'owner.json')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    try { await fs.rmdir(item.staging); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    await syncPath(path.dirname(item.staging));
    item.state = 'cleaned'; await writeJournal(directory, journal);
  }
  journal.state = 'staging-cleaned'; await writeJournal(directory, journal);
  return {state: journal.state, activated: false, targetsPreserved: true};
}

module.exports = {activateApplicationRecovery, rollbackApplicationRecovery, cleanupApplicationStaging};
