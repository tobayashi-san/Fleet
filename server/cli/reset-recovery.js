'use strict';
const path=require('node:path');
const Database=require('better-sqlite3');
const {recoverPendingPlaybookResets}=require('../services/reset-playbooks');
function main(){
  const [databasePath,directory,offline]=process.argv.slice(2);
  if(process.argv.length!==5 || !path.isAbsolute(databasePath||'') || !path.isAbsolute(directory||'') || offline!=='--offline')throw Error('Usage: reset-recovery.js /absolute/original-database /absolute/playbooks --offline (stop application and filesystem writers first)');
  const database=new Database(databasePath,{fileMustExist:true});
  try { process.stdout.write(JSON.stringify({recovered:recoverPendingPlaybookResets(directory,database)})+'\n'); }
  finally { database.close(); }
}
try { main(); } catch(error) { process.stderr.write(error.message+'\n');process.exitCode=1; }
