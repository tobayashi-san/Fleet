'use strict';
const path=require('node:path');const Database=require('better-sqlite3');
const {createApplicationBackup,verifyApplicationBackup,restoreApplicationBackup,verifyPreparedApplicationRecovery,verifyApplicationDatabaseKey}=require('../services/application-backup');
async function main(){
 const [action,filename,option]=process.argv.slice(2);
 if(!['create','verify','restore','verify-prepared','verify-key'].includes(action) || !filename || !path.isAbsolute(filename) || (action==='create' ? option!=='--offline' || process.argv.length!==5 : ['restore','verify-prepared'].includes(action) ? !option || !path.isAbsolute(option) || process.argv.length!==5 : process.argv.length!==4))throw Error('Usage: application-backup.js create /absolute/archive --offline OR verify /absolute/archive OR verify-key /absolute/archive OR restore /absolute/archive /absolute/new-directory OR verify-prepared /absolute/archive /absolute/prepared-directory');
 const passphrase=process.env.FLEET_BACKUP_PASSPHRASE;delete process.env.FLEET_BACKUP_PASSPHRASE;
 let result;
 if(action==='verify-key')result=await verifyApplicationDatabaseKey(filename,passphrase,process.env.FLEET_KEY_SECRET);
 else if(action==='verify')result=await verifyApplicationBackup(filename,passphrase);
 else if(action==='verify-prepared')result=await verifyPreparedApplicationRecovery(filename,option,passphrase);
 else if(action==='restore')result=await restoreApplicationBackup(filename,option,passphrase);
 else {
  const database=new Database(process.env.DB_PATH || path.join(__dirname,'..','data','fleet.db'),{readonly:true,fileMustExist:true});
  try{result=await createApplicationBackup({database,destination:filename,passphrase,offline:true});}finally{database.close();}
 }
 process.stdout.write(JSON.stringify({...result,notice:'Original application key, deployment configuration and remote workload backups remain separate requirements.'})+'\n');
}
main().catch(error=>{process.stderr.write(error.message+'\n');process.exitCode=1;});
