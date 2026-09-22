#!/usr/bin/env node
// Runs only disposable containers with test credentials and anonymous storage.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const engine = process.env.CONTAINER_ENGINE || 'docker';
const image = process.argv[2];
if (!image) throw new Error('Usage: CONTAINER_ENGINE=docker node tools/test-container.mjs <image>');
const prefix = `shipyard-config-${process.pid}-${Date.now()}`;
const containers = [];
// Recovery checks share anonymous volumes between disposable containers. Podman
// otherwise assigns different SELinux MCS labels to the seeded fixture files.
// This applies only to this test harness, never to the production Compose stack.
const fixtureSecurity = /(?:^|\/)podman$/.test(engine) ? ['--security-opt', 'label=disable'] : [];
const credentials = ['-e', 'JWT_SECRET=container-test-jwt-secret', '-e', 'SHIPYARD_KEY_SECRET=container-test-encryption-secret'];
function run(args, { timeout = 30000, allowFailure = false } = {}) {
  const result = spawnSync(engine, args, { encoding: 'utf8', timeout });
  if (!allowFailure && (result.error || result.status !== 0)) {
    throw new Error(`${engine} ${args[0]} failed: ${result.error || result.stderr || result.stdout}`);
  }
  return result;
}
function start(label, options = [], command = []) {
  const name = `${prefix}-${label}`;
  containers.push(name);
  run(['run', '-d', '--init', '--name', name, ...fixtureSecurity, ...credentials, ...options, image, ...command]);
  return name;
}
function exec(name, ...command) {
  return run(['exec', name, ...command]).stdout.trim();
}
async function healthy(name) {
  for (let attempt = 0; attempt < 45; attempt++) {
    const result = run(['exec', name, 'node', '-e', "require('https').get({host:'127.0.0.1',port:8443,path:'/api/health',rejectUnauthorized:false},r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"], { allowFailure: true, timeout: 5000 });
    if (result.status === 0) return;
    if (run(['inspect', '--format', '{{.State.Running}}', name]).stdout.trim() !== 'true') break;
    await delay(1000);
  }
  const logs = run(['logs', name]);
  throw new Error(`Container did not become healthy: ${logs.stdout}\n${logs.stderr}`);
}
function rejected(label, options, expected, command = []) {
  const name = start(label, options, command);
  const result = run(['wait', name], { timeout: 20000 });
  assert.notEqual(result.stdout.trim(), '0', `${label} unexpectedly exited successfully`);
  const logs = run(['logs', name]);
  assert.match(logs.stdout + logs.stderr, expected);
  console.log(`PASS: ${label}`);
}
const fingerprint = name => exec(name, 'openssl', 'x509', '-in', '/app/server/data/certs/shipyard.crt', '-noout', '-fingerprint', '-sha256');

