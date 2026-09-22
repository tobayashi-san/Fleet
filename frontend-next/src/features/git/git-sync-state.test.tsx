import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { GitSyncState } from './GitSyncState';
it('distinguishes cached branch divergence from the current remote state', () => {
  const html = renderToStaticMarkup(<GitSyncState comparison={{state:'diverged',ahead:2,behind:3}} lastFetchAt="2026-09-10T05:00:00Z"/>);
  expect(html).toContain('Branches have diverged');
  expect(html).toContain('2 local-only commits');
  expect(html).toContain('3 remote-only commits');
  expect(html).toMatch(/Sept? 2026, \d\d:\d\d/);
  expect(html).toContain('does not verify the current remote state');
});
it('does not invent zero counts when a comparison is unavailable and identifies conflict files', () => {
  const html = renderToStaticMarkup(<GitSyncState conflicts={['playbooks/example.yml']}/>);
  expect(html).toContain('Remote comparison unavailable');
  expect(html).toContain('Not recorded');
  expect(html).not.toContain('0 local-only');
  expect(html).toContain('role="alert"');
  expect(html).toContain('playbooks/example.yml');
  expect(html).toContain('Resolve or abort');
});
