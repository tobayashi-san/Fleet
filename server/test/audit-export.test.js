'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {auditCsv,csvCell}=require('../utils/audit-export');
test('export preserves structured evidence and adds historical object/change columns',()=>{
 const detail=JSON.stringify({kind:'user-change',version:1,resource:{id:'removed',name:'Former user'},changes:[{label:'MFA',before:'Enabled',after:'Disabled'}]});
 const csv=auditCsv([{action:'users.totp.disable',detail,success:1}]);
 assert.ok(csv.startsWith('\ufeff'));assert.ok(csv.includes('"Object ID";"Object name";"Changes"'));
 assert.ok(csv.includes('"removed";"Former user";"MFA: Enabled → Disabled"'));
 assert.ok(csv.includes(csvCell(detail)));
 assert.ok(auditCsv([{detail:'legacy'}]).endsWith(';"";"";""'));
});
test('spreadsheet formulas are inert even after whitespace while quotes and multiline values survive',()=>{
 for(const value of ['=1+1','+SUM(A1)','-1+2','@SUM(A1)','  =1+1','\t=1+1','\r=1+1'])assert.ok(csvCell(value).startsWith('"\''));
 assert.equal(csvCell('ordinary "value";x\nsecond line'),'"ordinary ""value"";x\nsecond line"');
 assert.equal(csvCell(null),'""');
});

test('SSH lifecycle changes export historical fingerprints',()=>{
 const rows=[{action:'ssh.import',detail:JSON.stringify({kind:'ssh-key-change',version:1,resource:{id:'key-id',name:'Central key'},changes:[{label:'Fingerprint',before:'SHA256:old',after:'SHA256:new'}]})},{action:'ssh.export'}];
 assert.ok(auditCsv(rows).includes('Fingerprint: SHA256:old → SHA256:new'));
});
test('host changes export historical identity and structured before/after values',()=>{
 const detail=JSON.stringify({kind:'host-change',version:1,resource:{id:'host-42',name:'Historical database'},changes:[{label:'IP address',before:'192.0.2.1',after:'192.0.2.2'}]});
 const csv=auditCsv([{action:'server.update',detail,success:1}]);
 assert.ok(csv.includes('"host-42";"Historical database";"IP address: 192.0.2.1 → 192.0.2.2"'));
 assert.ok(csv.includes(csvCell(detail)));
});
test('audit exports distinguish unknown results from explicit failures',()=>{
 for(const [success,expected] of [[undefined,'unknown'],[null,'unknown'],[0,'no'],[false,'no'],[1,'yes'],[true,'yes']]) {
  const csv=auditCsv([{action:'probe',success,detail:'RESULT'}]);
  assert.ok(csv.includes(`;"${expected}";"RESULT";`));
 }
});
