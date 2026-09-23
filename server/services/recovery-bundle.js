'use strict';
const fs=require('node:fs');const fsp=require('node:fs/promises');const path=require('node:path');const crypto=require('node:crypto');
const MAGIC=Buffer.from('FLEET-FILES-1\n');
const MAX_METADATA=65536;
function safePath(value){return typeof value==='string' && value.length>0 && !value.includes('\\') && !value.includes('\0') && !path.posix.isAbsolute(value) && path.posix.normalize(value)===value && value!=='.' && !value.split('/').includes('..');}
async function writeAll(handle,buffer){let offset=0;while(offset<buffer.length){const {bytesWritten}=await handle.write(buffer,offset,buffer.length-offset);if(!bytesWritten)throw Error('Bundle write failed');offset+=bytesWritten;}}
async function packRecoveryBundle(source,destination){
 const output=await fsp.open(destination,'wx',0o600);
 let count=0;
 async function visit(relative){
  if(!safePath(relative))throw Error('Unsupported recovery filename');
  const filename=path.join(source,relative);const stat=await fsp.lstat(filename);
  let metadata={path:relative,mode:stat.mode & 0o777};
  if(stat.isDirectory())metadata.type='directory';
  else if(stat.isSymbolicLink()){metadata.type='symlink';metadata.target=await fsp.readlink(filename);}
  else if(stat.isFile()){
   metadata.type='file';metadata.bytes=stat.size;
   const hash=crypto.createHash('sha256');for await(const chunk of fs.createReadStream(filename))hash.update(chunk);
   metadata.sha256=hash.digest('hex');
  } else throw Error('Unsupported recovery entry');
  const json=Buffer.from(JSON.stringify(metadata));if(json.length>MAX_METADATA)throw Error('Recovery metadata too large');
  const size=Buffer.alloc(4);size.writeUInt32BE(json.length);await writeAll(output,size);await writeAll(output,json);count++;
  if(metadata.type==='file'){
   let bytes=0;const hash=crypto.createHash('sha256');
   for await(const chunk of fs.createReadStream(filename)){bytes+=chunk.length;hash.update(chunk);await writeAll(output,chunk);}
   if(bytes!==metadata.bytes || hash.digest('hex')!==metadata.sha256)throw Error('Recovery staging changed during packaging');
  }
  if(metadata.type==='directory')for(const name of (await fsp.readdir(filename)).sort())await visit(`${relative}/${name}`);
 }
 try {
  await writeAll(output,MAGIC);
  for(const name of (await fsp.readdir(source)).sort())await visit(name);
  await writeAll(output,Buffer.alloc(4));await output.sync();return {entries:count};
 } finally {await output.close();}
}

// Extracts only into a new private directory, never manifest source paths.
async function unpackRecoveryBundle(filename,destination){
 const input=await fsp.open(filename,'r');let position=0;let created=false;
 async function read(length){const buffer=Buffer.alloc(length);let offset=0;while(offset<length){const result=await input.read(buffer,offset,length-offset,position);if(!result.bytesRead)throw Error('Truncated recovery bundle');offset+=result.bytesRead;position+=result.bytesRead;}return buffer;}
 const entries=new Map();
 try {
  if(!(await read(MAGIC.length)).equals(MAGIC))throw Error('Unsupported recovery bundle');
  await fsp.mkdir(destination,{mode:0o700});created=true;
  while(true){
   const length=(await read(4)).readUInt32BE();if(length===0)break;
   if(length>MAX_METADATA || entries.size>=1000000)throw Error('Recovery bundle metadata limit exceeded');
   const entry=JSON.parse((await read(length)).toString('utf8'));
   if(!safePath(entry.path) || entries.has(entry.path))throw Error('Invalid or duplicate recovery path');
   const parent=path.posix.dirname(entry.path);
   if(parent!=='.' && entries.get(parent)?.type!=='directory')throw Error('Recovery parent must be a directory');
   const dest=path.join(destination,...entry.path.split('/'));
   if(entry.type==='directory')await fsp.mkdir(dest,{mode:0o700});
   else if(entry.type==='symlink'){
    if(typeof entry.target!=='string' || entry.target.includes('\\') || entry.target.includes('\0') || path.posix.isAbsolute(entry.target) || !safePath(path.posix.normalize(path.posix.join(parent,entry.target))))throw Error('Unsafe recovery link');
    await fsp.symlink(entry.target,dest);
   } else if(entry.type==='file'){
    if(!Number.isSafeInteger(entry.bytes) || entry.bytes<0 || !/^[a-f0-9]{64}$/.test(entry.sha256))throw Error('Invalid recovery file metadata');
    const output=await fsp.open(dest,'wx',0o600 | (Number(entry.mode)&0o100));const hash=crypto.createHash('sha256');
    try {let remaining=entry.bytes;while(remaining){const chunk=await read(Math.min(65536,remaining));hash.update(chunk);await writeAll(output,chunk);remaining-=chunk.length;}}finally{await output.close();}
    if(hash.digest('hex')!==entry.sha256)throw Error('Recovery file checksum mismatch');
   } else throw Error('Unsupported recovery entry type');
   entries.set(entry.path,{type:entry.type,bytes:entry.bytes,sha256:entry.sha256,target:entry.target});
  }
  if(position!==(await input.stat()).size)throw Error('Unexpected trailing recovery data');
  return {entries:entries.size,members:entries};
 } catch(error){if(created)await fsp.rm(destination,{recursive:true,force:true});throw error;} finally{await input.close();}
}
module.exports={packRecoveryBundle,unpackRecoveryBundle,safePath};
