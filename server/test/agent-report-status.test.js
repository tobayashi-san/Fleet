const {test}=require('node:test');const assert=require('node:assert/strict');const {execFileSync}=require('node:child_process');const {agentReportStatus}=require('../utils/agent-report-status');
test('agent recency interprets database UTC dates independently of server timezone',()=>{
 const script=`const {agentReportStatus}=require('./server/utils/agent-report-status');process.stdout.write(JSON.stringify(agentReportStatus({interval:30,last_seen:'2026-09-10 12:00:00'},Date.parse('2026-09-10T12:01:00Z'))));`;
 const values=['UTC','Europe/Zurich','America/New_York'].map(TZ=>execFileSync(process.execPath,['-e',script],{cwd:require('node:path').join(__dirname,'../..'),env:{...process.env,TZ},encoding:'utf8'}));
 assert.equal(values[0],values[1]);assert.equal(values[0],values[2]);assert.equal(JSON.parse(values[0]).health,'ok');
});
test('warning and overdue boundaries distinguish missing, invalid and future reports',()=>{
 const base=Date.parse('2026-09-10T12:00:00Z');const config={interval:30,last_seen:'2026-09-10T12:00:00Z'};
 assert.equal(agentReportStatus(config,base+90000).health,'ok');assert.equal(agentReportStatus(config,base+90001).health,'warning');assert.equal(agentReportStatus(config,base+300000).state,'recent');assert.equal(agentReportStatus(config,base+300001).state,'overdue');assert.equal(agentReportStatus(config,base-1).state,'invalid');assert.equal(agentReportStatus({last_seen:'bad'},base).state,'invalid');assert.equal(agentReportStatus({},base).state,'never');
});
