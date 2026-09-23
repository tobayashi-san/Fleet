'use strict';
const os = require('os');
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(os.tmpdir(), `fleet-role-preview-${process.pid}.db`);
process.env.JWT_SECRET = 'test-role-preview';
process.env.NODE_ENV = 'test';
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const db = require('../db');
const { getPermissions } = require('../utils/permissions');
const app = express();
app.use((req, res, next) => { req.user = { role: 'admin' }; next(); });
app.use('/roles', require('../routes/roles'));
after(() => {
  for (const suffix of ['', '-wal', '-shm']) {
    try { fs.unlinkSync(process.env.DB_PATH + suffix); } catch {}
  }
});
test('role previews use runtime defaults and legacy migration without widening explicit denials', async () => {
  const role = db.roles.create('Legacy scoped operator', {
    servers: { servers: ['example'], groups: [] },
    canManageDeployments: true,
    canDestroyDeployments: false,
  });
  const result = await request(app).get('/roles').expect(200);
  for (const row of result.body) {
    assert.deepEqual(row.effectivePermissions, getPermissions({ role: row.id }));
  }
  const preview = result.body.find(row => row.id === role.id).effectivePermissions;
  assert.equal(preview.canApplyDeployments, true);
  assert.equal(preview.canDestroyDeployments, false);
  assert.equal(preview.canUseTerminal, false);
});
