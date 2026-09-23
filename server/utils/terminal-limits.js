function terminalLimits(env = process.env) {
  const minutes=(value,fallback)=>{
    if (value === undefined || value === '') return fallback;
    const number=Number(value);
    return Number.isInteger(number) && number>=0 && number<=10080 ? number : fallback;
  };
  return {idleSeconds:minutes(env.FLEET_TERMINAL_IDLE_MINUTES,30)*60,maxSeconds:minutes(env.FLEET_TERMINAL_MAX_MINUTES,480)*60};
}
function createTerminalTimers(limits,expire,timers={set:setTimeout,clear:clearTimeout}) {
  let idle=null;let maximum=null;let stopped=false;
  const stop=()=>{stopped=true;if(idle!==null)timers.clear(idle);if(maximum!==null)timers.clear(maximum);idle=null;maximum=null;};
  const finish=reason=>{if(stopped)return;stop();expire(reason);};
  const touch=()=>{if(stopped)return;if(idle!==null)timers.clear(idle);if(limits.idleSeconds>0){idle=timers.set(()=>finish('idle_timeout'),limits.idleSeconds*1000);idle?.unref?.();}};
  touch();
  if(limits.maxSeconds>0){maximum=timers.set(()=>finish('duration_limit'),limits.maxSeconds*1000);maximum?.unref?.();}
  return {touch,stop};
}
module.exports={terminalLimits,createTerminalTimers};
