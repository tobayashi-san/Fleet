import { describe, expect, it } from 'vitest';
import i18n from './i18n';

describe('plural labels', () => {
  it('uses singular and plural forms instead of "(s)"', () => {
    expect(i18n.t('det.updatesAvail', { count: 1 })).toBe('1 update available');
    expect(i18n.t('det.updatesAvail', { count: 3 })).toBe('3 updates available');
    expect(i18n.t('det.phasedCount', { count: 1 })).toBe('1 package held back');
    expect(i18n.t('srv.playbookStarted', { playbook: 'update.yml', count: 2 })).toBe('Playbook update.yml started on 2 hosts');
  });
});
