const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('documented active deployment variables are consumed by Compose', () => {
  const source = read('docker-compose.yml');
  const compose = yaml.load(source);
  assert.equal(compose.services.fleet.init, true);
  for (const match of read('.env.example').matchAll(/^([A-Z][A-Z0-9_]*)=/gm)) {
    assert.ok(source.includes('${' + match[1]), `${match[1]} is documented but not consumed by Compose`);
  }
  const environment = compose.services.fleet.environment;
  for (const name of ['FLEET_MFA_POLICY', 'FLEET_TERMINAL_IDLE_MINUTES', 'FLEET_TERMINAL_MAX_MINUTES', 'FLEET_PLUGIN_TRUST_POLICY', 'FLEET_TRUSTED_PLUGIN_SHA256', 'FLEET_RENEW_CERT']) {
    assert.ok(environment.some(value => value.startsWith(`${name}=\${${name}`)), `${name} must reach the container`);
  }
});

test('package and lockfile versions and runtime requirements stay synchronized', () => {
  const version = JSON.parse(read('package.json')).version;
  for (const prefix of ['', 'server/', 'frontend-next/']) {
    const pkg = JSON.parse(read(`${prefix}package.json`));
    const lock = JSON.parse(read(`${prefix}package-lock.json`));
    assert.equal(pkg.version, version, prefix);
    assert.equal(lock.version, version, prefix);
    assert.equal(lock.packages[''].version, version, prefix);
    assert.equal(pkg.engines.node, '>=24 <25', prefix);
    assert.equal(lock.packages[''].engines.node, pkg.engines.node, prefix);
  }
  assert.equal(read('.nvmrc').trim(), '24');
});
