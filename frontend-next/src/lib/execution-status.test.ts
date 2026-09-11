import {expect,it} from 'vitest';
import {completionStatus} from './execution-status';
it('preserves cancellation even when legacy success is false',()=>{
 expect(completionStatus({status:'cancelled',success:false})).toBe('cancelled');
 expect(completionStatus({status:'canceled',success:true})).toBe('cancelled');
});
it('does not classify unknown or missing completion states as failure or success',()=>{
 expect(completionStatus({status:'paused',success:true})).toBe('unknown');
 expect(completionStatus({})).toBe('unknown');
 expect(completionStatus({success:false})).toBe('failed');
 expect(completionStatus({status:'completed',success:false})).toBe('success');
});
