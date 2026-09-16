import { expect, it } from 'vitest';
import { filterExecutionLog } from './execution-log';
it('keeps multiline failure context for the chosen host and excludes peers', () => {
 const log='TASK [Install]\nfatal: [edge]: FAILED! => {\n  "msg": "package locked"\n}\nok: [media] => {\n  "changed": false\n}\nPLAY RECAP ***\nedge : ok=0 changed=0 unreachable=0 failed=1';
 const filtered=filterExecutionLog(log,'locked','edge');
 expect(filtered).toContain('TASK [Install]'); expect(filtered).toContain('package locked');expect(filtered).not.toContain('[media]');
});
it('retains plain logs with no filters and returns an empty unmatched result',()=>{
 expect(filterExecutionLog('one\ntwo','','')).toBe('one\ntwo');
 expect(filterExecutionLog('one\ntwo','missing','')).toBe('');
});
