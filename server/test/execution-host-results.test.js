const {test}=require('node:test');
const assert=require('node:assert/strict');
const {executionHostResults}=require('../utils/execution-host-results');
test('recaps expose every host and prioritize failures without inventing timing',()=>{
 const rows=executionHostResults('\u001b[32mmedia : ok=5 changed=2 unreachable=0 failed=0 skipped=1\u001b[0m\nedge : ok=0 changed=0 unreachable=1 failed=0 skipped=0');
 assert.equal(rows.length,2);assert.equal(rows[0].name,'edge');assert.equal(rows[0].status,'failed');assert.equal(rows[1].changed,2);assert.equal(rows[1].duration_seconds,null);
});
test('incomplete logs retain a known host failure without inventing recap counts',()=>{ const [host]=executionHostResults('TASK [update]\nfatal: [edge]: FAILED!'); assert.equal(host.status,'failed');assert.equal(host.failed,null); });
test('reads recorded timings while rejecting malformed metadata',()=>{
 const recap='host : ok=1 changed=0 unreachable=0 failed=0';
 assert.equal(executionHostResults(recap+'\n__SHIPYARD_HOST_TIMING__{"host":0.123}')[0].duration_seconds,0.123);
 assert.equal(executionHostResults(recap+'\n__SHIPYARD_HOST_TIMING__{"host":-1}')[0].duration_seconds,null);
});
