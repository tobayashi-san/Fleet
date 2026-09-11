const {test}=require('node:test');const assert=require('node:assert/strict');
const {createTerminalAudit}=require('../utils/terminal-audit');
test('terminal lifecycle records metadata once and preserves resource names and elapsed time',()=>{
 const events=[];let now=1000;const server={id:'host-1',name:'Original host',ssh_user:'operator',environment_id:'prod'};
 const audit=createTerminalAudit({write:(...args)=>events.push(args),server,username:'alice',ip:'192.0.2.5',now:()=>now});
 audit.ready();audit.ready();server.name='Renamed';now=5500;audit.finish('browser_closed');audit.finish('shell_closed');audit.ready();
 assert.equal(events.length,2);assert.equal(events[0][0],'terminal.connect');assert.equal(events[1][0],'terminal.disconnect');
 assert.match(events[1][1],/duration_ms=4500/);assert.match(events[1][1],/server="Original host"/);assert.match(events[0][1],new RegExp(audit.sessionId));assert.equal(events[1][4],'alice');
});
test('failed sessions have zero connected duration and raw error text is never persisted',()=>{
 const events=[];const audit=createTerminalAudit({write:(...args)=>events.push(args),server:{id:'h',name:'host'},username:'alice'});
 audit.finish('secret command output');audit.finish('missing_key');
 assert.equal(events.length,1);assert.equal(events[0][0],'terminal.connect_failed');assert.equal(events[0][3],false);
 assert.match(events[0][1],/duration_ms=0/);assert.doesNotMatch(events[0][1],/secret command output/);
});
