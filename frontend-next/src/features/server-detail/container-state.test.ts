import { expect, it } from 'vitest';
import { containerStateTone } from './container-state';
it('distinguishes normal stopped states from explicit failure', () => {
 for (const status of ['Exited (0) 2 hours ago','Created','Up 1 hour (Paused)','']) expect(containerStateTone(status)).toBe('muted');
 for (const status of ['Exited (1) 2 hours ago','Dead']) expect(containerStateTone(status)).toBe('danger');
});
it('does not mark running but unhealthy or restarting containers as healthy', () => {
 expect(containerStateTone('Up 2 hours (unhealthy)')).toBe('warning');
 expect(containerStateTone('Restarting (1) 5 seconds ago')).toBe('warning');
 expect(containerStateTone('Up 2 hours (healthy)')).toBe('success');
 expect(containerStateTone(undefined,'running')).toBe('success');
});
