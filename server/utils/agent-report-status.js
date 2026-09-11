'use strict';
function agentReportStatus(config,now=Date.now()) {
  const intervalSeconds=Math.max(5,parseInt(config?.interval,10)||30);
  const raw=config?.last_seen;
  const normalized=typeof raw==='string'&&/^\d{4}-\d\d-\d\d[ T]\d\d:\d\d:\d\d(?:\.\d+)?$/.test(raw)?raw.replace(' ','T')+'Z':raw;
  const timestamp=raw?Date.parse(normalized):NaN;
  const ageMs=now-timestamp;
  const state=!raw?'never':!Number.isFinite(timestamp)||ageMs<0?'invalid':ageMs<=intervalSeconds*10000?'recent':'overdue';
  return {state,intervalSeconds,lastSeen:Number.isFinite(timestamp)?new Date(timestamp).toISOString():null,health:state==='recent'?(ageMs<=intervalSeconds*3000?'ok':'warning'):'failed'};
}
module.exports={agentReportStatus};
