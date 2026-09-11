'use strict';
const os = require('os');
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(os.tmpdir(), `shipyard_sessions_${process.pid}.db`);
process.env.JWT_SECRET = 'session-test-secret';
process.env.NODE_ENV = 'test';
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('events');
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { router } = require('../routes/auth');
const auth = require('../middleware/auth');
const { createSession, revokeSession, changes } = require('../utils/auth-sessions');
const { verifyWsAuth } = require('../ws/auth');
const { getJwtSecret } = require('../utils/jwt-secret');
const app = express();
app.use(express.json());
app.use('/auth', router);
app.get('/protected', auth, (_req, res) => res.json({ ok: true }));
const hash = bcrypt.hashSync('Session-test-password', 4);
db.users.create('alice', null, hash, 'admin');
db.users.create('bob', null, hash, 'viewer');
const alice = db.users.getByUsername('alice');
const bob = db.users.getByUsername('bob');
const bearer = token => `Bearer ${token}`;
function session(user, extra = {}) {
  const sid = createSession(user, { ip: '127.0.0.1', headers: { 'user-agent': 'Session test' } });
  return { sid, token: jwt.sign({ userId: user.id, tv: user.token_version || 0, sid, ...extra }, getJwtSecret(), { expiresIn: '1h' }) };
}
class Socket extends EventEmitter {
  close(code, reason) { this.closed = { code, reason }; this.emit('close'); }
}
after(() => { db.db.close(); for (const ext of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + ext); } catch {} } });

test('login issues a tracked session; listing excludes another account and credentials', async () => {
  const other = session(bob);
  const login = await request(app).post('/auth/login').set('User-Agent', 'Test browser').send({ username: 'alice', password: 'Session-test-password' });
  assert.equal(login.status, 200);
  const payload = jwt.verify(login.body.token, getJwtSecret());
  assert.equal(typeof payload.sid, 'string');
  const result = await request(app).get('/auth/sessions').set('Authorization', bearer(login.body.token));
  assert.equal(result.status, 200);
  assert.equal(result.body.legacy_current, false);
  assert.equal(result.body.sessions.some(row => row.id === other.sid), false);
  const current = result.body.sessions.find(row => row.current);
  assert.equal(current.id, payload.sid);
  assert.equal(current.user_agent, 'Test browser');
  assert.deepEqual(Object.keys(current).sort(), ['created_at','current','expires_at','id','ip','last_seen_at','user_agent'].sort());
});

test('revoke is owner-only and ends precisely the selected HTTP and websocket session', async () => {
  const own = session(alice), target = session(alice), foreign = session(bob);
  const url = token => new URL(`http://localhost/?token=${token}`);
  const targetWs = new Socket(), ownWs = new Socket();
  const listeners = changes.listenerCount('revoked');
  assert.equal(verifyWsAuth(targetWs, url(target.token)), true);
  assert.equal(verifyWsAuth(ownWs, url(own.token)), true);
  try {
    const denied = await request(app).delete(`/auth/sessions/${foreign.sid}`).set('Authorization', bearer(own.token));
    assert.equal(denied.status, 404);
    assert.equal((await request(app).get('/protected').set('Authorization', bearer(foreign.token))).status, 200);
    const revoked = await request(app).delete(`/auth/sessions/${target.sid}`).set('Authorization', bearer(own.token));
    assert.equal(revoked.status, 200);
    assert.equal(revoked.body.current, false);
    assert.equal(targetWs.closed.code, 4001);
    assert.equal(ownWs.closed, undefined);
    assert.equal((await request(app).get('/protected').set('Authorization', bearer(target.token))).status, 401);
    assert.equal((await request(app).get('/protected').set('Authorization', bearer(own.token))).status, 200);
    assert.equal(verifyWsAuth(new Socket(), url(target.token)), false);
    const self = await request(app).delete(`/auth/sessions/${own.sid}`).set('Authorization', bearer(own.token));
    assert.equal(self.body.current, true);
    assert.equal(ownWs.closed.code, 4001);
    assert.equal((await request(app).get('/auth/sessions').set('Authorization', bearer(own.token))).status, 401);
  } finally { targetWs.emit('close'); ownWs.emit('close'); }
  assert.equal(changes.listenerCount('revoked'), listeners);
});

