'use strict';
const {agentReportStatus}=require('./agent-report-status');
function agentOverview(servers,configs,enabled,now=Date.now()) {
  const byServer=new Map(configs.map(config=>[config.server_id,config]));
  const counts={ssh:0,push:0,pull:0,recent:0,overdue:0,never:0,invalid:0};
  const hosts=servers.map(server=>{
    const config=byServer.get(server.id);
    const mode=config?.mode==='push'||config?.mode==='pull'?config.mode:'ssh';
    counts[mode]++;
    const report=agentReportStatus(config,now);
    const {intervalSeconds,lastSeen}=report;
    const reportState=mode==='ssh'?null:report.state;
    if(reportState)counts[reportState]++;
    return {id:server.id,name:server.name,environmentId:server.environment_id||'default',mode,effectiveMode:enabled?mode:'ssh',reportState,lastSeen,intervalSeconds,runnerVersion:config?.runner_version||null};
  });
  return {checkedAt:new Date(now).toISOString(),enabled,total:hosts.length,counts,hosts};
}
module.exports={agentOverview};
