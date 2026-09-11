'use strict';
// Internal worker. Operator entry point: recovery-activation.js (holds flock).
const fs = require('node:fs/promises');
const path = require('node:path');
const {planApplicationActivation} = require('../services/recovery-activation-plan');
const {stageApplicationActivation} = require('../services/recovery-activation-stage');
const {activateApplicationRecovery, rollbackApplicationRecovery, cleanupApplicationStaging} = require('../services/recovery-activation-switch');

async function main() {
  const [action, archive, prepared, mapping, journalDirectory, offline] = process.argv.slice(2);
  const validAction = action === 'plan' ? process.argv.length === 6 : ['stage', 'activate', 'rollback', 'cleanup-staging'].includes(action) && process.argv.length === 8 && path.isAbsolute(journalDirectory || '') && offline === '--offline';
  if (!validAction || ![archive, prepared, mapping].every(value => value && path.isAbsolute(value))) throw Error('Usage: recovery-activation.js plan /absolute/archive /absolute/prepared-directory /absolute/targets.json OR stage|activate|rollback|cleanup-staging /absolute/archive /absolute/prepared-directory /absolute/targets.json /absolute/journal-directory --offline');
  const passphrase = process.env.SHIPYARD_BACKUP_PASSPHRASE;
  delete process.env.SHIPYARD_BACKUP_PASSPHRASE;
  const applicationKey = process.env.SHIPYARD_KEY_SECRET;
  delete process.env.SHIPYARD_KEY_SECRET;
  const stat = await fs.stat(mapping);
  if (!stat.isFile() || stat.size > 1024 * 1024) throw Error('Target mapping must be a JSON file smaller than 1 MiB');
  const targets = JSON.parse(await fs.readFile(mapping, 'utf8'));
  const operation = {plan: planApplicationActivation, stage: stageApplicationActivation, activate: activateApplicationRecovery, rollback: rollbackApplicationRecovery, 'cleanup-staging': cleanupApplicationStaging}[action];
  const plan = await operation({archive, prepared, passphrase, targets, journalDirectory, applicationKey, offline: true});
  process.stdout.write(JSON.stringify(plan, null, 2) + '\n');
}
main().catch(error => { process.stderr.write(error.message + '\n'); process.exitCode = 1; });
