import {describe,it,expect} from 'vitest';
import {maintenanceAtStart, type ScheduleMaintenanceWindow} from './schedule-maintenance';
const run='2026-09-10T12:00:00Z';
const hosts=[{id:'a',name:'host-a'},{id:'b',name:'host-b'}];
const window: ScheduleMaintenanceWindow={id:'w',name:'Change 123',environment_id:'default',starts_at:run,ends_at:'2026-09-10T13:00:00Z',resource_ids:['a']};
describe('schedule maintenance coverage',()=>{
 it('matches immutable host IDs, reports partial coverage and unresolved local/missing targets',()=>{
  const result=maintenanceAtStart(run,['host-a','host-b','localhost','removed','host-a'],hosts,[window],'default');
  expect(result.covered).toBe(1);expect(result.uncovered).toEqual(['host-b']);expect(result.total).toBe(4);expect(result.unresolved).toEqual(['localhost','removed']);expect(result.windows).toEqual([window]);
 });
 it('includes start, excludes end, cancellation and other environments',()=>{
  expect(maintenanceAtStart(window.ends_at,['host-a'],hosts,[window],'default').covered).toBe(0);
  expect(maintenanceAtStart('2026-09-10T11:59:59Z',['host-a'],hosts,[window],'default').covered).toBe(0);
  expect(maintenanceAtStart(run,['host-a'],hosts,[{...window,cancelled_at:run},{...window,environment_id:'other'}],'default').covered).toBe(0);
 });
 it('unions multiple windows without double-counting and covers environment scope only for known hosts',()=>{
  const result=maintenanceAtStart(run,['host-a','host-b'],hosts,[window,{...window,id:'w2',resource_ids:['a','b']}],'default');
  expect(result.covered).toBe(2);expect(result.windows).toHaveLength(2);
  expect(maintenanceAtStart(run,['host-b','localhost'],hosts,[{...window,resource_ids:[]}],'default').covered).toBe(1);
 });
});

it('does not claim coverage for ambiguous names or hosts explicitly in another environment',()=>{
 const ambiguous=[...hosts,{id:'replacement',name:'host-a'}];
 const result=maintenanceAtStart(run,['host-a'],ambiguous,[{...window,resource_ids:[]}],'default');
 expect(result.covered).toBe(0);expect(result.unresolved).toEqual(['host-a']);expect(result.windows).toEqual([]);
 const foreign=maintenanceAtStart(run,['host-a'],[{id:'a',name:'host-a',environment_id:'other'}],[window],'default');
 expect(foreign.covered).toBe(0);expect(foreign.unresolved).toEqual(['host-a']);
});
