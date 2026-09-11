let active;
function record(text){document.getElementById('fixture-events').textContent+='\n'+text;}
export async function mount(container,ctx){
 active=ctx;window.pluginFixtureContexts=(window.pluginFixtureContexts||[]).concat(ctx);
 record('mount '+ctx.state.environmentId);
 ctx.signal.addEventListener('abort',()=>record('abort '+ctx.state.environmentId),{once:true});
 ctx.onWsMessage(()=>{});
 if(window.pluginFixtureFailOnce){window.pluginFixtureFailOnce=false;throw new Error('Synthetic initialization failure');}
 const heading=document.createElement('h2');heading.textContent='Plugin environment: '+ctx.state.environmentId;container.append(heading);
 const button=document.createElement('button');button.textContent='Read plugin environment';button.onclick=async()=>{const response=await ctx.pluginApi.request('/probe');record('response '+response.environment);};container.append(button);
}
export function unmount(){record('unmount '+active?.state.environmentId);}
