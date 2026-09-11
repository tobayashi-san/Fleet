import { describe, expect, it } from 'vitest';
import { summarizeUpdates } from './update-summary';

describe('host update summary', () => {
  it('keeps image updates visible when the OS catalog is empty', () => {
    expect(summarizeUpdates({ offline: false, osCount: 0, reasons: [{ code: 'image_updates', count: 2 }] }))
      .toEqual({ label: '2 image updates', tone: 'warning' });
  });
  it('combines catalogs without double counting the OS attention signal', () => {
    expect(summarizeUpdates({ offline: false, osCount: 3, reasons: [{ code: 'os_updates', count: 3 }, { code: 'custom_updates', count: 1 }] }).label)
      .toBe('3 OS · 1 custom updates');
  });
  it('never marks unavailable data healthy', () => {
    expect(summarizeUpdates({ offline: false, osCount: null }).tone).toBe('info');
    expect(summarizeUpdates({ offline: true, osCount: 0 }).tone).toBe('info');
  });
  it('retains required reboot after packages have been updated', () => {
    expect(summarizeUpdates({ offline: false, osCount: 0, reasons: [{ code: 'reboot_required', count: 1 }] }).label).toBe('Reboot required');
  });
});

it('does not present a stale empty catalog as healthy', () => {
  expect(summarizeUpdates({ offline: false, osCount: 0, stale: true })).toEqual({ label: 'OS catalog stale · refresh', tone: 'warning' });
});

it('does not display a healthy update summary after a custom check failure', () => {
 expect(summarizeUpdates({offline:false,osCount:0,reasons:[{code:'custom_check_failed',count:1}]})).toEqual({label:'Custom update check failed',tone:'warning'});
});


it('keeps known catalog counts visible alongside reboot and failed checks', () => {
  expect(summarizeUpdates({offline:false,osCount:3,reasons:[
    {code:'image_updates',count:2},{code:'custom_updates',count:1},
    {code:'reboot_required',count:1},{code:'custom_check_failed',count:1},
  ]})).toEqual({label:'3 OS · 2 image · 1 custom updates · Reboot required · Custom update check failed',tone:'warning'});
});


it('retains catalog staleness alongside known updates and reboot requirements', () => {
  expect(summarizeUpdates({offline:false,osCount:2,stale:true,reasons:[{code:'reboot_required',count:1}]}))
    .toEqual({label:'2 OS updates · OS catalog stale · refresh · Reboot required',tone:'warning'});
});


it('explains discrepancies between the OS catalog and inventory attention count', () => {
  expect(summarizeUpdates({offline:false,osCount:2,reasons:[{code:'os_updates',count:5}]}))
    .toEqual({label:'5 OS updates · OS counts differ: catalog 2, inventory 5; refresh both sources',tone:'warning'});
});

it('does not mark stale image or custom results healthy and preserves known counts', () => {
 for (const field of ['imageStale','customStale'] as const) {
  const summary = summarizeUpdates({offline:false,osCount:0,[field]:true,reasons:[{code:'image_updates',count:2}]});
  expect(summary.tone).toBe('warning');
  expect(summary.label).toContain('2 image updates');
  expect(summary.label).toContain('missing or stale');
  expect(summarizeUpdates({offline:false,osCount:0,[field]:true}).tone).toBe('warning');
 }
});


it('keeps locally observed image updates visible before inventory catches up', () => {
  expect(summarizeUpdates({ offline: false, osCount: 0, imageCount: 2 }))
    .toEqual({ label: '2 image updates', tone: 'warning' });
  expect(summarizeUpdates({ offline: false, osCount: 0, imageCount: 2, reasons: [{ code: 'image_updates', count: 1 }] }))
    .toEqual({ label: '2 image updates · Image counts differ: catalog 2, inventory 1; refresh both sources', tone: 'warning' });
});


it('retains direct custom updates and failures before inventory attention is refreshed', () => {
  expect(summarizeUpdates({ offline: false, osCount: 0, customCount: 1, customFailed: true }))
    .toEqual({ label: '1 custom updates · Custom update check failed', tone: 'warning' });
  expect(summarizeUpdates({ offline: false, osCount: 0, customFailed: true }).tone).toBe('warning');
});

it('explains custom catalog and inventory disagreement', () => {
 expect(summarizeUpdates({offline:false,osCount:0,customCount:1,reasons:[{code:'custom_updates',count:2}]}).label)
  .toBe('2 custom updates · Custom counts differ: catalog 1, inventory 2; refresh both sources');
});
