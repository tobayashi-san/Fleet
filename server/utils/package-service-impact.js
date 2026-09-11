'use strict';

// Read installed file ownership only. Never invoke service managers or
// package maintainer scripts. Invalid package tokens are not passed to dpkg.
const PACKAGE_SERVICE_QUERY = String.raw`
  echo "---SERVICEOWNERSHIP---"
  printf '%s\n' "$upgrade_plan" | awk '/^(Inst|Remv) / && $2 ~ /^[a-z0-9][a-z0-9+.:~-]*$/ {if (!seen[$2]++) print $2}' | while IFS= read -r package; do
    if files=$(dpkg-query --listfiles "$package" 2>/dev/null); then
      printf '%s\tok\n' "$package"
      printf '%s\n' "$files" | awk -v package="$package" '/^\/(usr\/)?lib\/systemd\/system\/[^/]+[.]service$/ || /^\/etc\/systemd\/system\/[^/]+[.]service$/ || /^\/etc\/init[.]d\/[^/]+$/ {printf "%s\tfile\t%s\n", package, $0}'
    else
      printf '%s\tunavailable\n' "$package"
    fi
  done`;

function parsePackageServiceOwnership(output, changes) {
  const reports = new Map(changes.map(change => [change.package, {package:change.package, units:null}]));
  for (const line of String(output).split('\n')) {
    const [name, status, path] = line.split('\t');
    const report = reports.get(name);
    if (!report) continue;
    if (status === 'ok') report.units = [];
    else if (status === 'unavailable') report.units = null;
    else if (status === 'file' && report.units && path) {
      const systemd = path.match(/^\/(?:usr\/)?lib\/systemd\/system\/([^/]+\.service)$/) || path.match(/^\/etc\/systemd\/system\/([^/]+\.service)$/);
      const init = path.match(/^\/etc\/init\.d\/([^/]+)$/);
      const unit = systemd?.[1] || (init ? `init.d/${init[1]}` : null);
      if (unit && !report.units.includes(unit)) report.units.push(unit);
    }
  }
  return [...reports.values()];
}

module.exports = { PACKAGE_SERVICE_QUERY, parsePackageServiceOwnership };
