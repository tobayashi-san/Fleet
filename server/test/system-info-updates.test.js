'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const sshManager = require('../services/ssh-manager');
const systemInfo = require('../services/system-info');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const server = { id: 'system-updates-test', ip_address: '127.0.0.1', ssh_user: 'root', ssh_port: 22 };

test('package update checks expose a remote failure instead of reporting no updates', async () => {
  const original = sshManager.execCommand;
  sshManager.execCommand = async () => ({ code: 1, stdout: '', stderr: 'apt metadata refresh failed' });
  try {
    await assert.rejects(
      systemInfo.getAvailableUpdates(server),
      /Failed to check available updates: apt metadata refresh failed/,
    );
  } finally {
    sshManager.execCommand = original;
  }
});

test('package update checks still parse a successful fresh result', async () => {
  const original = sshManager.execCommand;
  let command = '';
  sshManager.execCommand = async (_server, value) => {
    command = value;
    return {
    code: 0,
    // The production awk expression emits just the package name after
    // `---PHASED---`, not the complete apt simulation line.
    stdout: 'openssl/jammy-updates 3.0.2\nlinux-image/jammy-updates 6.8\n---PHASED---\nopenssl\n---WOULDUPGRADE---\n',
    stderr: '',
    };
  };
  try {
    assert.deepEqual(await systemInfo.getAvailableUpdates(server), [
      { package: 'openssl', version: '3.0.2', current_version: null, source: '', phased: false },
      { package: 'linux-image', version: '6.8', current_version: null, source: '', phased: true },
    ]);
    assert.match(command, /run_privileged apt-get update -qq/);
    assert.match(command, /sudo -n/);
    assert.match(command, /apt-get -s -y .*dist-upgrade --auto-remove/);
  } finally {
    sshManager.execCommand = original;
  }
});

test('full-upgrade impact includes new dependencies and removals without polluting update counts', async () => {
  const original=sshManager.execCommand;
  sshManager.execCommand=async()=>({code:0,stderr:'',stdout:
    'app/stable 2 amd64 [upgradable from: 1]\n---PHASED---\napp\ndependency\n---WOULDUPGRADE---\n'+
    'Inst app [1] (2 stable [amd64])\nInst dependency (1.0)\nRemv old-kernel [6.1]\nConf app (2 stable [amd64])\n'});
  try {
    const result=await systemInfo.getAvailableUpdates(server,{includePlan:true});
    assert.equal(result.updates.length,1);
    assert.equal(result.plan.strategy,'apt-get dist-upgrade --auto-remove');
    assert.deepEqual(result.plan.changes,[
      {action:'upgrade',package:'app',current_version:'1',candidate_version:'2'},
      {action:'install',package:'dependency',current_version:null,candidate_version:'1.0'},
      {action:'remove',package:'old-kernel',current_version:'6.1',candidate_version:null},
    ]);
    assert.ok(Number.isFinite(Date.parse(result.checked_at)));
    sshManager.execCommand=async()=>({code:0,stderr:'',stdout:'app/updates 2\n---PHASED---\n'});
    assert.equal((await systemInfo.getAvailableUpdates(server,{includePlan:true})).plan,null);
    sshManager.execCommand=async()=>({code:0,stderr:'',stdout:'---PHASED---\n---WOULDUPGRADE---\nInst broken record\n'});
    await assert.rejects(systemInfo.getAvailableUpdates(server,{includePlan:true}),/unrecognized change record/);
  } finally {sshManager.execCommand=original;}
});

test('available updates retain exact installed and candidate versions when reported', async () => {
  const original = sshManager.execCommand;
  sshManager.execCommand = async () => ({code:0, stderr:'', stdout:
    'openssl/noble-updates,noble-security 3.0.13-0ubuntu3.5 amd64 [upgradable from: 3.0.13-0ubuntu3.4]\n'+
    'linux/arch 6.12.2 [upgradable from: 6.12.1]\n---PHASED---\nopenssl\nlinux\n---WOULDUPGRADE---\n'});
  try {
    const updates = await systemInfo.getAvailableUpdates(server);
    assert.deepEqual(updates.map(({package:name,version,current_version})=>({name,version,current_version})),[
      {name:'openssl',version:'3.0.13-0ubuntu3.5',current_version:'3.0.13-0ubuntu3.4'},
      {name:'linux',version:'6.12.2',current_version:'6.12.1'},
    ]);
  } finally { sshManager.execCommand = original; }
});

