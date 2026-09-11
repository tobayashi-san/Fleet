'use strict';

// apt-get's C-locale simulation uses Inst/Remv records. Keep package names
// and versions only; repository descriptions and diagnostic output are not
// part of the structured impact report.
function parseAptUpgradePlan(output) {
  const changes = [];
  for (const line of String(output).split('\n')) {
    const install = line.match(/^Inst\s+(\S+)\s+(?:\[([^\]]+)\]\s+)?\(([^\s)]+)/);
    if (install) {
      changes.push({ action: install[2] ? 'upgrade' : 'install', package: install[1], current_version: install[2] || null, candidate_version: install[3] });
      continue;
    }
    const removal = line.match(/^Remv\s+(\S+)(?:\s+\[([^\]]+)\])?/);
    if (removal) changes.push({action:'remove',package:removal[1],current_version:removal[2] || null,candidate_version:null});
    else if (/^(Inst|Remv)\b/.test(line)) throw new Error('The package upgrade plan contains an unrecognized change record.');
  }
  return changes;
}

module.exports = { parseAptUpgradePlan };
