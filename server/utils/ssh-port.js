/** Only an omitted port uses the standard default; supplied invalid values reject. */
function parseSshPort(value) {
  if (value === undefined) return 22;
  const numeric = typeof value === 'number' ? value : typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN;
  if (!Number.isInteger(numeric) || numeric < 1 || numeric > 65535) {
    const error = new Error('SSH port must be a whole number between 1 and 65535.');
    error.statusCode = 400;
    throw error;
  }
  return numeric;
}
module.exports = { parseSshPort };
