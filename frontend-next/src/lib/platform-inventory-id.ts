/** Match the backend inventory cluster key: URL origin plus path without trailing slashes. */
export function platformInventoryId(endpoint?: string | null): string | null {
  try {
    if (!endpoint) return null;
    const url = new URL(endpoint);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.origin + url.pathname.replace(/\/+$/, '');
  } catch { return null; }
}
