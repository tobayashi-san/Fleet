const VALUE_TYPES = new Set(['string', 'number', 'boolean', 'json']);
function parseVariableValue(value, type = 'string') {
  if (!VALUE_TYPES.has(type)) throw new Error('Unsupported variable type.');
  if (typeof value !== 'string') throw new Error('Variable input must be text.');
  if (type === 'string') return value;
  const text = value.trim();
  if (type === 'boolean') {
    if (text !== 'true' && text !== 'false') throw new Error('Boolean values must be true or false.');
    return text === 'true';
  }
  if (type === 'number') {
    if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(text) || !Number.isFinite(Number(text))) throw new Error('Enter a finite number using a decimal point.');
    return Number(text);
  }
  try {
    return JSON.parse(text, (_key, item) => {
      if (typeof item === 'number' && !Number.isFinite(item)) throw new Error('Non-finite number');
      return item;
    });
  } catch { throw new Error('Enter valid JSON with finite numeric values.'); }
}
module.exports = { parseVariableValue, VALUE_TYPES };
