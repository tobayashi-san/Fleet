import {afterEach,expect,it,vi} from 'vitest';
import {clearRunStart,getRunStart,subscribeRunStart,trackRunStart} from './run-start-tracker';
afterEach(()=>{for(const key of ['a','b'])clearRunStart(key);vi.unstubAllGlobals();});
it('pending starts survive subscriber replacement and prevent duplicate submission',async()=>{
 const setItem=vi.fn();vi.stubGlobal('window',{sessionStorage:{setItem}});
 let resolve!: (value:{runId:string})=>void;
 const request=vi.fn(()=>new Promise<{runId:string}>(done=>{resolve=done;}));
 const original=vi.fn();const unsubscribe=subscribeRunStart('a',original);
 const pending=trackRunStart('a',request);unsubscribe();
 expect(getRunStart('a')?.pending).toBe(true);expect(getRunStart('b')).toBeUndefined();
 const replacement=vi.fn();const stop=subscribeRunStart('a',replacement);
 await expect(trackRunStart('a',request)).rejects.toThrow('already in progress');expect(request).toHaveBeenCalledTimes(1);
 resolve({runId:'run-42'});await pending;
 expect(getRunStart('a')).toEqual({pending:false,runId:'run-42'});expect(setItem).toHaveBeenCalledWith('a','run-42');expect(replacement).toHaveBeenCalledOnce();stop();
});
it('a failed start remains visible after remount and releases the pending guard',async()=>{
 vi.stubGlobal('window',{sessionStorage:{setItem:vi.fn()}});
 await expect(trackRunStart('a',async()=>{throw new Error('Connection lost');})).rejects.toThrow('Connection lost');
 expect(getRunStart('a')).toEqual({pending:false,error:'Connection lost'});
 await trackRunStart('a',async()=>({runId:'recovered'}));expect(getRunStart('a')?.runId).toBe('recovered');
 clearRunStart('a');expect(getRunStart('a')).toBeUndefined();
});

it('retains an accepted run when browser storage is unavailable', async () => {
 vi.stubGlobal('window', {sessionStorage: {setItem: () => {throw new Error('Storage unavailable');}}});
 await expect(trackRunStart('a', async () => ({runId: 'accepted'}))).resolves.toEqual({runId: 'accepted'});
 expect(getRunStart('a')).toEqual({pending: false, runId: 'accepted'});
});
