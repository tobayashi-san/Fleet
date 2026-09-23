const {test}=require('node:test');const assert=require('node:assert/strict');
const {terminalLimits,createTerminalTimers}=require('../utils/terminal-limits');
test('limits use defaults, allow explicit disabling and reject invalid values',()=>{
 assert.deepEqual(terminalLimits({}),{idleSeconds:1800,maxSeconds:28800});
 assert.deepEqual(terminalLimits({FLEET_TERMINAL_IDLE_MINUTES:'0',FLEET_TERMINAL_MAX_MINUTES:'10'}),{idleSeconds:0,maxSeconds:600});
 assert.deepEqual(terminalLimits({FLEET_TERMINAL_IDLE_MINUTES:'-1',FLEET_TERMINAL_MAX_MINUTES:'NaN'}),{idleSeconds:1800,maxSeconds:28800});
});
test('input resets idle only, expiry fires once and all timers are cleaned up',()=>{
 let next=0;const pending=new Map();const expired=[];const timers={set:(fn,ms)=>{pending.set(++next,{fn,ms});return next;},clear:id=>pending.delete(id)};
 const session=createTerminalTimers({idleSeconds:10,maxSeconds:60},reason=>expired.push(reason),timers);
 assert.deepEqual([...pending.values()].map(v=>v.ms),[10000,60000]);
 session.touch();assert.deepEqual([...pending.values()].map(v=>v.ms),[60000,10000]);
 const maximum=[...pending.values()][0];maximum.fn();maximum.fn();session.touch();
 assert.deepEqual(expired,['duration_limit']);assert.equal(pending.size,0);
 const idle=createTerminalTimers({idleSeconds:1,maxSeconds:0},reason=>expired.push(reason),timers);
 [...pending.values()][0].fn();assert.deepEqual(expired,['duration_limit','idle_timeout']);idle.stop();assert.equal(pending.size,0);
});
