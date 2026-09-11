const {test}=require('node:test');
const assert=require('node:assert/strict');
const {validateComposeContent:validate}=require('../utils/compose-validation');
test('accepts service mappings, extension anchors and include-based Compose files',()=>{
 for(const content of ['services:\n  web:\n    image: nginx:stable\n', 'x-defaults: &defaults\n  restart: unless-stopped\nservices:\n  web:\n    <<: *defaults\n    image: "${IMAGE}"\n', 'include:\n  - ./other.yml\n']) assert.equal(validate(content),null);
});
test('rejects malformed YAML and structures without revealing configuration values',()=>{
 for(const content of [null,123,'','[]','services: []','services:\n  web: text','services:\n  bad/name: {}','include: file.yml','version: "3"']) assert.equal(typeof validate(content),'string');
 const result=validate('services:\n  secret: [DO_NOT_EXPOSE');
 assert.match(result,/line \d+, column \d+/);assert.doesNotMatch(result,/DO_NOT_EXPOSE/);
 assert.match(validate('services: {}\nservices: {}'),/Invalid YAML/);
 assert.match(validate('x'.repeat(1024*1024+1)),/1 MiB/);
});
