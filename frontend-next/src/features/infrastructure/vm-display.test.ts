import {expect,it} from 'vitest';
import {bootOrderLabel,guestOsLabel} from './vm-display';
it('explains common Proxmox codes while retaining unknown values',()=>{
 expect(guestOsLabel('l26')).toBe('Linux (kernel 2.6 or newer)');
 expect(guestOsLabel('future-os')).toBe('future-os');
 expect(bootOrderLabel('order=scsi0;net0')).toBe('SCSI disk 0 → Network adapter 0');
 expect(bootOrderLabel('cdn')).toBe('cdn');
});
