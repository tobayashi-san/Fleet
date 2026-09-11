export function startPluginMount<Context>(options: {
  load:()=>Promise<{mount?:(container:HTMLElement,context:Context)=>void|Promise<void>;unmount?:()=>void|Promise<void>}>;
  container:HTMLElement;context:Context;ready:()=>void;failed:(error:unknown)=>void;
}) {
  let cancelled=false;
  let settled=false;
  let failed=false;
  let cleaned=false;
  let module:Awaited<ReturnType<typeof options.load>>|undefined;
  const cleanup=()=>{
    if(cleaned || !settled || !module)return;
    cleaned=true;
    try{Promise.resolve(module.unmount?.()).catch(()=>{});}catch{/* cleanup must not replace the original error */}
  };
  const done=(async()=>{
    try {
      module=await options.load();
      if(cancelled)return;
      if(typeof module.mount!=='function')throw new Error('This plugin does not export a UI mount function.');
      await module.mount(options.container,options.context);
      if(!cancelled)options.ready();
    } catch(error) {failed=true;if(!cancelled)options.failed(error);}
    finally {settled=true;if(cancelled || failed)cleanup();}
  })();
  return {done,dispose(){cancelled=true;cleanup();}};
}
