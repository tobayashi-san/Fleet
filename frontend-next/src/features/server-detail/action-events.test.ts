import {expect,it} from 'vitest';
import {bindActionHistory,receiveActionEvent,type TrackedAction} from './action-events';
const pending=():TrackedAction=>({title:'Update A',status:'running',lines:[],serverId:'host-a',requestId:1});
it('ignores other hosts and does not display or complete an unbound run from another execution',()=>{
 const run=pending();expect(receiveActionEvent(run,{serverId:'host-b',historyId:'other',type:'update_complete',success:true})).toBe(run);
 const waiting=receiveActionEvent(run,{serverId:'host-a',historyId:'other',type:'update_complete',success:true});
 expect(waiting?.status).toBe('running');expect(waiting?.lines).toEqual([]);
 expect(bindActionHistory(waiting,1,'own')?.status).toBe('running');
});
it('replays early output and cancellation only after the exact response binds the history',()=>{
 let run:TrackedAction|null=pending();
 run=receiveActionEvent(run,{serverId:'host-a',historyId:'other',type:'update_output',data:'UNRELATED'});
 run=receiveActionEvent(run,{serverId:'host-a',historyId:'own',type:'update_output',data:'Requested operation output'});
 run=receiveActionEvent(run,{serverId:'host-a',historyId:'own',type:'update_complete',status:'cancelled',success:false});
 expect(run?.status).toBe('running');run=bindActionHistory(run,1,'own');
 expect(run?.status).toBe('cancelled');expect(run?.lines.map(line=>line.text)).toEqual(['Requested operation output']);
});
it('an older response cannot bind the current request and later events require exact IDs',()=>{
 const current={...pending(),requestId:2};expect(bindActionHistory(current,1,'old')).toBe(current);
 const bound=bindActionHistory(current,2,'new');expect(receiveActionEvent(bound,{serverId:'host-a',historyId:'old',type:'update_error',error:'old failure'})).toBe(bound);
 expect(receiveActionEvent(bound,{serverId:'host-a',type:'update_complete',success:true})).toBe(bound);
});
it('bounds early traffic and reports uncertainty instead of silently waiting after dropped events',()=>{
 let run:TrackedAction|null=pending();for(let i=0;i<105;i++)run=receiveActionEvent(run,{serverId:'host-a',historyId:'other',type:'update_output',data:'log'});
 expect(run?.earlyEvents?.length).toBe(100);expect(bindActionHistory(run,1,'own')?.status).toBe('unknown');
});
