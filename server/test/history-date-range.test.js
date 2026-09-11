const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validHistoryRange, matchesHistoryRange } = require('../utils/history-date-range');
test('validates calendar days and ordered inclusive ranges', () => {
 assert.equal(validHistoryRange('2026-02-30',''),false);
 assert.equal(validHistoryRange('2026-04-31',''),false);
 assert.equal(validHistoryRange('2026-09-02','2026-09-01'),false);
 assert.equal(validHistoryRange('2024-02-29','2024-02-29'),true);
});
test('uses Zurich calendar days across summer and winter time', () => {
 assert.equal(matchesHistoryRange('2026-09-10 22:00:00','2026-09-11','2026-09-11'),true);
 assert.equal(matchesHistoryRange('2026-09-11T22:00:00Z','2026-09-11','2026-09-11'),false);
 assert.equal(matchesHistoryRange('2026-01-10T23:00:00Z','2026-01-11','2026-01-11'),true);
 assert.equal(matchesHistoryRange('2026-03-29T21:59:59Z','2026-03-29','2026-03-29'),true);
 assert.equal(matchesHistoryRange('2026-03-29T22:00:00Z','2026-03-29','2026-03-29'),false);
 assert.equal(matchesHistoryRange('invalid','2026-09-11',''),false);
});
