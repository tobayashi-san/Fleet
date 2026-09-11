'use strict';
function createSecretRedactor(values) {
  const secrets=[...new Set(values.filter(value=>typeof value==='string' && value.length))].sort((a,b)=>b.length-a.length);
  const maxLength=secrets[0]?.length || 0;
  let pending='';
  function drain(final) {
    let output='', index=0;
    while(index<pending.length) {
      if(!final && pending.length-index<maxLength && secrets.some(secret=>secret.length>pending.length-index && secret.startsWith(pending.slice(index))))break;
      const matched=secrets.find(secret=>pending.startsWith(secret,index));
      if(matched){output+='********';index+=matched.length;continue;}
      output+=pending[index++];
    }
    pending=pending.slice(index);
    return output;
  }
  return {write(value){pending+=String(value);return drain(false);},end(){return drain(true);}};
}
function redactSecrets(value,secrets) {
  const redactor=createSecretRedactor(secrets);
  return redactor.write(value)+redactor.end();
}
module.exports={createSecretRedactor,redactSecrets};
