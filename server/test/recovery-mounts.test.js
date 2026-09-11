'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {mountPoints, assertRecoveryTargetsUnmounted} = require('../services/recovery-mounts');
const inventory = '1 0 0:1 / / rw - ext4 /dev/root rw\n2 1 0:2 / /srv/data/ssh rw - tmpfs tmpfs rw\n3 1 0:3 / /srv/with\\040space rw - tmpfs tmpfs rw\n';
test('mount inventory decodes escaped paths and rejects mount roots and nested mounts', async () => {
  assert.deepEqual(mountPoints(inventory), ['/', '/srv/data/ssh', '/srv/with space']);
  for (const target of ['/srv/data', '/srv/data/ssh', '/srv/with space']) await assert.rejects(assertRecoveryTargetsUnmounted([target], inventory), /contains a mount point/);
  await assertRecoveryTargetsUnmounted(['/srv/data-other', '/srv/data/ssh/regular-file', '/srv/unmounted'], inventory);
});
test('missing or malformed mount inventory cannot silently skip checks', async () => {
  for (const value of ['', 'broken', '1 0 0:1 / relative rw - ext4 /dev/root rw']) await assert.rejects(assertRecoveryTargetsUnmounted(['/srv/data'], value), /inventory|mount path/);
});
test('real Linux mount inventory rejects an existing system mount without changing it', async () => {
  await assert.rejects(assertRecoveryTargetsUnmounted(['/proc']), /mount point/);
});
