'use strict';
const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
const scheme='package-files-v2';
function pluginDigest(directory) {
  const records=[];
  const buffer=Buffer.alloc(1024*1024);
  const visit=(dir,relative='')=>{
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})) {
      const name=path.posix.join(relative,entry.name),full=path.join(dir,entry.name);
      if(entry.isSymbolicLink())throw new Error(`Plugin package contains an unsupported symbolic link: ${name}`);
      if(entry.isDirectory()){visit(full,name);continue;}
      if(!entry.isFile())throw new Error(`Plugin package contains an unsupported file type: ${name}`);
      const fd=fs.openSync(full,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
      try {
        const before=fs.fstatSync(fd);if(!before.isFile())throw new Error(`Plugin file changed while hashing: ${name}`);
        const hash=crypto.createHash('sha256');let length;
        while((length=fs.readSync(fd,buffer,0,buffer.length,null))>0)hash.update(buffer.subarray(0,length));
        const after=fs.fstatSync(fd);
        if(before.size!==after.size||before.mtimeMs!==after.mtimeMs||before.ctimeMs!==after.ctimeMs)throw new Error(`Plugin file changed while hashing: ${name}`);
        records.push([name,hash.digest('hex')]);
      } finally {fs.closeSync(fd);}
    }
  };
  visit(directory);records.sort(([a],[b])=>a<b?-1:a>b?1:0);
  return crypto.createHash('sha256').update(JSON.stringify([scheme,records])).digest('hex');
}
module.exports={pluginDigest,scheme};
