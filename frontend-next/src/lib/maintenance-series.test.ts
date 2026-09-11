import {expect,it} from 'vitest';
import {upcomingSeriesIds} from './maintenance-series';
it('selects only future occurrences of the exact series and environment',()=>{
 const target={id:'target',environment_id:'prod',series_id:'series',starts_at:'2030-01-01T10:00:00Z'};
 const rows=[target,{...target,id:'past',starts_at:'2029-01-01T00:00:00Z'},{...target,id:'active',starts_at:'2030-01-01T00:00:00Z'},{...target,id:'other-series',series_id:'other'},{...target,id:'other-env',environment_id:'test'},{...target,id:'next',starts_at:'2030-01-08T00:00:00Z'}];
 expect(upcomingSeriesIds(rows,target,Date.parse('2030-01-01T00:00:00Z'))).toEqual(['target','next']);
 expect(upcomingSeriesIds(rows,{...target,series_id:null})).toEqual([]);
});
it('excludes cancelled future occurrences',()=>{
 const target={id:'one',environment_id:'prod',series_id:'series',starts_at:'2099-01-01T00:00:00Z'};
 expect(upcomingSeriesIds([target,{...target,id:'cancelled',cancelled_at:'2026-01-01T00:00:00Z'}],target)).toEqual(['one']);
});