try {
  rejected('lost-key', ['-e', 'SHIPYARD_KEY_SECRET=', '--entrypoint', '/bin/sh'], /SHIPYARD_KEY_SECRET is missing/, ['-ec', 'mkdir -p /app/server/data && touch /app/server/data/shipyard.db && exec /app/docker-entrypoint.sh']);
  rejected('equal-secrets', ['-e', 'JWT_SECRET=container-test-encryption-secret'], /must be different/);
  rejected('partial-tls', ['-e', 'SSL_KEY=/missing.key'], /Set SSL_KEY and SSL_CERT together/);
  rejected('custom-renewal', ['-e', 'SSL_KEY=/custom.key', '-e', 'SSL_CERT=/custom.crt', '-e', 'SHIPYARD_RENEW_CERT=1'], /only renews generated certificates/);
  rejected('protected-root', ['-e', 'OPENTOFU_WORKSPACE_ROOTS=/'], /protected workspace root/);

  const primary = start('primary', ['--entrypoint', '/bin/sh'], ['-ec', `
    if [ ! -f /app/server/data/test-seeded ]; then
      mkdir -p /app/plugins/opentofu /app/server/playbooks/system /workspaces/existing /tmp/ownership-target
      printf plugin-original > /app/plugins/opentofu/custom.txt
      printf playbook-original > /app/server/playbooks/system/custom.yml
      printf owner-original > /tmp/ownership-target/marker
      ln -s /tmp/ownership-target /workspaces/escape
      printf /tmp/ownership-target > /app/server/data/tofu-workspace-paths.txt
      touch /app/server/data/test-seeded
    fi
    exec /app/docker-entrypoint.sh
  `]);
  await healthy(primary);
  assert.equal(exec(primary, 'node', '-p', 'process.versions.node.split(".")[0]'), '24');
  assert.equal(exec(primary, 'node', '-e', `
    const fs = require('fs');
    for (const pid of fs.readdirSync('/proc').filter(p => /^\\d+$/.test(p))) {
      try {
        if (fs.readFileSync('/proc/'+pid+'/cmdline', 'utf8').startsWith('node\\0server/index.js\\0')) {
          console.log(fs.readFileSync('/proc/'+pid+'/status', 'utf8').match(/^Uid:\\s+(\\d+)/m)[1]);
        }
      } catch {}
    }
  `), '1001');
  assert.equal(exec(primary, 'sh', '-c', 'cat /app/server/data/legacy-migrations/startup.*/opentofu/custom.txt'), 'plugin-original');
  assert.equal(exec(primary, 'sh', '-c', 'cat /app/server/data/legacy-migrations/startup.*/system/custom.yml'), 'playbook-original');
  assert.equal(exec(primary, 'stat', '-c', '%u', '/tmp/ownership-target/marker'), '0');
  assert.equal(exec(primary, 'stat', '-c', '%u', '/workspaces/existing'), '1001');
  assert.equal(exec(primary, 'stat', '-c', '%a', '/app/server/data/certs/shipyard.key'), '600');
  assert.equal(exec(primary, 'sh', '-c', 'test ! -e /app/plugins/opentofu && test ! -e /app/server/playbooks/system && test ! -e /app/server/git-workspace && test -f /app/server/playbooks/update.yml && echo clean'), 'clean');
  const original = fingerprint(primary);
  run(['restart', primary]);
  await healthy(primary);
  assert.equal(fingerprint(primary), original, 'Restart must preserve certificate identity');
  assert.equal(exec(primary, 'sh', '-c', 'find /app/server/data/legacy-migrations -mindepth 1 -maxdepth 1 -type d | wc -l'), '2');
  console.log('PASS: Node 24, SQLite/API startup, non-root process, archival, scoped ownership, restart stability');

  run(['stop', primary]);
  rejected('failed-renewal', ['--volumes-from', primary, '-e', 'SHIPYARD_RENEW_CERT=1', '-e', 'CERT_SANS=INVALID:bad'], /Error|error/);
  run(['start', primary]);
  await healthy(primary);
  assert.equal(fingerprint(primary), original, 'Failed renewal must preserve the existing certificate');
  run(['stop', primary]);

  const renewed = start('renewed', ['--volumes-from', primary, '-e', 'SHIPYARD_RENEW_CERT=1', '-e', 'CERT_SANS=DNS:renewed.example.internal']);
  await healthy(renewed);
  assert.notEqual(fingerprint(renewed), original);
  assert.match(exec(renewed, 'openssl', 'x509', '-in', '/app/server/data/certs/shipyard.crt', '-noout', '-ext', 'subjectAltName'), /renewed.example.internal/);
  assert.equal(exec(renewed, 'sh', '-c', 'openssl x509 -in /app/server/data/certs/previous.*/shipyard.crt -noout -fingerprint -sha256'), original);
  console.log('PASS: failed renewal preserves TLS; explicit renewal updates SANs and archives old TLS');

  const generated = start('generated', ['-e', 'JWT_SECRET=', '-e', 'SHIPYARD_KEY_SECRET=']);
  await healthy(generated);
  assert.equal(exec(generated, 'stat', '-c', '%a %u', '/app/secrets', '/app/secrets/shipyard.env'), '700 0\n600 0');
  const secrets = exec(generated, 'cat', '/app/secrets/shipyard.env');
  assert.match(secrets, /^JWT_SECRET=[0-9a-f]{64}\nSHIPYARD_KEY_SECRET=[0-9a-f]{64}$/);
  run(['restart', generated]);
  await healthy(generated);
  assert.equal(exec(generated, 'cat', '/app/secrets/shipyard.env'), secrets, 'Restart must reuse generated secrets');
  console.log('PASS: first start generates private secrets and restarts reuse them; a lost key blocks startup');
} finally {
  for (const name of containers.reverse()) run(['rm', '-f', '-v', name], { allowFailure: true });
}
