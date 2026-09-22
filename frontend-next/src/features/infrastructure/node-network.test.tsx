import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import {NodeConfiguration} from './DetailPanels';
it('distinguishes an empty network inventory from one that could not be read',()=>{
 const base={name:'pve001',status:'online',cpu:0,maxcpu:4,mem:0,maxmem:100,uptime:100,bridges:[],network_checked_at:'2026-09-10T00:00:00Z'};
 const render=(status:'available'|'unavailable')=>renderToStaticMarkup(<NodeConfiguration node={{...base,network_status:status}} vms={[]}/>);
 expect(render('available')).toContain('No configured Proxmox bridges reported');
 const failed=render('unavailable');
 expect(failed).toContain('Bridge inventory could not be verified');
 expect(failed).toContain('API network permissions');
 expect(failed).toMatch(/Last attempt \d+ Sept? 2026, \d\d:\d\d/);
 expect(failed).not.toContain('No configured Proxmox bridges reported');
});

it('renders unknown bridge status and absent prefixes without inventing inactive or undefined values',()=>{
 const node={name:'pve001',status:'online',cpu:0,maxcpu:4,mem:0,maxmem:100,uptime:100,network_status:'available' as const,bridges:[{name:'vmbr0',address:'10.0.0.1'},{name:'vmbr1',address:'10.0.0.2',cidr:0,active:false}]};
 const html=renderToStaticMarkup(<NodeConfiguration node={node} vms={[]}/>);
 expect(html).toContain('Not reported');
 expect(html).toContain('Inactive');
 expect(html).toContain('10.0.0.2/0');
 expect(html).not.toContain('10.0.0.1/undefined');
 expect(html).not.toContain('10.0.0.1/0');
});

it('shows IPv6 addresses and gateways in both desktop and mobile rows',()=>{
 const node={name:'pve001',status:'online',cpu:0,maxcpu:4,mem:0,maxmem:100,uptime:100,bridges:[{name:'vmbr0',address6:'2001:db8::10',cidr6:64,gateway6:'2001:db8::1'}]};
 const html=renderToStaticMarkup(<NodeConfiguration node={node} vms={[]}/>);
 expect(html.match(/2001:db8::10\/64/g)).toHaveLength(2);
 expect(html.match(/2001:db8::1</g)).toHaveLength(2);
});