test('apt collection checks real shell exit statuses and distinguishes an empty upgrade plan', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(),'shipyard-package-check-'));
  const original = sshManager.execCommand;
  const executable = (name, body) => fs.writeFileSync(path.join(root,name), `#!/bin/sh\n${body}\n`, {mode:0o755});
  // The generated remote script runs only these fake package commands. No
  // system package manager, sudo, network or host mutation is involved.
  executable('id', 'echo 0');
  executable('apt', 'if [ "$LC_ALL" != C ]; then exit 9; fi\nprintf "%s\\n" "$TEST_PACKAGE_LIST"\nexit "$TEST_LIST_EXIT"');
  executable('apt-get', 'if [ "$1" = update ]; then exit "$TEST_REFRESH_EXIT"; fi\nprintf "%s\\n" "$TEST_UPGRADE_PLAN"\nexit "$TEST_PLAN_EXIT"');
  fs.symlinkSync('/usr/bin/awk',path.join(root,'awk'));
  let scenario = {};
  sshManager.execCommand = async (_server, command) => {
    const result = spawnSync('/bin/sh',['-c',command],{encoding:'utf8',env:{
      PATH:root,LC_ALL:'de_CH.UTF-8',TEST_PACKAGE_LIST:'openssl/stable 3.2 amd64 [upgradable from: 3.1]',
      TEST_UPGRADE_PLAN:'',TEST_LIST_EXIT:'0',TEST_PLAN_EXIT:'0',TEST_REFRESH_EXIT:'0',...scenario,
    }});
    if (result.error) throw result.error;
    return {code:result.status,stdout:result.stdout,stderr:result.stderr};
  };
  try {
    assert.equal((await systemInfo.getAvailableUpdates(server))[0].phased,true,'all listed packages can be deferred');
    scenario={TEST_UPGRADE_PLAN:'Inst openssl [3.1] (3.2 stable)'};
    assert.equal((await systemInfo.getAvailableUpdates(server))[0].phased,false);
    executable('dpkg-query', 'printf "%s\\n" /usr/lib/systemd/system/example.service');
    const preview=await systemInfo.getAvailableUpdates(server,{includePlan:true});
    assert.deepEqual(preview.plan.service_ownership,[{package:'openssl',units:['example.service']}]);
    assert.equal(preview.plan.changes[0].candidate_version,'3.2');
    scenario={TEST_PACKAGE_LIST:'Listing...'};
    assert.deepEqual(await systemInfo.getAvailableUpdates(server),[]);
    scenario={TEST_LIST_EXIT:'1'};
    await assert.rejects(systemInfo.getAvailableUpdates(server),/Failed to read the available package list/);
    scenario={TEST_PLAN_EXIT:'100'};
    await assert.rejects(systemInfo.getAvailableUpdates(server),/Failed to simulate the package upgrade/);
    scenario={TEST_REFRESH_EXIT:'100'};
    await assert.rejects(systemInfo.getAvailableUpdates(server),/Package update check exited with code 1/);
  } finally {
    sshManager.execCommand=original;
    fs.rmSync(root,{recursive:true,force:true});
  }
});

test('package preview bounds the remote command and reports deadline failure', async () => {
  const original=sshManager.execCommand;
  sshManager.execCommand=async(_server,_command,options)=>{
    assert.deepEqual(options,{timeoutMs:90000});
    throw new Error('SSH check exceeded 90 seconds.');
  };
  try {
    await assert.rejects(systemInfo.getAvailableUpdates(server,{includePlan:true}),/SSH check exceeded 90 seconds/);
  } finally {sshManager.execCommand=original;}
});
