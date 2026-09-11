'use strict';

/** Finite calendar recurrence: wall-clock start stays fixed, elapsed duration stays fixed. */
function maintenanceOccurrences(value, recurrence) {
  if (!recurrence || recurrence.frequency === 'none') return [{ starts_at: value.starts_at, ends_at: value.ends_at }];
  const { frequency, count } = recurrence;
  if (!['daily', 'weekly'].includes(frequency) || !Number.isInteger(count) || count < 2 || count > 52) {
    throw new Error('Repeat must be daily or weekly with 2–52 occurrences.');
  }
  const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: value.timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  const wallStamp = instant => {
    const p = Object.fromEntries(formatter.formatToParts(new Date(instant)).map(part => [part.type, part.value]));
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  };
  const first = Date.parse(value.starts_at);
  const duration = Date.parse(value.ends_at) - first;
  const day = 86400000;
  const firstWall = wallStamp(first);
  const result = [{ starts_at: value.starts_at, ends_at: value.ends_at }];
  for (let index = 1; index < count; index++) {
    const desired = firstWall + index * (frequency === 'weekly' ? 7 : 1) * day;
    const offsets = new Set();
    for (let hours = -36; hours <= 36; hours += 6) {
      const sample = desired + hours * 3600000;
      offsets.add(wallStamp(sample) - sample);
    }
    const candidates = [...offsets].map(offset => desired - offset).filter(candidate => wallStamp(candidate) === desired);
    if (candidates.length !== 1) throw new Error(`Occurrence ${index + 1} has a ${candidates.length ? 'duplicated' : 'nonexistent'} local time in ${value.timezone}. Choose a different start time.`);
    const start = candidates[0] + first % 1000;
    result.push({ starts_at: new Date(start).toISOString(), ends_at: new Date(start + duration).toISOString() });
  }
  return result;
}
module.exports = { maintenanceOccurrences };
