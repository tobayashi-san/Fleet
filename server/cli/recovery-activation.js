'use strict';
const {spawnLockedRecovery} = require('../services/recovery-cli-lock');
const child = spawnLockedRecovery(process.argv.slice(2));
const interrupt = signal => { if (child.exitCode === null) child.kill(signal); };
process.on('SIGINT', () => interrupt('SIGINT'));
process.on('SIGTERM', () => interrupt('SIGTERM'));
child.on('error', error => {
  process.stderr.write(`Recovery requires the util-linux flock command: ${error.message}\n`);
  process.exitCode = 1;
});
child.on('exit', (code, signal) => {
  if (code === 75) process.stderr.write('Another recovery command is running on this host. Wait for it to finish before retrying.\n');
  process.exitCode = code ?? (signal ? 1 : 0);
});
