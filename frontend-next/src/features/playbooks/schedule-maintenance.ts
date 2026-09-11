export interface ScheduleMaintenanceWindow {
  id: string;
  name: string;
  environment_id: string;
  starts_at: string;
  ends_at: string;
  resource_ids: string[];
  cancelled_at?: string | null;
}

/** Coverage at the scheduled start only, using current inventory identities. */
export function maintenanceAtStart(run: string, targets: string[], hosts: Record<string, unknown>[], windows: ScheduleMaintenanceWindow[], environmentId: string) {
  const instant = Date.parse(run);
  const active = windows.filter(window => window.environment_id === environmentId && !window.cancelled_at
    && Date.parse(window.starts_at) <= instant && instant < Date.parse(window.ends_at));
  const selected = [...new Set(targets)];
  const known = selected.flatMap(name => {
    const matches = hosts.filter(host => host.name === name && host.id != null
      && (host.environment_id == null || String(host.environment_id) === environmentId));
    // Names are execution targets, but coverage is tied to an unambiguous host ID.
    return matches.length === 1 ? [{name, id: String(matches[0].id)}] : [];
  });
  const matching = active.filter(window => known.some(host => !window.resource_ids.length || window.resource_ids.includes(host.id)));
  return {
    total: selected.length,
    covered: known.filter(host => matching.some(window => !window.resource_ids.length || window.resource_ids.includes(host.id))).length,
    uncovered: known.filter(host => !matching.some(window => !window.resource_ids.length || window.resource_ids.includes(host.id))).map(host => host.name),
    unresolved: selected.filter(name => !known.some(host => host.name === name)),
    windows: matching,
  };
}
