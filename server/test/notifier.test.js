'use strict';

const os = require('os');
const path = require('path');
const fs = require('fs');
const { EventEmitter } = require('events');
process.env.DB_PATH = path.join(os.tmpdir(), `lab_test_notifier_${Date.now()}.db`);
process.env.JWT_SECRET = 'test-jwt-secret-notifier';
process.env.NODE_ENV = 'test';

const { test, describe, after } = require('node:test');
const assert = require('node:assert/strict');

const db = require('../db');
const { sendWebhook } = require('../services/notifier');

async function captureWebhookPayload(url) {
  const dns = require('dns').promises;
  const https = require('https');
  const originalLookup = dns.lookup;
  const originalRequest = https.request;
  let capturedBody = '';

  dns.lookup = async (_hostname, opts) => {
    if (opts?.all) return [{ address: '93.184.216.34', family: 4 }];
    return { address: '93.184.216.34', family: 4 };
  };
  https.request = (_options, callback) => {
    const req = new EventEmitter();
    req.write = (chunk) => { capturedBody += chunk; };
    req.end = () => {
      const res = new EventEmitter();
      res.statusCode = 204;
      callback(res);
      process.nextTick(() => res.emit('end'));
    };
    req.destroy = () => {};
    return req;
  };

  try {
    db.settings.set('webhook_url', url);
    const result = await sendWebhook('Alert', 'message body', false);
    return { result, payload: JSON.parse(capturedBody) };
  } finally {
    dns.lookup = originalLookup;
    https.request = originalRequest;
  }
}

after(() => {
  for (const ext of ['', '-wal', '-shm']) {
    try { fs.unlinkSync(process.env.DB_PATH + ext); } catch {}
  }
});

// ── SSRF Protection ──────────────────────────────────────────────────────────

describe('webhook SSRF protection', () => {
  const blockedUrls = [
    'http://localhost/hook',
    'http://0.0.0.0/hook',
    'http://127.0.0.1/hook',
    'http://10.0.0.1/hook',
    'http://192.168.1.1/hook',
    'http://172.16.0.1/hook',
    'http://172.31.255.255/hook',
    'http://169.254.169.254/latest/meta-data/',
    'http://metadata.google.internal/computeMetadata/',
    'http://[::1]/hook',
    'http://[fe80::1]/hook',
    'http://[fc00::1]/hook',
    'http://[fd00::1]/hook',
    'http://[::ffff:172.16.0.1]/hook',
  ];

  for (const url of blockedUrls) {
    test(`blocks ${url}`, async () => {
      db.settings.set('webhook_url', url);
      const result = await sendWebhook('Test', 'test message', true);
      assert.deepEqual(result, { ok: false });
    });
  }

  test('blocks domain that resolves to internal IP (DNS SSRF bypass)', async () => {
    const dns = require('dns').promises;
    const originalLookup = dns.lookup;
    // Simulate a public domain that points to the AWS metadata IP
    dns.lookup = async (hostname, opts) => {
      if (hostname === 'evil.ssrf-test.example') {
        if (opts?.all) return [{ address: '169.254.169.254', family: 4 }];
        return { address: '169.254.169.254', family: 4 };
      }
      return originalLookup(hostname, opts);
    };
    try {
      db.settings.set('webhook_url', 'https://evil.ssrf-test.example/hook');
      const result = await sendWebhook('Test', 'SSRF test', true);
      assert.deepEqual(result, { ok: false });
    } finally {
      dns.lookup = originalLookup;
    }
  });

  test('blocks domain that resolves to loopback (127.x DNS bypass)', async () => {
    const dns = require('dns').promises;
    const originalLookup = dns.lookup;
    dns.lookup = async (hostname, opts) => {
      if (hostname === 'loopback.ssrf-test.example') {
        if (opts?.all) return [{ address: '127.0.0.1', family: 4 }];
        return { address: '127.0.0.1', family: 4 };
      }
      return originalLookup(hostname, opts);
    };
    try {
      db.settings.set('webhook_url', 'http://loopback.ssrf-test.example/hook');
      const result = await sendWebhook('Test', 'SSRF test', true);
      assert.deepEqual(result, { ok: false });
    } finally {
      dns.lookup = originalLookup;
    }
  });

  test('blocks when one of multiple DNS records resolves internally', async () => {
    const dns = require('dns').promises;
    const originalLookup = dns.lookup;
    dns.lookup = async (hostname, opts) => {
      if (hostname === 'mixed.ssrf-test.example') {
        if (opts?.all) {
          return [
            { address: '93.184.216.34', family: 4 },
            { address: '127.0.0.1', family: 4 },
          ];
        }
        return { address: '93.184.216.34', family: 4 };
      }
      return originalLookup(hostname, opts);
    };
    try {
      db.settings.set('webhook_url', 'https://mixed.ssrf-test.example/hook');
      const result = await sendWebhook('Test', 'SSRF test', true);
      assert.deepEqual(result, { ok: false });
    } finally {
      dns.lookup = originalLookup;
    }
  });

  test('returns undefined when no webhook URL configured', async () => {
    db.settings.set('webhook_url', '');
    const result = await sendWebhook('Test', 'test message', true);
    assert.equal(result, undefined);
  });

  test('uses Discord payload only for discord.com webhook URLs', async () => {
    const { result, payload } = await captureWebhookPayload('https://discord.com/api/webhooks/123/token');
    assert.equal(result.ok, true);
    assert.equal(Array.isArray(payload.embeds), true);
    assert.equal(payload.embeds[0].title, 'Alert');
  });

  test('does not treat lookalike Discord hosts as Discord webhooks', async () => {
    const lookalikes = [
      'https://evil-discord.com/api/webhooks/123/token',
      'https://discord.com.evil.example/api/webhooks/123/token',
    ];

    for (const url of lookalikes) {
      const { result, payload } = await captureWebhookPayload(url);
      assert.equal(result.ok, true);
      assert.equal(payload.embeds, undefined);
      assert.equal(payload.title, 'Alert');
    }
  });
});

