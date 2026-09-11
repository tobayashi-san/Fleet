import { expect, it } from 'vitest';
import { guestMetricPercent, guestMetricExplanation } from './guest-metrics';
it('preserves measured zero and fractional CPU usage', () => {
 expect(guestMetricPercent(0, 100)).toBe('0%');
 expect(guestMetricPercent(0.125, 1, true)).toBe('12.5%');
});
it('rejects missing, negative, nonfinite and inconsistent measurements', () => {
 for (const used of [null, undefined, NaN, Infinity, -1, 101, '0']) expect(guestMetricPercent(used, 100)).toBeNull();
 for (const total of [null, undefined, NaN, Infinity, 0, -1]) expect(guestMetricPercent(0, total)).toBeNull();
});
it('distinguishes stopped guests from missing live measurements', () => {
 expect(guestMetricExplanation('stopped')).toContain('Guest is stopped');
 expect(guestMetricExplanation('running')).toContain('Refresh the inventory');
 expect(guestMetricExplanation('running')).not.toContain('Guest is stopped');
});
