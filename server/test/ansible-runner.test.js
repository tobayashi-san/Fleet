'use strict';

const os = require('os');
const path = require('path');
const fs = require('fs');

process.env.DB_PATH = path.join(os.tmpdir(), `lab_test_ansible_${Date.now()}.db`);
process.env.NODE_ENV = 'test';

const { test, after } = require('node:test');
const assert = require('node:assert/strict');

const db = require('../db');
const ansibleRunner = require('../services/ansible-runner');

after(() => {
  for (const ext of ['', '-wal', '-shm']) {
    try { fs.unlinkSync(process.env.DB_PATH + ext); } catch {}
  }
});

test('generateInventory sanitizes tag-based group names for ansible ini syntax', () => {
  db.servers.create({
    name: 'ubuntu-server-01',
    hostname: 'ubuntu-server-01',
    ip_address: '10.30.1.200',
    ssh_port: 22,
    ssh_user: 'ubuntu',
    tags: ['opentofu:Proxmox', 'group with spaces'],
    services: [],
  });

  const inventoryPath = ansibleRunner.generateInventory('/tmp/test-key');
  const content = fs.readFileSync(inventoryPath, 'utf8');

  assert.match(content, /\[opentofu_Proxmox\]/);
  assert.match(content, /\[group_with_spaces\]/);
  assert.doesNotMatch(content, /\[opentofu:Proxmox\]/);

  fs.unlinkSync(inventoryPath);
});

test('runAdHoc appends --become when requested', async () => {
  const originalResolve = ansibleRunner._resolveSshKey;
  const originalSpawn = ansibleRunner._spawnProcess;
  const originalGenerateInventory = ansibleRunner.generateInventory;

  let capturedArgs = null;
  let capturedEnvironment = null;
  ansibleRunner._resolveSshKey = () => ({ keyPath: '/tmp/test-key', cleanup: () => {} });
  ansibleRunner.generateInventory = (_keyPath, environmentId) => {
    capturedEnvironment = environmentId;
    return '/tmp/test-inventory.ini';
  };
  ansibleRunner._spawnProcess = async (_binary, args) => {
    capturedArgs = args;
    return { success: true, stdout: '', stderr: '', code: 0 };
  };

  try {
    await ansibleRunner.runAdHoc('ubuntu-server-01', 'command', 'whoami', null, { become: true, environmentId: 'runner-staging' });
    assert.equal(capturedEnvironment, 'runner-staging');
    assert.deepEqual(capturedArgs, [
      '-i', '/tmp/test-inventory.ini',
      'ubuntu-server-01',
      '-m', 'command',
      '-a', 'whoami',
      '--become',
    ]);
  } finally {
    ansibleRunner._resolveSshKey = originalResolve;
    ansibleRunner._spawnProcess = originalSpawn;
    ansibleRunner.generateInventory = originalGenerateInventory;
    ansibleRunner.clearRun('run-test');
  }
});

test('runAdHoc rejects option-like target arguments before spawning ansible', async () => {
  await assert.rejects(
    () => ansibleRunner.runAdHoc('--list-hosts', 'ping'),
    /Invalid Ansible target/
  );
});

test('ansible environment uses longer ssh tolerance defaults', () => {
  const env = ansibleRunner._ansibleEnv;

  assert.equal(env.ANSIBLE_TIMEOUT, '60');
  assert.equal(env.ANSIBLE_PIPELINING, 'True');
  assert.match(env.ANSIBLE_SSH_ARGS, /StrictHostKeyChecking=accept-new/);
  assert.match(env.ANSIBLE_SSH_ARGS, /ServerAliveInterval=30/);
  assert.match(env.ANSIBLE_SSH_ARGS, /ServerAliveCountMax=6/);
});

test('generateInventory includes only servers from the requested environment', () => {
  db.db.prepare("INSERT OR IGNORE INTO environments (id, name) VALUES ('runner-staging', 'Runner staging')").run();
  db.servers.create({ name: 'stage-only', hostname: 'stage-only', ip_address: '10.30.2.10', environment_id: 'runner-staging', tags: [], services: [] });
  const inventoryPath = ansibleRunner.generateInventory('/tmp/test-key', 'runner-staging');
  const content = fs.readFileSync(inventoryPath, 'utf8');
  assert.match(content, /stage-only/);
  assert.doesNotMatch(content, /ubuntu-server-01/);
  fs.unlinkSync(inventoryPath);
});

