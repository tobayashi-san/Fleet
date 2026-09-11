import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import {RecentObjectTasks,ObjectTasksCard} from './DetailPanels';
it.each([RecentObjectTasks,ObjectTasksCard])('does not show accepted catalog refreshes or unknown outcomes as completed',Component=>{
 const render=(success?:0|1)=>renderToStaticMarkup(<Component tasks={[{action:'infrastructure.proxmox_update_catalog',success}]}/>);
 expect(render(1)).toContain('Proxmox package catalog refresh requested');
 expect(render(1)).toContain('Request accepted');
 expect(render(1)).not.toContain('Successful');
 expect(render()).toContain('Unknown');
 expect(render(0)).toContain('Request failed');
});
