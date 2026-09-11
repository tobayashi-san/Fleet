'use strict';
const {createHash}=require('node:crypto');
function roleRevision(role) {
  return createHash('sha256').update(JSON.stringify([role.id,role.name,role.permissions,role.is_system])).digest('hex');
}
module.exports={roleRevision};