test('delivery history records acceptance without webhook secrets or message bodies', async () => {
  await captureWebhookPayload('https://example.com/hook/secret-path?token=secret');
  const row = db.db.prepare('SELECT * FROM notification_deliveries ORDER BY rowid DESC LIMIT 1').get();
  assert.equal(row.channel, 'webhook');
  assert.equal(row.status, 'accepted');
  assert.equal(row.status_code, 204);
  assert.equal(row.destination, 'example.com');
  assert.ok(row.duration_ms >= 0);
  assert.equal(JSON.stringify(row).includes('secret'), false);
  assert.equal(JSON.stringify(row).includes('message body'), false);
});
test('blocked delivery is recorded as failed; an unconfigured channel records no attempt', async () => {
  db.settings.set('webhook_url', 'http://127.0.0.1/secret');
  await sendWebhook('Blocked event', 'private message', false);
  assert.equal(db.db.prepare('SELECT status FROM notification_deliveries ORDER BY rowid DESC LIMIT 1').get().status, 'failed');
  const before = db.db.prepare('SELECT COUNT(*) AS count FROM notification_deliveries').get().count;
  db.settings.set('webhook_url', '');
  await sendWebhook('No channel', 'private message', false);
  assert.equal(db.db.prepare('SELECT COUNT(*) AS count FROM notification_deliveries').get().count, before);
});

test('delivery history endpoint is admin-only, paginated and excludes expired attempts', async () => {
  const express = require('express');
  const request = require('supertest');
  const app = express();
  app.use((req, res, next) => { req.user = { role: req.headers['x-test-role'] || 'user' }; next(); });
  app.use('/system', require('../routes/system'));
  db.db.prepare("INSERT INTO notification_deliveries (id, channel, destination, event_title, status, created_at) VALUES ('expired-attempt', 'smtp', 'example.com', 'Old event', 'failed', '2000-01-01')").run();
  const denied = await request(app).get('/system/notification-deliveries');
  assert.equal(denied.status, 403);
  const response = await request(app).get('/system/notification-deliveries?page=1').set('x-test-role', 'admin');
  assert.equal(response.status, 200);
  assert.equal(response.body.page_size, 25);
  assert.ok(response.body.items.length <= 25);
  assert.equal(response.body.items.some(row => row.id === 'expired-attempt'), false);
});

