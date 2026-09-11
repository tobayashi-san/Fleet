'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {spawn} = require('node:child_process');
const {spawnLockedRecovery} = require('../services/recovery-cli-lock');
const outcome = child => new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', (code, signal) => resolve({code, signal})); });

test('kernel lock rejects a competing command and is released automatically after holder termination', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'recovery-lock-test-'));
  const holder = spawn('flock', ['--exclusive', '--nonblock', '--no-fork', directory, process.execPath, '-e', 'process.stdout.write("ready");process.stdin.resume();'], {stdio: ['pipe', 'pipe', 'pipe']});
  const holderEnd = outcome(holder);
  try {
    await new Promise((resolve, reject) => { holder.stdout.once('data', resolve); holder.once('error', reject); holder.once('exit', () => reject(Error('Lock holder exited before readiness'))); });
    const denied = spawnLockedRecovery([], {lockPath: directory, stdio: 'pipe'});
    assert.equal((await outcome(denied)).code, 75);
    holder.kill('SIGKILL');
    assert.equal((await holderEnd).signal, 'SIGKILL');
    const available = spawnLockedRecovery([], {lockPath: directory, stdio: 'pipe'});
    let error = ''; available.stderr.on('data', chunk => {error += chunk;});
    assert.equal((await outcome(available)).code, 1);
    assert.match(error, /Usage:/); // Worker ran; failure is invalid arguments, not locking.
    assert.deepEqual(await fs.readdir(directory), []); // No stale lock/PID files.
  } finally {
    if (holder.exitCode === null && holder.signalCode === null) holder.kill('SIGKILL');
    await holderEnd;
    await fs.rm(directory, {recursive: true, force: true});
  }
});
