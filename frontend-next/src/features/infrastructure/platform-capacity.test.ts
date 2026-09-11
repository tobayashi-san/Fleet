import { describe, expect, it } from 'vitest';
import { platformCapacity } from './platform-capacity';

describe('platform capacity completeness', () => {
  it('preserves genuine zero usage and fractional CPU cores', () => {
    expect(platformCapacity([{ cpu: 0.125, maxcpu: 4, mem: 0, maxmem: 100 }])).toEqual({ cpuUsed: 0.5, cpuTotal: 4, memUsed: 0, memTotal: 100 });
  });
  it('does not display incomplete usage as zero or a partial fleet total', () => {
    const result = platformCapacity([{ cpu: 0.5, maxcpu: 4, mem: 50, maxmem: 100 }, { cpu: null, maxcpu: 8, mem: 0, maxmem: 100 }]);
    expect(result.cpuUsed).toBeNaN();
    expect(result.cpuTotal).toBeNaN();
    expect(result.memUsed).toBe(50);
    expect(result.memTotal).toBe(200);
  });
  it('rejects absent, negative and nonfinite capacity instead of reporting idle', () => {
    for (const nodes of [[], [{ cpu: 0, maxcpu: 0 }], [{ cpu: -1, maxcpu: 4 }], [{ cpu: Infinity, maxcpu: 4 }]]) {
      expect(platformCapacity(nodes).cpuUsed).toBeNaN();
      expect(platformCapacity(nodes).memUsed).toBeNaN();
    }
  });
});
