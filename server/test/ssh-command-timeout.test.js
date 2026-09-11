const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execCommandWithTimeout } = require('../utils/ssh-command-timeout');

test('deadline terminates the individual channel and rejects a stalled command', async t => {
 t.mock.timers.enable({apis:['setTimeout']});
 const events=[];
 const ssh={execCommand:(_command,options)=>{options.onChannel({signal:s=>events.push(s),destroy:()=>events.push('destroy')});return new Promise(()=>{});}};
 const result=execCommandWithTimeout(ssh,'check',30000);
 const rejected=assert.rejects(result,{code:'SSH_CHECK_TIMEOUT'});
 t.mock.timers.tick(30000);
 await rejected;
 assert.deepEqual(events,['TERM','destroy']);
});
test('successful command clears its deadline without terminating its channel',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const events=[];
 const ssh={execCommand:async(_command,options)=>{options.onChannel({signal:s=>events.push(s),destroy:()=>events.push('destroy')});return {code:0,stdout:'1'};}};
 assert.deepEqual(await execCommandWithTimeout(ssh,'check',30000),{code:0,stdout:'1'});
 t.mock.timers.tick(30000);
 assert.deepEqual(events,[]);
});
test('a channel arriving after the deadline is also closed',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 let open;
 const events=[];
 const ssh={execCommand:(_command,options)=>{open=options.onChannel;return new Promise(()=>{});}};
 const result=execCommandWithTimeout(ssh,'check',30000);
 const rejected=assert.rejects(result,{code:'SSH_CHECK_TIMEOUT'});
 t.mock.timers.tick(30000);await rejected;
 open({signal:s=>events.push(s),destroy:()=>events.push('destroy')});
 await Promise.resolve();
 assert.deepEqual(events,['TERM','destroy']);
});

test('deadline wins even if channel destruction immediately resolves the SSH command',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 let finish;
 const ssh={execCommand:(_command,options)=>new Promise(resolve=>{finish=resolve;options.onChannel({signal:()=>{},destroy:()=>finish({code:0,stdout:'partial'})});})};
 const result=execCommandWithTimeout(ssh,'check',30000);
 const rejected=assert.rejects(result,{code:'SSH_CHECK_TIMEOUT'});
 t.mock.timers.tick(30000);await rejected;
});
