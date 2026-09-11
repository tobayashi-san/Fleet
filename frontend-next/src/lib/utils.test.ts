import { describe, expect, it, vi } from 'vitest';
import {
  formatZonedDateTimeLocal,
  parseZonedDateTimeLocal,
  asArray,
  DISPLAY_TIME_ZONE,
  formatDateInput,
  formatDateTime,
  formatZonedDateTimeInput,
  parseDateInput,
  parseZonedDateTimeInput,
} from './utils';

describe('asArray', () => {
  it('preserves valid collections', () => {
    expect(asArray<string>(['one', 'two'])).toEqual(['one', 'two']);
  });

  it('turns stale object responses into a safe empty collection', () => {
    expect(asArray({ error: 'legacy response' })).toEqual([]);
  });

  it('turns nullish and scalar values into a safe empty collection', () => {
    expect(asArray(null)).toEqual([]);
    expect(asArray('unexpected')).toEqual([]);
  });
});

describe('formatDateTime', () => {
  it('uses the saved clock preference consistently and allows explicit overrides', () => {
    vi.stubGlobal('localStorage', {getItem: () => '12h'});
    try {
      expect(formatDateTime('2026-09-09 18:00:00')).toContain('08:00 pm');
      expect(formatDateTime('2026-09-09T18:00:00Z')).toBe(formatDateTime('2026-09-09 18:00:00'));
      expect(formatDateTime('2026-09-09T18:00:00Z', {hour12:false})).toContain('20:00');
    } finally { vi.unstubAllGlobals(); }
  });
  it('keeps a 24-hour default when clock preferences cannot be read', () => {
    vi.stubGlobal('localStorage', {getItem: () => {throw new Error('Storage unavailable');}});
    try { expect(formatDateTime('2026-09-09T18:00:00Z')).toContain('20:00'); }
    finally { vi.unstubAllGlobals(); }
  });

  it('uses the shared Europe/Zurich display timezone', () => {
    expect(DISPLAY_TIME_ZONE).toBe('Europe/Zurich');
    const formatted = formatDateTime('2026-01-15T12:30:00.000Z');
    expect(formatted).toContain('15 Jan 2026');
    expect(formatted).toContain('13:30');
  });

  it('renders maintenance timestamps unambiguously with a 24-hour clock', () => {
    const formatted = formatDateTime('2026-09-02T17:30:00.000Z');
    expect(formatted).toMatch(/^2 Sept? 2026, 19:30 \(Europe\/Zurich\)$/);
    expect(formatted).not.toMatch(/AM|PM/i);
  });

  it('normalizes SQLite UTC timestamps without changing explicit offsets', () => {
    const expected = formatDateTime('2026-09-09T01:00:00Z');
    expect(formatDateTime('2026-09-09 01:00:00')).toBe(expected);
    expect(formatDateTime('2026-09-09T01:00:00')).toBe(expected);
    expect(formatDateTime('2026-09-09T03:00:00+02:00')).toBe(expected);
    expect(expected).toContain('03:00 (Europe/Zurich)');
    expect(formatDateTime('2026-01-09 01:00:00')).toContain('02:00');
  });

  it('returns a dash for missing or invalid values', () => {
    expect(formatDateTime()).toBe('—');
    expect(formatDateTime('not-a-date')).toBe('—');
  });
});

describe('deterministic date inputs', () => {
  it('round-trips en-GB calendar dates', () => {
    expect(formatDateInput('2026-09-02')).toBe('02/09/2026');
    expect(parseDateInput('2/9/2026')).toBe('2026-09-02');
    expect(parseDateInput('31/02/2026')).toBeNull();
  });

  it('round-trips 24-hour wall times in the selected timezone', () => {
    const instant = parseZonedDateTimeInput('02/09/2026, 21:23', 'Europe/Zurich');
    expect(instant).toBe('2026-09-02T19:23:00.000Z');
    expect(formatZonedDateTimeInput(instant, 'Europe/Zurich')).toBe('02/09/2026, 21:23');
    expect(formatZonedDateTimeInput(instant, 'UTC')).toBe('02/09/2026, 19:23');
  });

  it('rejects ambiguous browser-style and nonexistent wall times', () => {
    expect(parseDateInput('09/02/2026, 07:30 PM')).toBeNull();
    expect(parseZonedDateTimeInput('29/03/2026, 02:30', 'Europe/Zurich')).toBeNull();
  });
});


describe('native maintenance date/time conversion', () => {
  it('interprets keyboard/picker input in the chosen zone, independently of browser timezone', () => {
    expect(parseZonedDateTimeLocal('2026-07-10T09:30', 'Europe/Zurich')).toBe('2026-07-10T07:30:00.000Z');
    expect(formatZonedDateTimeLocal('2026-07-10T07:30:00.000Z', 'Asia/Kathmandu')).toBe('2026-07-10T13:15');
    expect(parseZonedDateTimeLocal('2026-07-10T13:15', 'Asia/Kathmandu')).toBe('2026-07-10T07:30:00.000Z');
  });
  it('rejects impossible calendar dates and times skipped by daylight saving', () => {
    expect(parseZonedDateTimeLocal('2026-03-29T02:30', 'Europe/Zurich')).toBeNull();
    expect(parseZonedDateTimeLocal('2026-02-30T10:00', 'UTC')).toBeNull();
    expect(parseZonedDateTimeLocal('2026-07-10T25:00', 'UTC')).toBeNull();
  });
});