test('SMTP attempts distinguish acceptance, partial rejection and transport errors without storing recipients', async () => {
  const nodemailer = require('nodemailer');
  const { sendEmail } = require('../services/notifier');
  const original = nodemailer.createTransport;
  const outcomes = [
    { accepted: ['private@example.com'], rejected: [] },
    { accepted: ['private@example.com'], rejected: ['rejected@example.com'] },
    { accepted: [], rejected: ['private@example.com'] },
    new Error('password=must-not-be-recorded'),
  ];
  nodemailer.createTransport = () => ({ sendMail: async () => { const value = outcomes.shift(); if (value instanceof Error) throw value; return value; }, close() {} });
  try {
    db.settings.set('smtp_host', 'smtp-review.example.com');
    db.settings.set('smtp_to', 'private@example.com');
    for (const expected of ['accepted', 'partial', 'failed', 'failed']) {
      try { await sendEmail('SMTP check', 'private body', false); } catch (error) { assert.equal(error.message, 'password=must-not-be-recorded'); }
      const row = db.db.prepare('SELECT * FROM notification_deliveries ORDER BY rowid DESC LIMIT 1').get();
      assert.equal(row.channel, 'smtp');
      assert.equal(row.status, expected);
      assert.equal(row.destination, 'smtp-review.example.com');
      assert.equal(JSON.stringify(row).includes('private'), false);
      assert.equal(JSON.stringify(row).includes('password'), false);
    }
  } finally { nodemailer.createTransport = original; db.settings.set('smtp_host', ''); db.settings.set('smtp_to', ''); }
});

test('delivery retention prunes expired records and caps history at 1000 attempts', async () => {
  const insert = db.db.prepare('INSERT INTO notification_deliveries (id, channel, destination, event_title, status) VALUES (?, ?, ?, ?, ?)');
  db.db.transaction(() => { for (let i = 0; i < 1002; i++) insert.run(`retention-${i}`, 'webhook', 'example.com', 'Retention test', 'accepted'); })();
  await captureWebhookPayload('https://example.com/retention');
  assert.equal(db.db.prepare('SELECT COUNT(*) AS count FROM notification_deliveries').get().count, 1000);
  assert.equal(db.db.prepare("SELECT id FROM notification_deliveries WHERE id = 'expired-attempt'").get(), undefined);
});

test('configured duplicate suppression isolates environments and records skipped sends', async () => {
 const dns=require('dns').promises,https=require('https');
 const lookup=dns.lookup,request=https.request;let calls=0;
 dns.lookup=async()=>[{address:'93.184.216.34',family:4}];
 https.request=(_options,callback)=>{calls++;const req=new EventEmitter();req.write=()=>{};req.destroy=()=>{};req.end=()=>{const res=new EventEmitter();res.statusCode=204;callback(res);process.nextTick(()=>res.emit('end'));};return req;};
 try {
  db.settings.set('webhook_url','https://example.com/dedupe');db.settings.set('notify_dedupe_minutes','5');db.settings.set('smtp_host','');
  const {notify}=require('../services/notifier');
  await notify('Dedupe fixture','same',false,{environmentId:'a'});
  await notify('Dedupe fixture','same',false,{environmentId:'a'});assert.equal(calls,1);
  await notify('Dedupe fixture','same',false,{environmentId:'b'});assert.equal(calls,2);
  await notify('Dedupe fixture','changed',false,{environmentId:'a'});assert.equal(calls,3);
  await sendWebhook('Dedupe fixture','same',false);assert.equal(calls,4);
  const history=db.db.prepare("SELECT status FROM notification_deliveries WHERE event_title='Dedupe fixture' ORDER BY rowid").all();
  assert.deepEqual(history.map(row=>row.status),['accepted','suppressed','accepted','accepted','accepted']);
 } finally {dns.lookup=lookup;https.request=request;db.settings.set('notify_dedupe_minutes','0');}
});

