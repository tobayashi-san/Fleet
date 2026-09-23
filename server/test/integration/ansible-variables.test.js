'use strict';

// Local-only integration: no gathered facts, SSH connections or host mutations.
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fleet-ansible-integration-'));
process.env.NODE_ENV = 'test';
process.env.DB_PATH = path.join(root, 'test.db');
process.env.FLEET_PLAYBOOKS_DIR = path.join(root, 'playbooks');
process.env.FLEET_SSH_DIR = path.join(root, 'ssh');
process.env.FLEET_KEY_SECRET = 'integration-only-encryption-key';
process.env.ANSIBLE_CONFIG = path.join(root, 'ansible.cfg');
process.env.ANSIBLE_LOCAL_TEMP = path.join(root, 'ansible-tmp');
fs.writeFileSync(process.env.ANSIBLE_CONFIG, '[defaults]\nstdout_callback=default\nretry_files_enabled=False\n');
const available = spawnSync('ansible-playbook', ['--version'], { encoding: 'utf8' });
const db = require('../../db');
const runner = require('../../services/ansible-runner');
after(() => { db.db.close(); fs.rmSync(root, { recursive: true, force: true }); });

test('real local Ansible receives native stored types and overrides while output secrets stay masked', {
  skip: available.error?.code === 'ENOENT' ? 'ansible-playbook is required for this integration test' : false,
  timeout: 30000,
}, async () => {
  assert.equal(available.status, 0, available.stderr);
  db.ansibleVars.create('numeric_value', '2.5', '', { valueType: 'number' });
  db.ansibleVars.create('boolean_value', 'false', '', { valueType: 'boolean' });
  db.ansibleVars.create('json_value', '{"items":[1,true],"label":"example"}', '', { valueType: 'json' });
  db.ansibleVars.create('text_value', 'false', '', { valueType: 'string' });
  db.ansibleVars.create('overridden', '1', '', { valueType: 'number' });
  db.ansibleVars.create('stored_secret', 'synthetic-stored-credential', '', { isSecret: true });
  db.ansibleVars.create('override_secret', 'synthetic-old-credential', '', { isSecret: true });
  db.db.prepare("INSERT INTO environments (id,name) VALUES ('other','Other')").run();
  db.ansibleVars.create('foreign_value', 'must-not-arrive', '', { environmentId: 'other' });
  fs.writeFileSync(path.join(process.env.FLEET_PLAYBOOKS_DIR, 'verify.yml'), `
- name: Verify local variable transport
  hosts: localhost
  connection: local
  gather_facts: false
  tasks:
    - name: Check native types and environment isolation
      ansible.builtin.assert:
        quiet: true
        that:
          - numeric_value is number
          - numeric_value == 2.5
          - boolean_value is boolean
          - boolean_value == false
          - json_value is mapping
          - json_value['items'][0] == 1
          - json_value['items'][1] is boolean
          - text_value is string
          - text_value == 'false'
          - overridden is number
          - overridden == 9
          - foreign_value is undefined
    - name: Deliberately emit synthetic values to verify runner masking
      ansible.builtin.debug:
        msg: "stored={{ stored_secret }} override={{ override_secret }}"
`);
  const originalResolve = runner._resolveSshKey;
  runner._resolveSshKey = () => ({ keyPath: path.join(root, 'unused-local-key'), cleanup() {} });
  let streamed = '';
  try {
    const result = await runner.runPlaybook('verify.yml', 'localhost', {
      overridden: 9, override_secret: 'synthetic-new-credential',
    }, (_type, data) => { streamed += data; });
    assert.equal(result.success, true, result.stdout + result.stderr);
    const hostResults = require('../../utils/execution-host-results').executionHostResults(result.stdout);
    assert.ok(hostResults.find(host => host.name === 'localhost')?.duration_seconds > 0, result.stdout);
    assert.match(result.stdout, /stored=\*{8} override=\*{8}/);
    assert.match(streamed, /stored=\*{8} override=\*{8}/);
    for (const secret of ['synthetic-stored-credential', 'synthetic-old-credential', 'synthetic-new-credential']) {
      assert.ok(!streamed.includes(secret));
      assert.ok(!(result.stdout + result.stderr).includes(secret));
    }
  } finally { runner._resolveSshKey = originalResolve; }
});
