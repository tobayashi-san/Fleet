import { parseApiDate } from '@/lib/utils';

export function imageCatalogFreshness(catalog: { updated_at?: string | null; stale?: boolean } | null | undefined) {
  const collectedAt = catalog?.updated_at;
  const hasCollectionTime = typeof collectedAt === "string" && collectedAt.length > 0 && Number.isFinite(parseApiDate(collectedAt)?.getTime());
  return { hasCollectionTime, fresh: hasCollectionTime && catalog?.stale === false };
}
