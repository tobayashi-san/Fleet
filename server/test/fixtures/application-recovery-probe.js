'use strict';
const request = require('supertest');
const db = require('../../db');
const {createApp} = require('../../app');
const {getSecret} = require('../../utils/crypto');
async function main() {
  const {app} = createApp();
  const health = await request(app).get('/api/health');
  const old = await request(app).get('/api/ping').set('Authorization', `Bearer ${process.env.RECOVERY_TEST_OLD_TOKEN}`);
  const login = await request(app).post('/api/auth/login').send({username: 'recovery-admin', password: 'Recovery-account-password'});
  const token = login.body.token;
  const hosts = await request(app).get('/api/servers').set('Authorization', `Bearer ${token}`).set('X-Fleet-Environment', 'recovery-env');
  const playbook = await request(app).get('/api/playbooks/recovered.yml').set('Authorization', `Bearer ${token}`).set('X-Fleet-Environment', 'recovery-env');
  const result = {health: health.status, oldSession: old.status, login: login.status, hosts: hosts.status, hostRestored: Array.isArray(hosts.body) && hosts.body.some(host => host.name === 'Recovered host' && host.environment_id === 'recovery-env'), playbook: playbook.status, playbookRestored: playbook.body.content === '- hosts: all\n  tasks: []\n', secretRestored: getSecret(db, 'smtp_password') === 'synthetic-recovered-smtp'};
  require('../../services/scheduler').shutdown();
  db.db.close();
  process.stdout.write('APPLICATION_RECOVERY_RESULT=' + JSON.stringify(result) + '\n');
}
main().catch(error => { process.stderr.write(error.stack + '\n'); process.exitCode = 1; });
