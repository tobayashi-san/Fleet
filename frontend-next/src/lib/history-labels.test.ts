import { it, expect } from 'vitest';
import i18n from './i18n';
import { actionLabel } from './history-labels';
it('preserves resource identifiers while making unknown actions readable',()=>{
 const t=i18n.getFixedT('en');
 expect(actionLabel(t,'verify_network.routes')).toBe('Verify network routes');
 expect(actionLabel(t,'compose_pull_media_stack')).toBe('Pull container images · media_stack');
 expect(actionLabel(t,'maintenance/update_hosts.yml')).toContain('maintenance/update_hosts.yml');
 expect(actionLabel(t,'maintenance/update_hosts.yml')).not.toBe('maintenance/update_hosts.yml');
});
