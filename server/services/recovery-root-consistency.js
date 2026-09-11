'use strict';
const path = require('node:path');
const {compareRecoveryTree} = require('./compare-recovery-tree');

// Recovery roots can overlap (for example data and data/ssh) or be aliases.
// Every copy of the same physical source must represent the same snapshot.
async function verifyRecoveryRootConsistency(directory, roots) {
  const included = roots.filter(root => root.status === 'included');
  for (let index = 0; index < included.length; index++) {
    for (let other = index + 1; other < included.length; other++) {
      let parent = included[index], child = included[other];
      let relative = path.relative(parent.resolvedSource || parent.source, child.resolvedSource || child.source);
      const inside = value => value === '' || (value !== '..' && !value.startsWith(`..${path.sep}`) && !path.isAbsolute(value));
      if (!inside(relative)) {
        [parent, child] = [child, parent];
        relative = path.relative(parent.resolvedSource || parent.source, child.resolvedSource || child.source);
      }
      if (!inside(relative)) continue;
      try {
        await compareRecoveryTree(path.join(directory, parent.id, relative), path.join(directory, child.id));
      } catch {
        throw Error(`Overlapping recovery roots disagree: ${parent.id} and ${child.id}; stop all writers and create a new backup`);
      }
    }
  }
}
module.exports = {verifyRecoveryRootConsistency};
