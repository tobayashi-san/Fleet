'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {createSecretRedactor,redactSecrets}=require('../utils/secret-redactor');
test('masks secrets across every possible chunk boundary without withholding unrelated text',()=>{
 const text='prefix token-123 suffix';
 for(let split=0;split<=text.length;split++){
  const r=createSecretRedactor(['token-123']);
  assert.equal(r.write(text.slice(0,split))+r.write(text.slice(split))+r.end(),'prefix ******** suffix');
 }
 const r=createSecretRedactor(['token-123']);assert.equal(r.write('ordinary output\n'),'ordinary output\n');
});
test('handles character chunks, unicode, regex characters, prefixes and duplicate secrets',()=>{
 const secrets=['päss🔑.*','päss','',null,'päss🔑.*'];const r=createSecretRedactor(secrets);
 const output=[...'päss🔑.* and safe tail p'].map(char=>r.write(char)).join('')+r.end();
 assert.equal(output,'******** and safe tail p');
 assert.equal(redactSecrets('päss🔑.*',secrets),'********');
});
