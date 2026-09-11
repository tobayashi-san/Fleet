export type CompletionStatus = 'success' | 'failed' | 'cancelled' | 'unknown';

/** Explicit backend status wins over the legacy success boolean. */
export function completionStatus(event: {status?: unknown; success?: unknown}): CompletionStatus {
  if (typeof event.status === 'string' && event.status) {
    if (['success','successful','completed'].includes(event.status)) return 'success';
    if (['failed','error'].includes(event.status)) return 'failed';
    if (['cancelled','canceled'].includes(event.status)) return 'cancelled';
    return 'unknown';
  }
  return event.success === true ? 'success' : event.success === false ? 'failed' : 'unknown';
}
