'use strict';
// Requires Podman, Ansible's containers.podman collection and a cached Debian
// Node image. Only the disposable container installs packages. Setup downloads
// python3-apt; the actual update/dry-run use a local test package repository.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFile} = require('node:child_process');
const {promisify} = require('node:util');
const run=promisify(execFile);

test('bundled update playbook previews then upgrades a real isolated Debian package', {timeout:240000}, async () => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'fleet-package-integration-'));
  const name=`fleet-review-update-${process.pid}`;
  let created=false,db,runner;
  const podman=(args)=>run('podman',args,{timeout:120000,maxBuffer:4*1024*1024});
  try {
    await podman(['run','-d','--pull=never','--name',name,'docker.io/library/node:22-bookworm','sleep','300']);created=true;
    await podman(['exec',name,'sh','-ec','apt-get update -qq && apt-get install -y -qq python3-apt']);
    // Replace only the disposable container's package sources. Keeping this
    // repository local makes the tested upgrade deterministic.
    await podman(['exec',name,'sh','-ec',`mkdir -p /test-repo
for version in 1.0 2.0; do
  mkdir -p /package/DEBIAN /package/usr/share/fleet-review
  printf 'Package: fleet-review-fixture\nVersion: %s\nArchitecture: all\nMaintainer: Test <test@example.invalid>\nDescription: Disposable integration fixture\n' "$version" > /package/DEBIAN/control
  printf '%s' "$version" > /package/usr/share/fleet-review/version
  dpkg-deb --build /package /test-repo/fleet-review-fixture_$version.deb
done
dpkg -i /test-repo/fleet-review-fixture_1.0.deb
cd /test-repo
dpkg-scanpackages . /dev/null > Packages
rm -f /etc/apt/sources.list /etc/apt/sources.list.d/*
printf 'deb [trusted=yes] file:/test-repo ./\n' > /etc/apt/sources.list
apt-get update -qq`]);
    process.env.NODE_ENV='test';process.env.DB_PATH=path.join(root,'test.db');
    process.env.FLEET_PLAYBOOKS_DIR=path.join(root,'playbooks');
    process.env.FLEET_SSH_DIR=path.join(root,'keys');
    process.env.ANSIBLE_CONFIG=path.join(root,'ansible.cfg');
    process.env.ANSIBLE_LOCAL_TEMP=path.join(root,'ansible-tmp');
    fs.mkdirSync(process.env.FLEET_PLAYBOOKS_DIR);
    fs.writeFileSync(process.env.ANSIBLE_CONFIG,'[defaults]\nretry_files_enabled=False\n');
    fs.copyFileSync(path.resolve(__dirname,'../../playbooks/update.yml'),path.join(process.env.FLEET_PLAYBOOKS_DIR,'update.yml'));
    db=require('../../db');runner=require('../../services/ansible-runner');
    db.servers.create({name:'package-test',hostname:'package-test',ip_address:'192.0.2.1',ssh_user:'root'});
    // No SSH is used: Ansible executes inside the named rootless container.
    runner._resolveSshKey=()=>({keyPath:path.join(root,'unused-key'),cleanup:()=>{}});
    const variables={ansible_connection:'containers.podman.podman',ansible_host:name,ansible_user:'root',ansible_become:false,ansible_python_interpreter:'/usr/bin/python3'};
    const version=async()=> (await podman(['exec',name,'cat','/usr/share/fleet-review/version'])).stdout;
    assert.equal(await version(),'1.0');
    const preview=await runner.runPlaybook('update.yml','package-test',variables,null,{checkMode:true});
    assert.equal(preview.success,true,preview.stdout+'\n'+preview.stderr);
    assert.equal(await version(),'1.0','Dry run must not install the upgrade');
    const applied=await runner.runPlaybook('update.yml','package-test',variables);
    assert.equal(applied.success,true,applied.stdout+'\n'+applied.stderr);
    assert.equal(await version(),'2.0');
    const results=require('../../utils/execution-host-results').executionHostResults(applied.stdout);
    assert.ok(results.some(host=>host.name==='package-test' && host.changed>0 && host.failed===0));
  } finally {
    if(created) await podman(['rm','-f',name]);
    db?.db.close();fs.rmSync(root,{recursive:true,force:true});
  }
});