test('runPlaybook merges environment variables and applies dry-run and fork options', async () => {
  db.ansibleVars.create('global_value', 'from-store', '', { environmentId: 'default' });
  db.ansibleVars.create('secret_value', 'do-not-log', '', { environmentId: 'default', isSecret: true });
  const originalResolve = ansibleRunner._resolveSshKey;
  const originalSpawn = ansibleRunner._spawnProcess;
  const originalGenerateInventory = ansibleRunner.generateInventory;
  let capturedArgs;
  let capturedVars;
  let variablesPath;
  let streamedOutput = '';
  ansibleRunner._resolveSshKey = () => ({ keyPath: '/tmp/test-key', cleanup: () => {} });
  ansibleRunner.generateInventory = () => '/tmp/test-inventory.ini';
  ansibleRunner._spawnProcess = async (_binary, args, onOutput) => {
    capturedArgs = args;
    const argument=args[args.indexOf('-e')+1];
    assert.ok(argument.startsWith('@'));variablesPath=argument.slice(1);
    assert.equal(fs.statSync(variablesPath).mode & 0o777,0o600);
    assert.equal(fs.statSync(path.dirname(variablesPath)).mode & 0o777,0o700);
    capturedVars=JSON.parse(fs.readFileSync(variablesPath,'utf8'));
    onOutput('stdout', 'value=do-not-log');
    return { success: true, stdout: 'value=do-not-log', stderr: '', code: 0 };
  };
  try {
    const result = await ansibleRunner.runPlaybook('update.yml', 'ubuntu-server-01', { run_value: 'manual' }, (_type, data) => { streamedOutput += data; }, {
      environmentId: 'default', checkMode: true, forks: 2, runId: 'run-test',
    });
    assert.ok(!JSON.stringify(capturedArgs).includes('do-not-log'));
    assert.equal(fs.existsSync(path.dirname(variablesPath)),false);
    assert.deepEqual(capturedVars, { global_value: 'from-store', secret_value: 'do-not-log', run_value: 'manual' });
    assert.ok(capturedArgs.includes('--check'));
    assert.ok(capturedArgs.includes('--diff'));
    assert.deepEqual(capturedArgs.slice(-2), ['--forks', '2']);
    assert.equal(streamedOutput, 'value=********');
    assert.equal(result.stdout, 'value=********');
  } finally {
    ansibleRunner._resolveSshKey = originalResolve;
    ansibleRunner._spawnProcess = originalSpawn;
    ansibleRunner.generateInventory = originalGenerateInventory;
    db.db.prepare("DELETE FROM ansible_vars WHERE key IN ('global_value', 'secret_value')").run();
  }
});

test('a prepared playbook run can be cancelled before Ansible is spawned', async () => {
  const originalResolve = ansibleRunner._resolveSshKey;
  const originalSpawn = ansibleRunner._spawnProcess;
  const originalGenerateInventory = ansibleRunner.generateInventory;
  const runId = 'cancel-before-spawn';
  let spawned = false;
  ansibleRunner._resolveSshKey = () => ({ keyPath: '/tmp/test-key', cleanup: () => {} });
  ansibleRunner.generateInventory = () => '/tmp/test-inventory.ini';
  ansibleRunner._spawnProcess = async () => {
    spawned = true;
    return { success: true, stdout: '', stderr: '', code: 0 };
  };

  try {
    ansibleRunner.prepareRun(runId);
    assert.equal(ansibleRunner.cancelRun(runId), true);
    const result = await ansibleRunner.runPlaybook('update.yml', 'ubuntu-server-01', {}, null, { runId });
    assert.equal(result.cancelled, true);
    assert.equal(spawned, false);
    assert.equal(ansibleRunner.isRunActive(runId), false);
  } finally {
    ansibleRunner._resolveSshKey = originalResolve;
    ansibleRunner._spawnProcess = originalSpawn;
    ansibleRunner.generateInventory = originalGenerateInventory;
    ansibleRunner.clearRun(runId);
  }
});

test('typed variables retain native JSON values and temporary secrets are removed on spawn failure',async()=>{
 const resolve=ansibleRunner._resolveSshKey, spawn=ansibleRunner._spawnProcess, inventory=ansibleRunner.generateInventory;
 db.ansibleVars.create('typed_number','2.5','',{valueType:'number'});
 db.ansibleVars.create('typed_boolean','false','',{valueType:'boolean'});
 db.ansibleVars.create('typed_json','{"items":[1,true]}','',{valueType:'json'});
 let variablesPath;
 ansibleRunner._resolveSshKey=()=>({keyPath:'/tmp/test-key',cleanup:()=>{}});
 ansibleRunner.generateInventory=()=>'/tmp/test-inventory.ini';
 ansibleRunner._spawnProcess=async(_binary,args)=>{
  variablesPath=args[args.indexOf('-e')+1].slice(1);
  assert.deepEqual(JSON.parse(fs.readFileSync(variablesPath,'utf8')),{typed_number:7,typed_boolean:false,typed_json:{items:[1,true]}});
  throw Error('synthetic spawn failure');
 };
 try {await assert.rejects(()=>ansibleRunner.runPlaybook('update.yml','all',{typed_number:7}),/synthetic spawn failure/);assert.equal(fs.existsSync(path.dirname(variablesPath)),false);}
 finally {ansibleRunner._resolveSshKey=resolve;ansibleRunner._spawnProcess=spawn;ansibleRunner.generateInventory=inventory;db.db.prepare("DELETE FROM ansible_vars WHERE key LIKE 'typed_%'").run();}
});

test('live output masks split stored and overridden secrets independently on stdout and stderr',async()=>{
 const resolve=ansibleRunner._resolveSshKey, spawn=ansibleRunner._spawnProcess, inventory=ansibleRunner.generateInventory;
 db.ansibleVars.create('stream_secret','original-secret','',{isSecret:true});
 ansibleRunner._resolveSshKey=()=>({keyPath:'/tmp/test-key',cleanup:()=>{}});ansibleRunner.generateInventory=()=>'/tmp/test-inventory.ini';
 const output={stdout:'',stderr:''};
 ansibleRunner._spawnProcess=async(_binary,_args,onOutput)=>{
  onOutput('stdout','new-');onOutput('stderr','original-');onOutput('stdout','secret tail');onOutput('stderr','secret end');
  return {success:true,stdout:'new-secret tail',stderr:'original-secret end',code:0};
 };
 try {
  const result=await ansibleRunner.runPlaybook('update.yml','all',{stream_secret:'new-secret'},(type,value)=>{output[type]+=value;});
  assert.deepEqual(output,{stdout:'******** tail',stderr:'******** end'});assert.equal(result.stdout,output.stdout);assert.equal(result.stderr,output.stderr);
 }finally{ansibleRunner._resolveSshKey=resolve;ansibleRunner._spawnProcess=spawn;ansibleRunner.generateInventory=inventory;db.db.prepare("DELETE FROM ansible_vars WHERE key='stream_secret'").run();}
});
