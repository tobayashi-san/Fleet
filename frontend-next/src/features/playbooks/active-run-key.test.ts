import {expect,it} from 'vitest';
import {activeRunKey} from './active-run-key';
it('isolates active run markers by immutable account and environment without separator collisions',()=>{
 expect(activeRunKey('alice','production')).not.toBe(activeRunKey('bob','production'));
 expect(activeRunKey('alice','production')).not.toBe(activeRunKey('alice','staging'));
 expect(activeRunKey('a:b','c')).not.toBe(activeRunKey('a','b:c'));
 expect(activeRunKey(42,'default')).toBe(activeRunKey('42','default'));
 expect(activeRunKey('alice','default')).not.toBe('fleet.active-playbook-run.default');
});
