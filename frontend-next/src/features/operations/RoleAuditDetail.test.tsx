import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {parseRoleChange,RoleAuditDetail,roleAuditValue} from './RoleAuditDetail';
describe('historical role audit',()=>{
 it('shows preserved names and before/after values without active role inventory',()=>{
  const change=parseRoleChange(JSON.stringify({kind:'role-change',version:1,resource:{id:'removed-role',name:'<Operators>'},changes:[{label:'Use Terminal',before:'Not allowed',after:'Allowed'}]}));
  expect(change).not.toBeNull();
  const html=renderToStaticMarkup(<RoleAuditDetail change={change!}/>);
  for(const text of ['&lt;Operators&gt;','removed-role','Before:','After:','Use Terminal','Not allowed']) expect(html).toContain(text);
 });
 it('leaves legacy or malformed records to the existing detail renderer',()=>{
  for(const input of ['Updated role: abc','{}','{"kind":"role-change","version":2}',JSON.stringify({kind:'role-change',version:1,resource:{id:'x',name:'X'},changes:[{label:'bad',before:{},after:'x'}]})]) expect(parseRoleChange(input)).toBeNull();
 });
});

it('renders known resource scopes as readable identifiers without losing unknown historical values',()=>{
 expect(roleAuditValue('Servers','all')).toBe('All hosts');
 expect(roleAuditValue('Servers',JSON.stringify({groups:['ops'],servers:['a,b','c']}))).toBe('Group IDs: "ops"; individual host IDs: "a,b", "c"');
 expect(roleAuditValue('Playbooks','[]')).toBe('None');
 expect(roleAuditValue('Plugins','["audit"]')).toBe('Selected plugins: "audit"');
 for(const value of ['Not present','{"future":true}','{"servers":false}','invalid']) expect(roleAuditValue('Servers',value)).toBe(value);
});
it('renders user security changes through the same historical detail view',()=>{
 const value=parseRoleChange(JSON.stringify({kind:'user-change',version:1,resource:{id:'deleted-user',name:'operator'},changes:[{label:'MFA',before:'Enabled',after:'Disabled'}]}));
 expect(value).not.toBeNull();
 const html=renderToStaticMarkup(<RoleAuditDetail change={value!}/>);
 for(const text of ['operator','MFA','Enabled','Disabled'])expect(html).toContain(text);
});

it('accepts maintenance history including explicit UTC dates and cancellation reasons',()=>{
 const value=parseRoleChange(JSON.stringify({kind:'maintenance-change',version:1,resource:{id:'deleted-window',name:'Platform maintenance'},changes:[{label:'End (UTC)',before:'2035-01-01T10:00:00Z',after:'2035-01-01T11:00:00Z'},{label:'Cancellation reason',before:'',after:'Dependency unavailable'}]}));
 expect(value).not.toBeNull();
 const html=renderToStaticMarkup(<RoleAuditDetail change={value!}/>);
 expect(html).toContain('Europe/Zurich');expect(html).toContain('title="2035-01-01T10:00:00Z"');expect(html).toContain('Dependency unavailable');expect(html).toContain('Platform maintenance');
});

it('uses the shared timezone with seconds for audit instants and preserves non-date evidence',()=>{
 expect(roleAuditValue('Start (UTC)','2026-01-15T10:00:01Z')).toContain('11:00:01 (Europe/Zurich)');
 expect(roleAuditValue('End (UTC)','2026-07-15T10:00:02Z')).toContain('12:00:02 (Europe/Zurich)');
 expect(roleAuditValue('Cancelled at (UTC)','Not cancelled')).toBe('Not cancelled');
 expect(roleAuditValue('Description','2026-01-15T10:00:00Z')).toBe('2026-01-15T10:00:00Z');
});
it('renders historical SSH fingerprints without requiring key material',()=>{
 const value=parseRoleChange(JSON.stringify({kind:'ssh-key-change',version:1,resource:{id:'new-key',name:'Central key'},changes:[{label:'Fingerprint',before:'SHA256:old',after:'SHA256:new'}]}));
 expect(value).not.toBeNull();
 const html=renderToStaticMarkup(<RoleAuditDetail change={value!}/>);
 expect(html).toContain('SHA256:old');expect(html).toContain('SHA256:new');
});

it('renders a host metadata diff with its preserved name and field values',()=>{
 const change=parseRoleChange(JSON.stringify({kind:'host-change',version:1,resource:{id:'host-1',name:'Database'},changes:[{label:'Name',before:'Old database',after:'Database'},{label:'Storage mounts',before:'[]',after:'[{"name":"Data","path":"/srv/data"}]'}]}));
 expect(change).not.toBeNull();
 const html=renderToStaticMarkup(<RoleAuditDetail change={change!}/>);
 for(const value of ['Database','Old database','Storage mounts','/srv/data','Before:','After:'])expect(html).toContain(value);
});
it('formats host collections without discarding unrecognized historical values',()=>{
 expect(roleAuditValue('Links','[]')).toBe('None');
 expect(roleAuditValue('Links','[{"name":"Runbook","url":"https://docs.example.test/host"}]')).toBe('Runbook: https://docs.example.test/host');
 expect(roleAuditValue('Storage mounts','[{"name":"Data","path":"/srv/data"}]')).toBe('Data: /srv/data');
 expect(roleAuditValue('Tags','["production","database"]')).toBe('production, database');
 expect(roleAuditValue('Links','[{"unknown":42}]')).toBe('[{"unknown":42}]');
});
