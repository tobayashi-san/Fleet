import { expect, it } from 'vitest';
import { verifiedOsCheck } from './os-check-result';
const fresh = { updates: [], updated_at: '2026-09-11 08:00:00', stale: false, cached: false };
it('accepts an explicitly fresh empty catalog as a valid zero-update result', () => {
 expect(verifiedOsCheck(fresh)).toBe(fresh);
});
it('rejects missing freshness evidence instead of reporting zero updates', () => {
 for (const result of [{...fresh, stale:true},{...fresh,cached:true},{...fresh,updated_at:null},{...fresh,updated_at:'invalid'},{...fresh,updates:null},{...fresh,updates:[null]},{}]) expect(()=>verifiedOsCheck(result as typeof fresh)).toThrow('no verified fresh catalog');
});
