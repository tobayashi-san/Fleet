import {describe,it,expect,vi} from 'vitest';
vi.mock('./api',()=>({apiFetch:vi.fn().mockResolvedValue({ok:true})}));
import {apiFetch} from './api';import {pluginRequest} from './plugin-request';
describe('plugin environment request lifetime',()=>{
 it('pins calls to the mounted environment and rejects calls after disposal',async()=>{
  vi.mocked(apiFetch).mockClear();const controller=new AbortController();const request=pluginRequest('production',controller.signal);
  await request('/plugin/test/run',{method:'POST',environmentId:'other',body:{value:1}});
  expect(apiFetch).toHaveBeenCalledWith('/plugin/test/run',expect.objectContaining({environmentId:'production',signal:controller.signal}));
  controller.abort();await expect(request('/plugin/test/run',{method:'POST'})).rejects.toMatchObject({name:'AbortError'});expect(apiFetch).toHaveBeenCalledTimes(1);
 });
 it('retains caller cancellation while also aborting on host disposal',async()=>{
  for(const hostFirst of [true,false]){
   const host=new AbortController(),caller=new AbortController();await pluginRequest('default',host.signal)('/read',{signal:caller.signal});
   const signal=vi.mocked(apiFetch).mock.calls.at(-1)![1]!.signal!;expect(signal.aborted).toBe(false);
   (hostFirst?host:caller).abort();expect(signal.aborted).toBe(true);
  }
 });
});