test('expired, mismatched and missing tracked sessions are denied', async () => {
  const expired = session(alice);
  db.db.prepare('UPDATE auth_sessions SET expires_at=? WHERE id=?').run(Date.now()-1, expired.sid);
  const wrongOwner = session(bob, { userId: alice.id });
  const missing = session(alice);
  db.db.prepare('DELETE FROM auth_sessions WHERE id=?').run(missing.sid);
  for (const item of [expired, wrongOwner, missing]) {
    assert.equal((await request(app).get('/protected').set('Authorization', bearer(item.token))).status, 401);
    assert.equal(verifyWsAuth(new Socket(), new URL(`http://localhost/?token=${item.token}`)), false);
  }
});

test('audit failure rolls back revocation and emits no disconnect', () => {
  const own = session(alice);
  const write = db.auditLog.write;
  let signalled = false;
  const listener = () => { signalled = true; };
  changes.on('revoked', listener);
  try {
    db.auditLog.write = () => { throw new Error('Audit unavailable'); };
    assert.throws(() => revokeSession(alice.id, own.sid), /Audit unavailable/);
    assert.equal(db.db.prepare('SELECT revoked_at FROM auth_sessions WHERE id=?').get(own.sid).revoked_at, null);
    assert.equal(signalled, false);
  } finally { db.auditLog.write = write; changes.off('revoked', listener); }
});

test('legacy sign-ins are labelled; token-version invalidation still revokes them', async () => {
  const token = jwt.sign({ userId: bob.id, tv: bob.token_version || 0 }, getJwtSecret(), { expiresIn: '1h' });
  const result = await request(app).get('/auth/sessions').set('Authorization', bearer(token));
  assert.equal(result.status, 200);
  assert.equal(result.body.legacy_current, true);
  db.db.prepare('UPDATE users SET token_version=token_version+1 WHERE id=?').run(bob.id);
  assert.equal((await request(app).get('/protected').set('Authorization', bearer(token))).status, 401);
});

test('an open socket is revalidated and closed when its tracked session expires', t => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const own = session(alice);
  const ws = new Socket();
  const listeners = changes.listenerCount('revoked');
  assert.equal(verifyWsAuth(ws, new URL(`http://localhost/?token=${own.token}`)), true);
  db.db.prepare('UPDATE auth_sessions SET expires_at=? WHERE id=?').run(Date.now()-1, own.sid);
  t.mock.timers.tick(30000);
  assert.equal(ws.closed.code, 4001);
  assert.equal(changes.listenerCount('revoked'), listeners);
});

test('a database writer lock may delay last-seen telemetry but does not deny valid access', async () => {
  const own = session(alice);
  const old = Date.now()-120000;
  db.db.prepare('UPDATE auth_sessions SET last_seen_at=? WHERE id=?').run(old, own.sid);
  const competitor = new (require('better-sqlite3'))(process.env.DB_PATH);
  const timeout = db.db.pragma('busy_timeout', { simple: true });
  db.db.pragma('busy_timeout=1');
  competitor.exec('BEGIN IMMEDIATE');
  try {
    assert.equal((await request(app).get('/protected').set('Authorization', bearer(own.token))).status, 200);
    assert.equal(db.db.prepare('SELECT last_seen_at FROM auth_sessions WHERE id=?').get(own.sid).last_seen_at, old);
  } finally {
    competitor.exec('ROLLBACK'); competitor.close(); db.db.pragma(`busy_timeout=${timeout}`);
  }
  assert.equal((await request(app).get('/protected').set('Authorization', bearer(own.token))).status, 200);
  assert.ok(db.db.prepare('SELECT last_seen_at FROM auth_sessions WHERE id=?').get(own.sid).last_seen_at > old);
});

