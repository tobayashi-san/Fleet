'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {createResetBackupTickets} = require('../services/reset-backup-tickets');
test('tickets expire, bind identity/action/scope, enforce capacity and cannot be reused', () => {
  let time = 0;
  const tickets = createResetBackupTickets({now: () => time, ttlMs: 100, capacity: 1});
  const ticket = tickets.issue('alice', 'all', 'all-environments', {fingerprint: 'proof'});
  assert.throws(() => tickets.issue('bob', 'all', 'all-environments', {}), /Too many/);
  assert.throws(() => tickets.take(ticket.id, 'bob', 'all', 'all-environments'), /belongs/);
  assert.throws(() => tickets.take(ticket.id, 'alice', 'auth', 'all-environments'), /belongs/);
  assert.throws(() => tickets.take(ticket.id, 'alice', 'all', 'default'), /belongs/);
  assert.deepEqual(tickets.take(ticket.id, 'alice', 'all', 'all-environments'), {fingerprint: 'proof'});
  assert.throws(() => tickets.take(ticket.id, 'alice', 'all', 'all-environments'), /missing/);
  const expired = tickets.issue('alice', 'all', 'all-environments', {});
  time = 100;
  assert.throws(() => tickets.take(expired.id, 'alice', 'all', 'all-environments'), /expired/);
  assert.ok(tickets.issue('alice', 'all', 'all-environments', {}).id);
});
