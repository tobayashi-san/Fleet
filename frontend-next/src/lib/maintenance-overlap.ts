interface WindowRange { cancelled_at?: string|null; id?: string; starts_at: string; ends_at: string; resource_ids?: string[] }
/** Adjacent windows do not overlap; an empty host scope covers the environment. */
export function overlappingWindows<T extends WindowRange>(candidate: WindowRange, windows: T[]): T[] {
  const start = Date.parse(candidate.starts_at);
  const end = Date.parse(candidate.ends_at);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) return [];
  return windows.filter(window => !window.cancelled_at && window.id !== candidate.id
    && start < Date.parse(window.ends_at) && end > Date.parse(window.starts_at)
    && (!(candidate.resource_ids?.length) || !(window.resource_ids?.length)
      || candidate.resource_ids.some(id => window.resource_ids!.includes(id))));
}
