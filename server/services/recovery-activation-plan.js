'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const {verifyPreparedApplicationRecovery} = require('./application-backup');
const within = (parent, child) => child === parent || child.startsWith(parent + path.sep);

function targetPath(value) {
  if (typeof value !== 'string' || !path.isAbsolute(value) || value.includes('\0')) throw Error('Every recovery target must be an explicit absolute path');
  const resolved = path.resolve(value);
  if (resolved === path.parse(resolved).root) throw Error('A recovery target cannot be a filesystem root');
  return resolved;
}

async function rejectLinkParents(filename) {
  let current = filename;
  while (current !== path.dirname(current)) {
    try {
      const stat = await fs.lstat(current);
      if (stat.isSymbolicLink()) throw Error('Recovery target paths must not contain symbolic links; map their physical destinations explicitly');
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    current = path.dirname(current);
  }
}

/** Produces a reviewable plan only. Activation must reverify before any writes. */
async function planApplicationActivation({archive, prepared, passphrase, targets}) {
  const source = await fs.realpath(prepared);
  const archivePath = await fs.realpath(archive);
  await verifyPreparedApplicationRecovery(archive, source, passphrase);
  const recovery = JSON.parse(await fs.readFile(path.join(source, 'recovery-plan.json'), 'utf8'));
  if (!targets || typeof targets !== 'object' || !targets.roots || typeof targets.roots !== 'object' || Array.isArray(targets.roots)) throw Error('Supply database and root target mappings');
  const included = recovery.roots.filter(root => root.status === 'included');
  const ids = new Set(included.map(root => root.id));
  if (Object.keys(targets.roots).some(id => !ids.has(id)) || included.some(root => !Object.hasOwn(targets.roots, root.id))) throw Error('Map every included recovery root exactly once; omit absent and unknown roots');
  const roots = included.map(root => ({id: root.id, source: path.join(source, 'files', root.id), original: root.resolvedSource || root.source, target: targetPath(targets.roots[root.id])}));
  const database = {source: path.join(source, 'database.db'), target: targetPath(targets.database)};
  for (const item of [...roots, database]) {
    if (within(item.target, source) || within(source, item.target)) throw Error('Recovery targets must be separate from the prepared recovery directory');
    if (within(item.target, archivePath)) throw Error('Recovery targets must not replace the source archive');
    await rejectLinkParents(item.target);
  }
  const operations = [];
  for (const root of roots.sort((a, b) => a.target.length - b.target.length || a.id.localeCompare(b.id))) {
    const parent = operations.find(item => within(item.target, root.target));
    if (parent) {
      const relative = path.relative(parent.target, root.target);
      if (path.resolve(parent.original, relative) !== path.resolve(root.original)) throw Error('Nested or aliased targets disagree with the original root relationships');
      parent.coveredRoots.push(root.id);
    } else operations.push({...root, coveredRoots: [root.id], database: null});
  }
  if (roots.some(root => within(database.target, root.target))) throw Error('Database target collides with a recovery root');
  const containingRoot = operations.find(root => within(root.target, database.target));
  if (containingRoot) {
    const relative = path.relative(containingRoot.target, database.target);
    const stagedTarget = path.join(containingRoot.source, relative);
    try { await fs.lstat(stagedTarget); throw Error('Database target would overwrite an archived file'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    await rejectLinkParents(stagedTarget);
    if (!(await fs.stat(path.dirname(stagedTarget))).isDirectory()) throw Error('Database parent must exist in the recovered root');
    containingRoot.database = {...database, relative};
  } else operations.push({id: 'database', source: database.source, target: database.target, coveredRoots: [], database: null});
  return {version: 1, state: 'planned-not-activated', applicationVersion: recovery.applicationVersion, prepared: source, operations, absentRoots: recovery.roots.filter(root => root.status === 'absent').map(root => root.id), requires: ['stopped application and filesystem writers', 'separately preserved application key and deployment configuration', 'pre-activation verification and durable rollback journal']};
}

module.exports = {planApplicationActivation};
