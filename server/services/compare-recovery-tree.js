'use strict';
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
async function digest(filename) {
  const handle = await fsp.open(filename, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const before = await handle.stat();
    if (!before.isFile()) throw Error('Prepared recovery member is not a regular file');
    const hash = crypto.createHash('sha256');
    for await (const chunk of handle.createReadStream({autoClose:false})) hash.update(chunk);
    const after = await handle.stat();
    if (before.size !== after.size || before.ctimeMs !== after.ctimeMs || before.mtimeMs !== after.mtimeMs) throw Error('Prepared recovery changed during verification');
    return hash.digest('hex');
  } finally { await handle.close(); }
}
/** Compares against a fresh restore from the authenticated archive, not editable local checksums. */
async function compareRecoveryTree(expected, actual, relative = '.') {
  const left = await fsp.lstat(expected), right = await fsp.lstat(actual);
  if (!left.isSymbolicLink() && !right.isSymbolicLink() && (left.mode & 0o777) !== (right.mode & 0o777)) throw Error(`Prepared recovery permissions differ: ${relative}`);
  if (left.isDirectory() && right.isDirectory()) {
    const names = (await fsp.readdir(expected)).sort();
    if (JSON.stringify(names) !== JSON.stringify((await fsp.readdir(actual)).sort())) throw Error(`Prepared recovery contents differ: ${relative}`);
    for (const name of names) await compareRecoveryTree(path.join(expected,name),path.join(actual,name),path.posix.join(relative,name));
    const after = await fsp.lstat(actual);
    if (right.ino !== after.ino || right.dev !== after.dev || right.ctimeMs !== after.ctimeMs) throw Error('Prepared recovery directory changed during verification');
  } else if (left.isFile() && right.isFile()) {
    if (left.size !== right.size || await digest(expected) !== await digest(actual)) throw Error(`Prepared recovery file differs: ${relative}`);
  } else if (left.isSymbolicLink() && right.isSymbolicLink()) {
    if (await fsp.readlink(expected) !== await fsp.readlink(actual)) throw Error(`Prepared recovery link differs: ${relative}`);
  } else throw Error(`Prepared recovery member type differs: ${relative}`);
}
module.exports = {compareRecoveryTree};
