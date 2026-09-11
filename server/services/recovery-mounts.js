'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');

function mountPoints(text) {
  if (typeof text !== 'string' || !text.trim()) throw Error('Mount inventory is unavailable');
  return text.trim().split('\n').map(line => {
    const fields = line.split(' ');
    if (fields.length < 10 || fields.indexOf('-') < 6 || !/^\d+$/.test(fields[0])) throw Error('Invalid mount inventory');
    const point = fields[4].replace(/\\(040|011|012|134)/g, (_match, octal) => String.fromCharCode(parseInt(octal, 8)));
    if (!path.isAbsolute(point)) throw Error('Invalid mount path');
    return path.resolve(point);
  });
}

async function assertRecoveryTargetsUnmounted(targets, inventory) {
  if (inventory === undefined) {
    if (process.platform !== 'linux') throw Error('Recovery activation currently requires Linux mount-point verification');
    inventory = await fs.readFile('/proc/self/mountinfo', 'utf8');
  }
  const mounts = mountPoints(inventory);
  for (const value of targets) {
    const target = path.resolve(value);
    const mounted = mounts.find(point => point === target || point.startsWith(target + path.sep));
    if (mounted) throw Error(`Recovery target contains a mount point (${mounted}). Stop the deployment and map the underlying physical storage from the recovery host before staging or switching.`);
  }
}

module.exports = {mountPoints, assertRecoveryTargetsUnmounted};
