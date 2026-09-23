'use strict';
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const {Transform} = require('node:stream');
const {pipeline} = require('node:stream/promises');

function recoveryRoots(database, env = process.env) {
  const server = path.resolve(__dirname,'..');
  const roots = [
    {id:'data',path:path.join(server,'data'),required:false},
    {id:'playbooks',path:env.FLEET_PLAYBOOKS_DIR || path.join(server,'playbooks'),required:Boolean(env.FLEET_PLAYBOOKS_DIR)},
    {id:'plugins',path:env.PLUGINS_DIR || '/app/plugins',required:Boolean(env.PLUGINS_DIR)},
    {id:'ssh',path:env.FLEET_SSH_DIR || path.join(server,'data','ssh'),required:Boolean(env.FLEET_SSH_DIR)},
    {id:'git',path:env.FLEET_GIT_WORKSPACE_DIR || path.join(server,'data','git-workspace'),required:Boolean(env.FLEET_GIT_WORKSPACE_DIR)},
    {id:'state-backups',path:env.TOFU_STATE_BACKUP_DIR || path.join(server,'data','tofu-state-backups'),required:Boolean(env.TOFU_STATE_BACKUP_DIR)},
  ];
  if (database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tofu_workspaces'").get()) {
    for (const row of database.prepare('SELECT id,path FROM tofu_workspaces').all()) {
      if (!row.path) throw new Error('Infrastructure workspace has no recovery path');
      roots.push({id:`workspace-${crypto.createHash('sha256').update(String(row.id)).digest('hex')}`,path:row.path,required:true});
    }
  }
  for (const [name,key] of [['tls-cert','SSL_CERT'],['tls-key','SSL_KEY']]) if(env[key]) roots.push({id:name,path:env[key],required:true});
  return roots.map(root=>({...root,path:path.resolve(root.path)}));
}

function within(root,filename) {
  const relative=path.relative(root,filename);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

// Private staging only. Callers must encrypt the result before exporting it.
// Writers must be stopped for cross-file/application consistency.
async function stageRecoveryFiles(roots, destination, excludedPaths = []) {
  const target=path.resolve(destination);
  const physicalTarget=path.join(await fsp.realpath(path.dirname(target)),path.basename(target));
  const excludes=new Set();
  for(const filename of excludedPaths){
    excludes.add(path.resolve(filename));
    try {excludes.add(await fsp.realpath(filename));} catch(error){if(error.code!=='ENOENT')throw error;}
  }
  const ids=new Set();
  const resolvedRoots=[];
  for(const root of roots) {
    if(!/^[a-z0-9-]+$/.test(root.id) || ids.has(root.id))throw new Error('Invalid or duplicate recovery root ID');
    ids.add(root.id);
    const source=path.resolve(root.path);
    let resolvedSource;
    try {resolvedSource=await fsp.realpath(source);} catch(error){if(error.code!=='ENOENT' || root.required)throw error;}
    const physicalSource=resolvedSource || source;
    if(physicalSource===path.parse(physicalSource).root || within(physicalSource,physicalTarget))throw new Error('Recovery staging must be outside source roots');
    resolvedRoots.push({...root,source,resolvedSource});
  }
  await fsp.mkdir(target,{mode:0o700}); // Refuses existing destinations.
  const manifest={version:1,scope:'application-files',roots:[],entries:[]};
  async function copy(source,dest,root,relative) {
    if(excludes.has(path.resolve(source)))return;
    const stat=await fsp.lstat(source);
    const entry={root:root.id,path:relative,mode:stat.mode & 0o777};
    if(stat.isSymbolicLink()) {
      const link=await fsp.readlink(source);
      if(path.isAbsolute(link) || !within(root.path,path.resolve(path.dirname(source),link)))throw new Error(`Recovery link escapes root ${root.id}`);
      await fsp.symlink(link,dest);manifest.entries.push({...entry,type:'symlink',target:link});return;
    }
    if(stat.isDirectory()) {
      await fsp.mkdir(dest,{mode:0o700});
      const names=(await fsp.readdir(source)).sort();
      manifest.entries.push({...entry,type:'directory'});
      for(const name of names)await copy(path.join(source,name),path.join(dest,name),root,relative?`${relative}/${name}`:name);
      const after=await fsp.lstat(source);
      if(after.ino!==stat.ino || after.dev!==stat.dev || after.ctimeMs!==stat.ctimeMs || JSON.stringify((await fsp.readdir(source)).sort())!==JSON.stringify(names))throw new Error('Source directory changed during recovery staging');
      return;
    }
    if(!stat.isFile())throw new Error(`Unsupported special file in recovery root ${root.id}`);
    const input=await fsp.open(source,fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    try {
      const before=await input.stat();
      if(before.ino!==stat.ino || before.dev!==stat.dev)throw new Error('Source file changed before recovery staging');
      const hash=crypto.createHash('sha256');
      const digest=new Transform({transform(chunk,_encoding,callback){hash.update(chunk);callback(null,chunk);}});
      await pipeline(input.createReadStream({autoClose:false}),digest,fs.createWriteStream(dest,{flags:'wx',mode:0o600 | (stat.mode & 0o100)}));
      const after=await input.stat();
      if(before.size!==after.size || before.mtimeMs!==after.mtimeMs || before.ctimeMs!==after.ctimeMs)throw new Error('Source file changed during recovery staging');
      manifest.entries.push({...entry,type:'file',bytes:after.size,sha256:hash.digest('hex')});
    } finally {await input.close();}
  }
  try {
    for(const root of resolvedRoots) {
      const {source,resolvedSource}=root;
      if(!resolvedSource){manifest.roots.push({id:root.id,source,status:'absent'});continue;}
      manifest.roots.push({id:root.id,source,resolvedSource,status:'included'});
      await copy(resolvedSource,path.join(target,root.id),{...root,path:resolvedSource},'');
      if(await fsp.realpath(source)!==resolvedSource)throw new Error('Recovery root changed during staging');
    }
    await fsp.writeFile(path.join(target,'manifest.json'),JSON.stringify(manifest,null,2),{mode:0o600,flag:'wx'});
    return manifest;
  } catch(error) {await fsp.rm(target,{recursive:true,force:true});throw error;}
}
module.exports={recoveryRoots,stageRecoveryFiles};
