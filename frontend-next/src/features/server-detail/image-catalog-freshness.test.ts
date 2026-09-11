import { expect, it } from 'vitest';
import { imageCatalogFreshness } from './image-catalog-freshness';
it('requires both a valid collection time and explicit freshness for current image results', () => {
  for (const catalog of [undefined, null, { stale: false }, { stale: false, updated_at: '' }, { stale: false, updated_at: 'invalid' }]) {
    expect(imageCatalogFreshness(catalog)).toEqual({ hasCollectionTime: false, fresh: false });
  }
  expect(imageCatalogFreshness({ stale: false, updated_at: '2026-09-11 08:00:00' })).toEqual({ hasCollectionTime: true, fresh: true });
  expect(imageCatalogFreshness({ stale: true, updated_at: '2026-09-11T08:00:00Z' })).toEqual({ hasCollectionTime: true, fresh: false });
  expect(imageCatalogFreshness({ updated_at: '2026-09-11T08:00:00Z' }).fresh).toBe(false);
});
