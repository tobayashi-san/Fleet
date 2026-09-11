import { expect, it } from 'vitest';
import { overlappingWindows } from './maintenance-overlap';
const candidate = { id: 'current', starts_at: '2026-09-10T10:00:00Z', ends_at: '2026-09-10T11:00:00Z', resource_ids: ['host-a'] };
it('finds overlapping shared hosts and environment-wide work but excludes itself and other hosts', () => {
  const windows = [candidate, { ...candidate, id: 'same-host' }, { ...candidate, id: 'other-host', resource_ids: ['host-b'] }, { ...candidate, id: 'whole-environment', resource_ids: [] }];
  expect(overlappingWindows(candidate, windows).map(row => row.id)).toEqual(['same-host', 'whole-environment']);
});
it('does not flag adjacent windows or invalid ranges', () => {
  expect(overlappingWindows(candidate, [{ ...candidate, id: 'adjacent', starts_at: candidate.ends_at, ends_at: '2026-09-10T12:00:00Z' }])).toEqual([]);
  expect(overlappingWindows({ ...candidate, ends_at: 'invalid' }, [{ ...candidate, id: 'other' }])).toEqual([]);
});

it('does not flag cancelled windows as conflicts',()=>{
 const range={starts_at:'2030-01-01T10:00:00Z',ends_at:'2030-01-01T11:00:00Z'};
 expect(overlappingWindows(range,[{...range,id:'cancelled',cancelled_at:'2029-12-01T00:00:00Z'}])).toEqual([]);
});
