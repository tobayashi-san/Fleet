const assert = require('node:assert/strict');
const test = require('node:test');

const {
  DEFAULT_ORIGINS,
  createCorsOriginValidator,
  isAllowedRequestOrigin,
  parseAllowedOrigins,
} = require('../utils/allowed-origins');

test('default dev origins include the current Vite frontend port', () => {
  assert.deepEqual(DEFAULT_ORIGINS, ['http://localhost:3000', 'http://localhost:5174']);
  assert.deepEqual(parseAllowedOrigins(''), DEFAULT_ORIGINS);
  assert.equal(isAllowedRequestOrigin(DEFAULT_ORIGINS, 'http://localhost:5174'), true);
});

test('configured origins are normalized and deduplicated', () => {
  assert.deepEqual(
    parseAllowedOrigins('https://fleet.example, https://fleet.example/, http://localhost:5174'),
    ['https://fleet.example', 'http://localhost:5174']
  );
});

test('invalid configured origins are ignored without broadening CORS', () => {
  assert.deepEqual(
    parseAllowedOrigins('*, null, file:///tmp/x, https://user:pass@example.com, https://example.com/path, https://example.com?x=1'),
    DEFAULT_ORIGINS
  );
});

test('request origin validation rejects invalid and lookalike origins', () => {
  const allowed = parseAllowedOrigins('https://fleet.example');
  assert.equal(isAllowedRequestOrigin(allowed, 'https://fleet.example'), true);
  assert.equal(isAllowedRequestOrigin(allowed, 'https://fleet.example.evil.test'), false);
  assert.equal(isAllowedRequestOrigin(allowed, 'null'), false);
  assert.equal(isAllowedRequestOrigin(allowed, 'file:///tmp/x'), false);
});

test('CORS origin validator allows missing and exact allowed origins only', async () => {
  const validate = createCorsOriginValidator(parseAllowedOrigins('https://fleet.example'));
  const call = (origin) => new Promise((resolve, reject) => {
    validate(origin, (err, value) => {
      if (err) reject(err);
      else resolve(value);
    });
  });

  assert.equal(await call(undefined), true);
  assert.equal(await call('https://fleet.example'), 'https://fleet.example');
  assert.equal(await call('https://fleet.example/'), 'https://fleet.example');
  assert.equal(await call('https://fleet.example.evil.test'), false);
  assert.equal(await call('null'), false);
  assert.equal(await call('*'), false);
});
