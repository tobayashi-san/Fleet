import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {compareRoleAccess,RoleAccessChanges,RoleAccessSummary,matchesRolePreset,editableCapabilities} from './role-access-changes';
describe('effective role comparison',()=>{
 it('reports changed selections even when their counts match',()=>{
  const changes=compareRoleAccess({servers:{groups:['group-a'],servers:['host-a']},playbooks:['a.yml']},{servers:{groups:['group-b'],servers:['host-b']},playbooks:['b.yml']},[]);
  expect(changes).toHaveLength(2);expect(changes[0].before).toContain('host-a');expect(changes[0].after).toContain('host-b');
 });
 it('ignores ordering, duplicate ids and numeric/string representation',()=>{
  expect(compareRoleAccess({servers:{groups:[1,'2',1]}},{servers:{groups:['2','1']}},[])).toEqual([]);
 });
 it('shows grant and revocation, and interprets full access rather than misleading stored false flags',()=>{
  const changes=compareRoleAccess({full:true,canUseTerminal:false},{servers:{},canViewServers:true},['canUseTerminal','canViewServers']);
  expect(changes).toContainEqual({label:'Use Terminal',before:'Allowed',after:'Not allowed'});
  expect(changes.some(c=>c.label==='View Servers')).toBe(false);
  expect(changes).toContainEqual({label:'Unrestricted administrator access',before:'Allowed',after:'Not allowed'});
  expect(compareRoleAccess({canUseTerminal:false},{canUseTerminal:true},[])).toContainEqual({label:'Use Terminal',before:'Not allowed',after:'Allowed'});
 });
 it('does not treat unknown permissions as an empty role',()=>{
  const html=renderToStaticMarkup(<RoleAccessChanges after={{}} capabilityKeys={[]}/>);
  expect(html).toContain('permission details are unavailable');expect(html).not.toContain('No effective access changes');
 });
});


it('editing migrated roles preserves explicit denial instead of applying the legacy umbrella again',()=>{
 const effective={canManageDeployments:true,canViewDeployments:true,canApplyDeployments:false};
 const draft=editableCapabilities(effective,['canViewDeployments','canApplyDeployments']);
 expect(draft).toEqual({canViewDeployments:true,canApplyDeployments:false});
 expect(compareRoleAccess(effective,draft,['canViewDeployments','canApplyDeployments'])).toEqual([]);
});

it('resolves resource names without hiding changes between identically named resources',()=>{
 const labels={servers:{'1':'Production','2':'Production'},groups:{g:'Operations'},plugins:{p:'Inventory'},playbooks:{'a.yml':'Deploy'}};
 const changes=compareRoleAccess({servers:{servers:['1']}},{servers:{servers:['2'],groups:['g']},plugins:['p'],playbooks:['a.yml']},[],labels);
 expect(changes).toHaveLength(3);
 expect(changes[0].before).toContain('"Production" (ID: "1")');
 expect(changes[0].after).toContain('"Production" (ID: "2")');
 expect(changes[0].after).toContain('"Operations"');
 expect(changes[1].after).toContain('"Deploy"');
 expect(changes[2].after).toContain('"Inventory"');
});
it('keeps unresolved selections visible and escapes resource labels when rendered',()=>{
 const html=renderToStaticMarkup(<RoleAccessChanges before={{}} after={{servers:{servers:['missing','known']}}} capabilityKeys={[]} labels={{servers:{known:'<script>unsafe</script>'}}}/>);
 expect(html).toContain('missing');
 expect(html).toContain('name unavailable');
 expect(html).toContain('&lt;script&gt;unsafe&lt;/script&gt;');
 expect(html).not.toContain('<script>');
});


it('summarizes specific resources before account creation instead of only selection counts',()=>{
 const html=renderToStaticMarkup(<RoleAccessSummary permissions={{servers:{groups:['ops'],servers:['db']},playbooks:['inspect.yml'],plugins:['audit'],canUseTerminal:true,canRunUpdates:false}} labels={{groups:{ops:'Operations'},servers:{db:'Database host'},plugins:{audit:'Audit viewer'}}} sensitiveCapabilityKeys={['canUseTerminal','canRunUpdates']}/>);
 for (const text of ['Operations','Database host','inspect.yml','Audit viewer','Use Terminal','includes descendants']) expect(html).toContain(text);
 expect(html).not.toContain('Run Updates');
});
it('does not describe missing permission details as no access',()=>{
 const html=renderToStaticMarkup(<RoleAccessSummary sensitiveCapabilityKeys={[]}/>);
 expect(html).toContain('Permission details unavailable');
 expect(html).not.toContain('None');
});
it('shows unrestricted administrative access despite restrictive stored scopes',()=>{
 const html=renderToStaticMarkup(<RoleAccessSummary permissions={{full:true,servers:{},plugins:[]}} sensitiveCapabilityKeys={[]}/>);
 expect(html).toContain('Unrestricted access');
 expect(html).toContain('user management and system settings');
 expect(html).not.toContain('None');
});


it('offers preset matches by actual capability grants, never by a role name or resource breadth',()=>{
 expect(matchesRolePreset({servers:{servers:['one']},canViewServers:true,canUseTerminal:false},['canViewServers'])).toBe(true);
 expect(matchesRolePreset({servers:'all',canViewServers:true,canUseTerminal:true},['canViewServers'])).toBe(false);
 expect(matchesRolePreset({canViewServers:true,canFuturePrivilege:true},['canViewServers'])).toBe(false);
 expect(matchesRolePreset({full:true,canViewServers:true},['canViewServers'])).toBe(false);
 expect(matchesRolePreset(undefined,['canViewServers'])).toBe(false);
 expect(matchesRolePreset({canManageDeployments:true,canViewServers:true},['canViewServers'])).toBe(true);
});
