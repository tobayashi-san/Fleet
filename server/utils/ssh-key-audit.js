'use strict';
const {sshKeyMetadata}=require('./ssh-key-metadata');
function snapshot(key) {
  if (!key) return {};
  const metadata=sshKeyMetadata(key.public_key);
  return {'Key ID':key.id,Name:key.name,Algorithm:metadata.algorithm || 'Unavailable',Fingerprint:metadata.fingerprint || 'Unavailable'};
}
function sshKeyAuditDetail(before,after) {
  const previous=snapshot(before), next=snapshot(after), key=after || before;
  const changes=[...new Set([...Object.keys(previous),...Object.keys(next)])].filter(label=>previous[label]!==next[label]).map(label=>({label,before:previous[label] ?? 'Not present',after:next[label] ?? 'Not present'}));
  return JSON.stringify({kind:'ssh-key-change',version:1,resource:{id:key.id,name:key.name},changes});
}
module.exports={sshKeyAuditDetail};
