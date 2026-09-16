/** Flag clear cadence contradictions; arbitrary labels and custom cron stay valid. */
export function scheduleNameMismatch(name: string, cron: string): string | null {
  const fields = cron.trim().split(/\s+/);
  if (fields.length !== 5) return null;
  const [, , day, month, weekday] = fields;
  const daily = day === '*' && month === '*' && weekday === '*';
  const weekly = day === '*' && month === '*' && /^\d$/.test(weekday);
  if (/\bweekly\b/i.test(name) && daily) return 'The name says weekly, but this schedule runs every day. Rename it or select a weekly recurrence.';
  if (/\bdaily\b/i.test(name) && weekly) return 'The name says daily, but this schedule runs once a week. Rename it or select a daily recurrence.';
  return null;
}
