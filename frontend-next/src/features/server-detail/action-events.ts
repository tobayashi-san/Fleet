import {completionStatus} from '@/lib/execution-status';
import type {OutputLine,RunStatus} from '@/components/ui/action-run-dialog';
interface ActionEvent {type?:unknown;historyId?:unknown;serverId?:unknown;status?:unknown;success?:unknown;data?:unknown;stream?:unknown;error?:unknown}
export interface TrackedAction {title:string;status:RunStatus;lines:OutputLine[];historyId?:string;serverId:string;requestId:number;earlyEvents?:ActionEvent[];earlyEventsTruncated?:boolean}

export function receiveActionEvent(run:TrackedAction|null,event:ActionEvent):TrackedAction|null {
 if(!run || run.status!=='running' || event.serverId!==run.serverId || typeof event.historyId!=='string' || !['update_output','update_complete','update_error'].includes(String(event.type)))return run;
 if(!run.historyId) {
  const bounded={type:event.type,historyId:event.historyId,serverId:event.serverId,status:event.status,success:event.success,stream:event.stream,data:String(event.data??'').slice(-4096),error:String(event.error??'').slice(-4096)};
  const events=[...(run.earlyEvents||[]),bounded];
  return {...run,earlyEvents:events.slice(-100),earlyEventsTruncated:run.earlyEventsTruncated || events.length>100 || String(event.data??'').length>4096 || String(event.error??'').length>4096};
 }
 if(event.historyId!==run.historyId)return run;
 if(event.type==='update_complete')return {...run,status:completionStatus(event)};
 if(event.type==='update_error')return {...run,status:'failed',lines:[...run.lines,{text:String(event.error??'Unknown error'),cls:'text-red-400'}]};
 return {...run,lines:[...run.lines,...String(event.data??'').split('\n').filter(Boolean).map(text=>({text,cls:event.stream==='stderr'?'text-amber-400':undefined}))]};
}

export function bindActionHistory(run:TrackedAction|null,requestId:number|undefined,historyId:string):TrackedAction|null {
 if(!run || run.requestId!==requestId)return run;
 let bound:TrackedAction={...run,historyId,earlyEvents:undefined};
 for(const event of run.earlyEvents||[])bound=receiveActionEvent(bound,event)!;
 if(run.earlyEventsTruncated) {
  bound={...bound,lines:[...bound.lines,{text:'Some early events could not be retained. Check the execution history for complete output.'}]};
  if(bound.status==='running')bound.status='unknown';
 }
 return bound;
}
