'use strict';

function executionSummary(status, output) {
  const lines = String(output || '').replace(/\x1b\[[0-9;]*m/g, '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (status === 'failed') {
    if (!lines.length) return 'No error details were recorded.';
    const explicit = lines.filter(line => /(?:^|\b)(?:error:|fatal:|failed!|exception:|permission denied|connection refused|timed out|lock unavailable|unable to|could not)\s*/i.test(line));
    return explicit.at(-1)?.slice(0, 500) || 'Failure cause not identified; open the full log.';
  }
  return lines.at(-1)?.slice(0, 500) || 'No execution output recorded.';
}

module.exports = { executionSummary };
