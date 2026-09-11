const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {PACKAGE_SERVICE_QUERY,parsePackageServiceOwnership}=require('../utils/package-service-impact');

test('service ownership distinguishes direct units, no owned units and unavailable metadata',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'package-services-'));
  try {
    fs.symlinkSync('/usr/bin/awk',path.join(root,'awk'));
    fs.writeFileSync(path.join(root,'dpkg-query'),`#!/bin/sh
printf '%s\\n' "$2" >> "$QUERY_LOG"
case "$2" in
 server) printf '%s\\n' /usr/lib/systemd/system/server.service /lib/systemd/system/server.service /usr/lib/systemd/system/worker@.service /usr/lib/systemd/user/user.service /usr/share/doc/server.service ;;
 library) printf '%s\\n' /usr/lib/libexample.so ;;
 oldsvc) printf '%s\\n' /etc/init.d/oldsvc ;;
 *) exit 1 ;;
esac
`,{mode:0o755});
    const result=spawnSync('/bin/sh',['-c',PACKAGE_SERVICE_QUERY],{encoding:'utf8',env:{
      PATH:root, QUERY_LOG:path.join(root,'queries'),
      upgrade_plan:'Inst server [1] (2 repo)\nInst library [1] (2 repo)\nInst newpkg (1 repo)\nRemv oldsvc [1]\nInst server [1] (2 repo)\nInst bad;touch [1] (2 repo)',
    }});
    assert.equal(result.status,0,result.stderr);
    assert.deepEqual(fs.readFileSync(path.join(root,'queries'),'utf8').trim().split('\n'),['server','library','newpkg','oldsvc']);
    assert.deepEqual(parsePackageServiceOwnership(result.stdout,['server','library','newpkg','oldsvc'].map(package=>({package}))),[
      {package:'server',units:['server.service','worker@.service']},
      {package:'library',units:[]},
      {package:'newpkg',units:null},
      {package:'oldsvc',units:['init.d/oldsvc']},
    ]);
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});

test('missing records remain unknown and records for unrelated packages are ignored',()=>{
  assert.deepEqual(parsePackageServiceOwnership('other\tok\nother\tfile\t/lib/systemd/system/other.service\n',[{package:'app'}]),[{package:'app',units:null}]);
});
