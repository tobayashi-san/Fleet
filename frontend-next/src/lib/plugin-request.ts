import {apiFetch} from './api';
/** A plugin mount may only send requests within its original environment/lifetime. */
export function pluginRequest(environmentId:string,signal:AbortSignal):typeof apiFetch {
  return (path,options={})=>{
    if(signal.aborted)return Promise.reject(new DOMException('Plugin view is no longer active','AbortError'));
    return apiFetch(path,{...options,environmentId,signal:options.signal ? AbortSignal.any([signal,options.signal]) : signal});
  };
}
