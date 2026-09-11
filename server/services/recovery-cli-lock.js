'use strict';
const {spawn} = require('node:child_process');
const path = require('node:path');

// A directory inode is stable and needs no writable lock file or stale PID file.
// This serializes recovery CLI commands within one host filesystem namespace.
function spawnLockedRecovery(args, {lockPath = '/', env = process.env, stdio = 'inherit'} = {}) {
  return spawn('flock', ['--exclusive', '--nonblock', '--conflict-exit-code', '75', '--no-fork', lockPath,
    process.execPath, path.resolve(__dirname, '../cli/recovery-activation-worker.js'), ...args], {env, stdio});
}
module.exports = {spawnLockedRecovery};
