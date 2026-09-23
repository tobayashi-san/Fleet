'use strict';
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fleet-no-plugins-'));
process.env.DB_PATH = path.join(root, 'db.sqlite');
process.env.JWT_SECRET = 'plugin-removal-test-secret';
process.env.NODE_ENV = 'test';
const request = require('supertest');
const { createApp } = require('../app');
after(() => fs.rmSync(root, {recursive:true,force:true}));
test('retired plugin APIs and assets are unavailable to administrators', async () => {
  const { app } = createApp();
  const setup = await request(app).post('/api/auth/setup').send({ username:'admin',password:'Plugin-removal-2026!' });
  assert.equal(setup.status,200);
  for (const [method,url] of [
    ['get','/api/plugins'],['post','/api/plugins/reload'],['post','/api/plugins/example/enable'],
    ['get','/api/plugin/example/status'],['get','/plugins/example/ui.js'],['get','/plugins/example/assets/app.js'],
  ]) {
    const response = await request(app)[method](url).set('Authorization',`Bearer ${setup.body.token}`);
    assert.equal(response.status,404,`${method} ${url}`);
    assert.deepEqual(response.body,{error:'Not found'});
  }
  for (const [method,url] of [['post','/api/v1/agent/report'],['get','/api/v1/agent-manifest'],['get','/api/v1/servers/example/agent']]) {
    const result = await request(app)[method](url).set('Authorization',`Bearer ${setup.body.token}`);
    assert.equal(result.status,410);
  }
  const settings = await request(app).put('/api/system/settings').set('Authorization',`Bearer ${setup.body.token}`).send({agentEnabled:true});
  assert.equal(settings.status,400);
  assert.equal(fs.existsSync(path.join(__dirname,'../services/plugin-loader.js')),false);
});
