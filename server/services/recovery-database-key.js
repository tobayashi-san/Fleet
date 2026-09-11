'use strict';
const {authenticateRecoveryCiphertext} = require('./recovery-ciphertext');
const Database = require('better-sqlite3');
const COLUMNS = {app_settings:['value'],ansible_vars:['value'],schedules:['extra_vars'],users:['totp_secret','totp_secret_pending']};
/** Authenticate core database ciphertext without returning or logging plaintext. */
function verifyRecoveryDatabaseKey(filename, secret) {
  if (typeof secret !== 'string' || !secret) throw Error('Original SHIPYARD_KEY_SECRET is required for database key verification');
  let database;
  let checked = 0;
  try {
    database = new Database(filename,{readonly:true,fileMustExist:true});
    for (const [table, columns] of Object.entries(COLUMNS)) {
      const available = new Set(database.pragma(`table_info(${table})`).map(column=>column.name));
      for (const column of columns.filter(column=>available.has(column))) {
        for (const row of database.prepare(`SELECT ${column} AS value FROM ${table}`).iterate()) {
          if (typeof row.value !== 'string' || !row.value.startsWith('enc:')) continue;
          try {
            authenticateRecoveryCiphertext(row.value.slice(4),secret);
            checked++;
          } catch { throw Error('Application key does not authenticate all encrypted core database values; the key may be wrong or stored ciphertext damaged'); }
        }
      }
    }
    return {scope:'core-database-encrypted-values',checkedValues:checked,keyVerified:checked>0};
  } finally { database?.close(); }
}
module.exports = {verifyRecoveryDatabaseKey};
