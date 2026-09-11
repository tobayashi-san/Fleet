'use strict';
const path = require('node:path');
const Database = require('better-sqlite3');
const {createEncryptedDatabaseBackup,verifyEncryptedDatabaseBackup,restoreEncryptedDatabaseBackup} = require('../services/database-backup');

async function main() {
  const [action,filename,destination] = process.argv.slice(2);
  if (!['create','verify','restore'].includes(action) || !filename || process.argv.length !== (action === 'restore' ? 5 : 4)) throw new Error('Usage: node server/cli/database-backup.js create|verify /absolute/backup-file OR restore /absolute/backup-file /absolute/new-database');
  if (action === 'restore' && !path.isAbsolute(destination)) throw new Error('Restore destination must be absolute');
  if (!path.isAbsolute(filename)) throw new Error('Backup filename must be absolute');
  const passphrase = process.env.SHIPYARD_BACKUP_PASSPHRASE;
  delete process.env.SHIPYARD_BACKUP_PASSPHRASE;
  let result;
  if (action === 'verify') result = await verifyEncryptedDatabaseBackup(filename,passphrase);
  else if (action === 'restore') result = await restoreEncryptedDatabaseBackup(filename,destination,passphrase);
  else {
    const database = new Database(process.env.DB_PATH || path.join(__dirname,'..','data','shipyard.db'),{readonly:true,fileMustExist:true});
    try { result = await createEncryptedDatabaseBackup(database,filename,passphrase); } finally { database.close(); }
  }
  process.stdout.write(JSON.stringify({...result,notice:'Database only. Preserve playbooks, plugins, infrastructure state/files and the original SHIPYARD_KEY_SECRET separately.'})+'\n');
}
main().catch(error=>{process.stderr.write(error.message+'\n');process.exitCode=1;});
