function timestamp(value) {
  const raw = String(value || '');
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(raw) ? raw.replace(' ', 'T') + 'Z' : raw;
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? parsed : -Infinity;
}
function compareHistory(a, b) {
  const left = timestamp(a.started_at), right = timestamp(b.started_at);
  if (left !== right) return left < right ? 1 : -1;
  const source = String(a._type || 'manual').localeCompare(String(b._type || 'manual'));
  return source || String(b.id).localeCompare(String(a.id));
}
module.exports = { compareHistory };
