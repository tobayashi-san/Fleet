interface StartResult { runId?: string; historyId?: string }
interface StartState { pending: boolean; runId?: string; error?: string }
const states = new Map<string, StartState>();
const listeners = new Map<string, Set<() => void>>();
export const getRunStart = (key: string): StartState | undefined => states.get(key);
function notify(key: string) { listeners.get(key)?.forEach(listener => listener()); }
export function subscribeRunStart(key: string, listener: () => void) {
  const set = listeners.get(key) || new Set();
  set.add(listener); listeners.set(key, set);
  return () => { set.delete(listener); if (!set.size) listeners.delete(key); };
}
export function clearRunStart(key: string) { states.delete(key); notify(key); }

/** One start request per account/environment, surviving component unmounts. */
export async function trackRunStart<T extends StartResult>(key: string, start: () => Promise<T>): Promise<T> {
  if (states.get(key)?.pending) throw new Error('A playbook start is already in progress for this account and environment.');
  states.set(key, { pending: true }); notify(key);
  try {
    const result = await start();
    // A browser storage failure must not turn an accepted execution into a failed start.
    if (result.runId) {
      try { window.sessionStorage.setItem(key, result.runId); } catch { /* Keep the accepted ID in memory. */ }
    }
    states.set(key, { pending: false, runId: result.runId }); notify(key);
    return result;
  } catch (error) {
    states.set(key, { pending: false, error: error instanceof Error ? error.message : 'Run start request failed. Check history before retrying.' }); notify(key);
    throw error;
  }
}
