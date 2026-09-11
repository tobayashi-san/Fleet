const {parseTargetExpression,resolveTargets}=require('./validate');

function captureWorkflowHostIds(targets, servers) {
  const parsed=parseTargetExpression(resolveTargets(targets,servers));
  if(parsed.kind!=='list'||!parsed.included.length)return null;
  const ids=[];
  for(const name of parsed.included) {
    const matches=servers.filter(server=>server.name===name);
    if(matches.length!==1)return null;
    ids.push(matches[0].id);
  }
  return JSON.stringify([...new Set(ids)]);
}
function workflowHostIds(row) {
  try {
    const ids=JSON.parse(row.target_server_ids);
    return Array.isArray(ids)&&ids.length>0&&ids.every(id=>typeof id==='string'&&id) ? ids : null;
  } catch {return null;}
}
function canAccessWorkflowHistory(perms,row,servers) {
  const {canAccessPlaybook,filterServers}=require('./permissions');
  if(!perms)return false;
  if(perms.full)return true;
  if(!canAccessPlaybook(perms,row.playbook))return false;
  if(perms.servers==='all')return true;
  const ids=workflowHostIds(row);
  if(!ids)return false;
  const visible=new Set(filterServers(servers,perms).map(server=>server.id));
  return ids.every(id=>visible.has(id));
}
module.exports={captureWorkflowHostIds,workflowHostIds,canAccessWorkflowHistory};
