import {describe,it,expect,vi} from 'vitest';
import {startPluginMount} from './plugin-mount';
function deferred(){let resolve!:()=>void;const promise=new Promise<void>(done=>{resolve=done;});return {promise,resolve};}
describe('plugin UI lifecycle',()=>{
 it('waits for a pending mount before cleaning up once and suppresses late UI state',async()=>{
  const pending=deferred();const unmount=vi.fn();const ready=vi.fn();const failed=vi.fn();
  const lifecycle=startPluginMount({load:async()=>({mount:()=>pending.promise,unmount}),container:{} as HTMLElement,context:{},ready,failed});
  await Promise.resolve();lifecycle.dispose();expect(unmount).not.toHaveBeenCalled();pending.resolve();await lifecycle.done;lifecycle.dispose();
  expect(unmount).toHaveBeenCalledTimes(1);expect(ready).not.toHaveBeenCalled();expect(failed).not.toHaveBeenCalled();
 });
 it('does not mount a module loaded after navigation',async()=>{
  const loading=deferred();const mount=vi.fn(),unmount=vi.fn();
  const lifecycle=startPluginMount({load:async()=>{await loading.promise;return {mount,unmount};},container:{} as HTMLElement,context:{},ready:vi.fn(),failed:vi.fn()});
  lifecycle.dispose();loading.resolve();await lifecycle.done;expect(mount).not.toHaveBeenCalled();expect(unmount).toHaveBeenCalledTimes(1);
 });
 it('reports mount errors without rejecting the lifecycle promise and cleans up on disposal',async()=>{
  const failed=vi.fn(),unmount=vi.fn();const error=new Error('Synthetic mount failure');
  const lifecycle=startPluginMount({load:async()=>({mount:async()=>{throw error;},unmount}),container:{} as HTMLElement,context:{},ready:vi.fn(),failed});
  await lifecycle.done;expect(failed).toHaveBeenCalledWith(error);expect(unmount).toHaveBeenCalledTimes(1);lifecycle.dispose();expect(unmount).toHaveBeenCalledTimes(1);
 });
});
