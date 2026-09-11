'use strict';
function updateCatalogAge(updatedAt, intervalMinutes, now = Date.now()) {
  const interval = Number(intervalMinutes);
  const staleAfterSeconds = Math.max(120, (Number.isFinite(interval) && interval > 0 ? interval : 60) * 120);
  const normalized = typeof updatedAt === 'string' && /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(updatedAt) ? updatedAt.replace(' ', 'T') + 'Z' : updatedAt;
  const checked = updatedAt ? Date.parse(normalized) : NaN;
  return {stale_after_seconds: staleAfterSeconds, stale: !Number.isFinite(checked) || now - checked > staleAfterSeconds * 1000};
}
module.exports = {updateCatalogAge};
