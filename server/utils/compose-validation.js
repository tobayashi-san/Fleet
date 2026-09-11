const yaml = require('js-yaml');
const isMapping = value => value !== null && typeof value === 'object' && !Array.isArray(value);

// Local structural validation only. Runtime interpolation and the installed
// Compose implementation are checked when the operator explicitly starts it.
function validateComposeContent(content) {
  if (typeof content !== 'string' || !content.trim()) return 'Compose YAML is required.';
  if (Buffer.byteLength(content, 'utf8') > 1024 * 1024) return 'Compose YAML must not exceed 1 MiB.';
  let document;
  try { document = yaml.load(content, { schema: yaml.JSON_SCHEMA }); }
  catch (error) {
    const position = error.mark ? ` at line ${error.mark.line + 1}, column ${error.mark.column + 1}` : '';
    return `Invalid YAML${position}. Check indentation, duplicate keys and syntax.`;
  }
  if (!isMapping(document)) return 'Compose YAML must be a mapping.';
  if (document.services === undefined && document.include === undefined) return 'Define services or include another Compose file.';
  if (document.services !== undefined) {
    if (!isMapping(document.services)) return 'services must be a mapping of service names to configurations.';
    for (const [name, service] of Object.entries(document.services)) {
      if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(name)) return 'Service names must start with a letter or digit and contain only letters, digits, dots, underscores or hyphens.';
      if (!isMapping(service)) return 'Each service configuration must be a mapping.';
    }
  }
  if (document.include !== undefined && !Array.isArray(document.include)) return 'include must be a list of Compose files.';
  return null;
}
module.exports = { validateComposeContent };
