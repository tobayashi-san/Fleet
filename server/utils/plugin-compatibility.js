'use strict';
const semver=require('semver');
const runtime={node:process.versions.node,shipyard:require('../package.json').version};
function pluginCompatibility(manifest,versions=runtime) {
  if(manifest.engines===undefined)return {status:'unspecified',requirements:[],runtime:versions};
  if(!manifest.engines || typeof manifest.engines!=='object' || Array.isArray(manifest.engines))return {status:'invalid',requirements:[],runtime:versions,error:'manifest.engines must be an object'};
  const requirements=[];
  for(const name of ['node','shipyard']) {
    if(manifest.engines[name]===undefined)continue;
    const range=manifest.engines[name];
    if(typeof range!=='string' || !range.trim() || range.length>256 || !semver.validRange(range)) {
      return {status:'invalid',requirements,runtime:versions,error:`manifest.engines.${name} must be a valid semantic version range`};
    }
    requirements.push({name,range,current:versions[name],matches:semver.satisfies(versions[name],range)});
  }
  return {status:!requirements.length?'unspecified':requirements.every(item=>item.matches)?'compatible':'incompatible',requirements,runtime:versions};
}
module.exports={pluginCompatibility};
