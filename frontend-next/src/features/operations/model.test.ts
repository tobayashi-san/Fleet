import { describe, expect, it } from 'vitest';
import { hostResultSummary, workflowFacts } from './model';

describe('execution summaries', () => {
  it('drops zero counts and uses singular forms', () => {
    expect(hostResultSummary([{ status: 'failed', changed: 0 }])).toBe('1 of 1 host failed');
    expect(hostResultSummary([{ status: 'success', changed: 2 }, { status: 'success', changed: 1 }])).toBe('2 hosts succeeded · 3 changed tasks');
    expect(hostResultSummary([{ status: 'success', changed: 0 }, { status: 'unknown', changed: null }])).toBe('1 host succeeded · 1 without a result');
    expect(hostResultSummary([{ status: 'unknown', changed: null }])).toBe('No result recorded for 1 host');
  });
  it('only repeats the playbook when the title does not already name it', () => {
    expect(workflowFacts({ name: 'install-docker.yml', playbook: 'install-docker.yml' })).toBe('');
    expect(workflowFacts({ name: 'update.yml (dry run)', playbook: 'update.yml', check_mode: true })).toBe('Dry run');
    expect(workflowFacts({ name: 'Weekly updates', playbook: 'update.yml', schedule_deleted: true })).toBe('Playbook update.yml · Schedule deleted');
  });
});
