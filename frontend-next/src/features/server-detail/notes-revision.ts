/** Preserve the newest observed revision when mutation replies arrive out of order. */
export function newestNotesRevision<T extends { revision: number }>(current: T | undefined, incoming: T): T {
  return current && current.revision > incoming.revision ? current : incoming;
}
