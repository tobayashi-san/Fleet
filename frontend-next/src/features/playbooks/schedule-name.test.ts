import {expect,it} from 'vitest';
import {scheduleNameMismatch} from './schedule-name';
it('flags explicit weekly/daily contradictions while preserving custom labels',()=>{
 expect(scheduleNameMismatch('Weekly Updates','0 3 * * *')).toContain('every day');
 expect(scheduleNameMismatch('Daily Updates','0 3 * * 1')).toContain('once a week');
 expect(scheduleNameMismatch('Weekly Updates','0 3 * * 1')).toBeNull();
 expect(scheduleNameMismatch('Business days','0 3 * * 1-5')).toBeNull();
});
