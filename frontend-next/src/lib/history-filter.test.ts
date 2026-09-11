import { expect, it } from 'vitest';
import { matchesHistory } from './history-filter';
const empty={query:'',status:'',from:'',to:''};
it('filters the displayed Zurich calendar day rather than the UTC date',()=>{
  expect(matchesHistory({started_at:'2026-09-08 23:30:00'},'',{...empty,from:'2026-09-09',to:'2026-09-09'})).toBe(true);
  expect(matchesHistory({started_at:'2026-09-09T22:30:00Z'},'',{...empty,from:'2026-09-09',to:'2026-09-09'})).toBe(false);
  expect(matchesHistory({started_at:'2026-01-01T23:30:00Z'},'',{...empty,from:'2026-01-02'})).toBe(true);
});
it('combines text and status filters and excludes unknown dates only for date filtering',()=>{
  expect(matchesHistory({status:'failed'},'System update Alice',{...empty,query:'ALICE',status:'failed'})).toBe(true);
  expect(matchesHistory({status:'success'},'Alice',{...empty,status:'failed'})).toBe(false);
  expect(matchesHistory({},'',empty)).toBe(true);
  expect(matchesHistory({},'',{...empty,from:'2026-01-01'})).toBe(false);
});

it('filters exact action types independently of matching log text',()=>{
 expect(matchesHistory({action:'reboot'},'system_update mentioned in log',{...empty,action:'system_update'})).toBe(false);
 expect(matchesHistory({action:'system_update',status:'failed'},'Alice',{...empty,action:'system_update',status:'failed',query:'Alice'})).toBe(true);
});
