'use strict';
const fs = require('node:fs/promises');
async function main() {
  const options = JSON.parse(await fs.readFile(process.argv[2], 'utf8'));
  if (process.argv[3] === 'cleanup') {
    const remove = fs.rm;
    fs.rm = async (filename, settings) => {
      await remove(filename, settings);
      if (filename.endsWith('/payload')) process.exit(88);
    };
    await require('../../services/recovery-activation-switch').cleanupApplicationStaging(options);
  } else {
    const copy = fs.cp;
    fs.cp = async (...args) => { await copy(...args); process.exit(87); };
    await require('../../services/recovery-activation-stage').stageApplicationActivation(options);
  }
}
main().catch(error => { process.stderr.write(error.stack + '\n'); process.exitCode = 1; });
