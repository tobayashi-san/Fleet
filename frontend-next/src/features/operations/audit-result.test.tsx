import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import {AuditTableRow,AuditMobileRow} from './AuditLogPanel';
it.each([AuditTableRow,AuditMobileRow])('renders acceptance and unknown audit results without claiming completion',Component=>{
 const render=(success?:boolean|0|1)=>renderToStaticMarkup(<Component row={{action:'infrastructure.snapshot_restore',success,detail:'snapshot=before-update'}}/>);
 expect(render(1)).toContain('Snapshot restoration requested');
 expect(render(1)).toContain('Request accepted');
 expect(render(1)).not.toContain('Successful');
 expect(render(0)).toContain('Request failed');
 expect(render()).toContain('Unknown');
 expect(render()).not.toContain('Request failed');
});
it.each([AuditTableRow,AuditMobileRow])('keeps every affected resource reachable',Component=>{
 const html=renderToStaticMarkup(<Component row={{action:'server.update',object_links:[
  {kind:'server',id:'a',label:'Primary host',href:'/servers/a'},
  {kind:'server',id:'b',label:'Secondary host',href:'/servers/b'},
  {kind:'deployment',id:'d',label:'Service definition',href:'/deployments/d'},
 ]}}/>);
 for(const label of ['Primary host','Secondary host','Service definition']) expect(html).toContain(label);
 for(const href of ['/servers/a','/servers/b','/deployments/d']) expect(html).toContain(`href="${href}"`);
});