test('duplicate suppression setting is admin-only and rejects invalid periods before changing settings',async()=>{
 const express=require('express'),request=require('supertest');const app=express();app.use(express.json());
 app.use((req,res,next)=>{req.user={role:req.headers['x-test-role']||'user'};next();});app.use('/system',require('../routes/system'));
 assert.equal((await request(app).put('/system/settings').send({notifDedupeMinutes:5})).status,403);
 const saved=await request(app).put('/system/settings').set('x-test-role','admin').send({notifDedupeMinutes:5});assert.equal(saved.status,200);
 const read=await request(app).get('/system/settings').set('x-test-role','admin');assert.equal(read.body.notifDedupeMinutes,5);
 for(const value of [-1,61,1.5,'5',null]) {assert.equal((await request(app).put('/system/settings').set('x-test-role','admin').send({notifDedupeMinutes:value})).status,400);assert.equal(db.settings.get('notify_dedupe_minutes'),'5');}
 db.settings.set('notify_dedupe_minutes','0');
});

test('active maintenance suppression is recorded without sending or delaying post-window notifications',async()=>{
 const dns=require('dns').promises,https=require('https');const lookup=dns.lookup,request=https.request;let calls=0;
 dns.lookup=async()=>[{address:'93.184.216.34',family:4}];https.request=(_options,callback)=>{calls++;const req=new EventEmitter();req.write=()=>{};req.destroy=()=>{};req.end=()=>{const res=new EventEmitter();res.statusCode=204;callback(res);process.nextTick(()=>res.emit('end'));};return req;};
 const host=db.servers.create({name:'maintenance-notify',hostname:'maintenance-notify',ip_address:'192.0.2.22'});const windowId=db.uuidv4();
 db.db.prepare('INSERT INTO maintenance_windows (id,name,environment_id,starts_at,ends_at,resource_ids) VALUES (?,?,?,?,?,?)').run(windowId,'Fixture active maintenance','default',new Date(Date.now()-60000).toISOString(),new Date(Date.now()+60000).toISOString(),JSON.stringify([host.id]));
 try {
 db.settings.set('webhook_url','https://example.com/maintenance');db.settings.set('smtp_host','');db.settings.set('notify_dedupe_minutes','5');db.settings.set('notify_suppress_maintenance','1');
 const {notify}=require('../services/notifier');const options={environmentId:'default',serverIds:[host.id]};
 await notify('Maintenance fixture','Failed',false,options);assert.equal(calls,0);
 assert.equal(db.db.prepare('SELECT status FROM notification_deliveries ORDER BY rowid DESC LIMIT 1').get().status,'maintenance');
 await sendWebhook('Maintenance fixture','Channel test',true);assert.equal(calls,1);
 db.db.prepare('UPDATE maintenance_windows SET ends_at=? WHERE id=?').run(new Date(Date.now()-1).toISOString(),windowId);
 await notify('Maintenance fixture','Failed',false,options);assert.equal(calls,2);
 } finally {dns.lookup=lookup;https.request=request;db.settings.set('notify_dedupe_minutes','0');db.settings.set('notify_suppress_maintenance','0');db.db.prepare('DELETE FROM maintenance_windows WHERE id=?').run(windowId);}
});

test('maintenance suppression preference requires an explicit administrator boolean',async()=>{
 const express=require('express'),request=require('supertest');const app=express();app.use(express.json());app.use((req,res,next)=>{req.user={role:req.headers['x-test-role']||'user'};next();});app.use('/system',require('../routes/system'));
 assert.equal((await request(app).put('/system/settings').send({notifSuppressMaintenance:true})).status,403);
 for(const value of ['true',1,null])assert.equal((await request(app).put('/system/settings').set('x-test-role','admin').send({notifSuppressMaintenance:value})).status,400);
 assert.equal((await request(app).put('/system/settings').set('x-test-role','admin').send({notifSuppressMaintenance:true})).status,200);
 assert.equal((await request(app).get('/system/settings').set('x-test-role','admin')).body.notifSuppressMaintenance,true);
 db.settings.set('notify_suppress_maintenance','0');
});
