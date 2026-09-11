'use strict';
const fs = require('node:fs/promises');
const {activateApplicationRecovery} = require('../../services/recovery-activation-switch');
async function main() {
  const options = JSON.parse(await fs.readFile(process.argv[2], 'utf8'));
  const rename = fs.rename;
  fs.rename = async (source, target) => {
    await rename(source, target);
    if (source.endsWith('/payload')) process.exit(86);
  };
  await activateApplicationRecovery(options);
}
main().catch(error => { process.stderr.write(error.message); process.exitCode = 1; });