test('logout revokes the current tracked token without revoking another sign-in', async () => {
  const own = session(alice), other = session(alice);
  const result = await request(app).post('/auth/logout').set('Authorization', bearer(own.token));
  assert.equal(result.status, 200);
  assert.equal((await request(app).get('/protected').set('Authorization', bearer(own.token))).status, 401);
  assert.equal((await request(app).get('/protected').set('Authorization', bearer(other.token))).status, 200);
});

test('legacy logout revokes only the signed token and closes its connected socket', async () => {
  const token = jwt.sign({ userId: alice.id, tv: alice.token_version || 0, jti: 'legacy-logout' }, getJwtSecret(), { expiresIn: '1h' });
  const other = jwt.sign({ userId: alice.id, tv: alice.token_version || 0, jti: 'other-legacy' }, getJwtSecret(), { expiresIn: '1h' });
  const ws = new Socket();
  assert.equal(verifyWsAuth(ws, new URL(`http://localhost/?token=${token}`)), true);
  try {
    assert.equal((await request(app).post('/auth/logout').set('Authorization', bearer(token))).status, 200);
    assert.equal(ws.closed.code, 4001);
    assert.equal((await request(app).get('/protected').set('Authorization', bearer(token))).status, 401);
    assert.equal((await request(app).get('/protected').set('Authorization', bearer(other))).status, 200);
    assert.equal(verifyWsAuth(new Socket(), new URL(`http://localhost/?token=${token}`)), false);
    const rows = db.db.prepare("SELECT id FROM auth_sessions WHERE id LIKE 'legacy:%'").all();
    assert.ok(rows.length);
    assert.ok(rows.every(row => !row.id.includes(token) && /^legacy:[a-f0-9]{64}$/.test(row.id)));
  } finally { ws.emit('close'); }
});

test('failed logout audit preserves legacy access so the client can retry', async () => {
  const token = jwt.sign({ userId: alice.id, tv: alice.token_version || 0, jti: 'legacy-retry' }, getJwtSecret(), { expiresIn: '1h' });
  const write = db.auditLog.write;
  try {
    db.auditLog.write = () => { throw new Error('Audit unavailable'); };
    assert.equal((await request(app).post('/auth/logout').set('Authorization', bearer(token))).status, 500);
    assert.equal((await request(app).get('/protected').set('Authorization', bearer(token))).status, 200);
  } finally { db.auditLog.write = write; }
  assert.equal((await request(app).post('/auth/logout').set('Authorization', bearer(token))).status, 200);
});

test('session pages expose every active sign-in and keep the current one first', async () => {
  db.users.create('paging-user', null, hash, 'viewer');
  const user = db.users.getByUsername('paging-user');
  const own = session(user);
  db.db.prepare('UPDATE auth_sessions SET created_at=? WHERE id=?').run(1, own.sid);
  const expected = new Set([own.sid]);
  for (let index = 0; index < 24; index++) expected.add(session(user).sid);
  const first = await request(app).get('/auth/sessions?offset=0').set('Authorization', bearer(own.token));
  const second = await request(app).get('/auth/sessions?offset=20').set('Authorization', bearer(own.token));
  assert.equal(first.status, 200);
  assert.equal(first.body.total, 25);
  assert.equal(first.body.sessions.length, 20);
  assert.equal(first.body.sessions[0].id, own.sid);
  assert.equal(second.body.sessions.length, 5);
  const ids = [...first.body.sessions, ...second.body.sessions].map(row => row.id);
  assert.equal(new Set(ids).size, 25);
  assert.deepEqual(new Set(ids), expected);
  for (const offset of ['-1', '1.5', 'no', '9007199254740992']) {
    assert.equal((await request(app).get(`/auth/sessions?offset=${offset}`).set('Authorization', bearer(own.token))).status, 400);
  }
});
