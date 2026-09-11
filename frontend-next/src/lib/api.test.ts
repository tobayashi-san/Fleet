import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, apiFetch, apiFetchArray, apiUploadFile } from './api';

describe('apiFetch', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('uploads encrypted backup blobs unchanged in the explicitly selected environment', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', {headers: {'content-type': 'application/json'}}));
    vi.stubGlobal('fetch', fetchMock);
    const archive = new Blob([new Uint8Array([0, 255, 17, 42])]);
    await apiFetch('/reset/servers/backup/upload-id', {method: 'PUT', body: archive, environmentId: 'selected', headers: {'Content-Type': 'application/octet-stream'}});
    expect(fetchMock).toHaveBeenCalledWith('/api/reset/servers/backup/upload-id', expect.objectContaining({body: archive, headers: expect.objectContaining({'Content-Type': 'application/octet-stream', 'X-Shipyard-Environment': 'selected'})}));
  });

  it('serializes JSON bodies and returns JSON responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      headers: { 'content-type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiFetch<{ ok: boolean }>('/ping', {
      method: 'POST', body: { enabled: true }, skipAuth: true,
    })).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledWith('/api/ping', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ enabled: true }),
    }));
  });

  it('attaches the selected environment to every request', async () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => key === 'shipyard_environment' ? 'production' : 'test-token'),
    });
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      headers: { 'content-type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/servers');

    expect(fetchMock).toHaveBeenCalledWith('/api/servers', expect.objectContaining({
      headers: expect.objectContaining({ 'X-Shipyard-Environment': 'production' }),
    }));
  });

  it('keeps create, connection test and key installation in their explicit target environment', async () => {
    vi.stubGlobal('localStorage', { getItem: vi.fn((key: string) => key === 'shipyard_environment' ? 'production' : 'test-token') });
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response('{}', { headers: { 'content-type': 'application/json' } })));
    vi.stubGlobal('fetch', fetchMock);
    const data = { environment_id: 'staging', name: 'new-host' };
    await api.createServer(data);
    await api.testNewServerConnection(data);
    await api.deploySSHKey(data);
    for (const [, init] of fetchMock.mock.calls) {
      expect(init.headers['X-Shipyard-Environment']).toBe('staging');
      expect(JSON.parse(init.body).environment_id).toBe('staging');
      expect(init).not.toHaveProperty('environmentId');
    }
    await apiFetch('/servers');
    expect(fetchMock.mock.calls[3][1].headers['X-Shipyard-Environment']).toBe('production');
  });

  it('binds the package preview to the environment captured when it was opened', async () => {
    vi.stubGlobal('localStorage', { getItem: vi.fn(() => 'production') });
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response('{}', { headers: { 'content-type': 'application/json' } })));
    vi.stubGlobal('fetch', fetchMock);
    await api.previewServerUpdates('host-a', 'stage');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/servers/host-a/updates/preview');
    expect(fetchMock.mock.calls[0][1].headers['X-Shipyard-Environment']).toBe('stage');
    expect(fetchMock.mock.calls[0][1]).not.toHaveProperty('environmentId');
    await api.deleteServer('host-a', 'stage');
    expect(fetchMock.mock.calls[1][1].method).toBe('DELETE');
    expect(fetchMock.mock.calls[1][1].headers['X-Shipyard-Environment']).toBe('stage');
    await api.runSelectedUpdates(['host-a','host-b'], 'stage');
    expect(fetchMock.mock.calls[2][0]).toBe('/api/servers/update-all');
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({server_ids:['host-a','host-b']});
    expect(fetchMock.mock.calls[2][1].headers['X-Shipyard-Environment']).toBe('stage');
    await api.setServersGroup(['host-a','host-b'], 'folder', 'stage');
    expect(JSON.parse(fetchMock.mock.calls[3][1].body)).toEqual({server_ids:['host-a','host-b'],group_id:'folder'});
    expect(fetchMock.mock.calls[3][1].headers['X-Shipyard-Environment']).toBe('stage');
  });

  it('sends folder edits as one request with explicit parent and captured environment', async () => {
    vi.stubGlobal('localStorage', { getItem: vi.fn(() => 'production') });
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response('{}', { headers: { 'content-type': 'application/json' } })));
    vi.stubGlobal('fetch', fetchMock);
    await api.updateServerGroup('folder', 'New name', '#123456', 'stage', null);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/servers/groups/folder');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({name:'New name',color:'#123456',parent_id:null});
    expect(fetchMock.mock.calls[0][1].headers['X-Shipyard-Environment']).toBe('stage');
    await api.updateServerGroup('folder', 'Metadata only');
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).not.toHaveProperty('parent_id');
  });

  it('cancels a playbook run in its captured environment', async () => {
    vi.stubGlobal('localStorage', { getItem: vi.fn(() => 'production') });
    const fetchMock=vi.fn().mockResolvedValue(new Response('{}',{headers:{'content-type':'application/json'}}));
    vi.stubGlobal('fetch',fetchMock);
    await api.cancelPlaybookRun('run-42','stage');
    expect(fetchMock).toHaveBeenCalledWith('/api/ansible/runs/run-42/cancel',expect.objectContaining({method:'POST',headers:expect.objectContaining({'X-Shipyard-Environment':'stage'})}));
  });

  it('pins playbook start and status reads to the run environment', async () => {
    vi.stubGlobal('localStorage',{getItem:vi.fn(()=> 'production')});
    const fetchMock=vi.fn().mockImplementation(()=>Promise.resolve(new Response('{}',{headers:{'content-type':'application/json'}})));
    vi.stubGlobal('fetch',fetchMock);
    await api.runPlaybook('update.yml','host',{}, {environment_id:'stage'});
    await api.getPlaybookRunStatus('run-42','stage');
    expect(fetchMock.mock.calls[0][1].headers['X-Shipyard-Environment']).toBe('stage');
    expect(fetchMock.mock.calls[1][1].headers['X-Shipyard-Environment']).toBe('stage');
    expect(fetchMock.mock.calls[1][0]).toBe('/api/ansible/runs/run-42/status');
  });

  it('returns a typed error including the API message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Denied' }), {
      status: 403,
      headers: { 'content-type': 'application/json' },
    })));

    await expect(apiFetch('/servers', { skipAuth: true })).rejects.toMatchObject({
      name: 'ApiError', status: 403, message: 'Denied',
    });
  });

  it('normalizes malformed collection responses to an empty list', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ stale: true }), {
      headers: { 'content-type': 'application/json' },
    })));

    await expect(apiFetchArray('/servers', { skipAuth: true })).resolves.toEqual([]);
  });

  it('turns stalled requests into a retryable timeout error', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    })));

    const request = apiFetch('/stalled', { skipAuth: true, timeoutMs: 1_000 });
    const assertion = expect(request).rejects.toMatchObject({
      name: 'ApiError',
      status: 408,
      message: 'Request timed out after 1 seconds. Try again.',
    });
    await vi.advanceTimersByTimeAsync(1_000);
    await assertion;
  });

  it('sends the selected OpenTofu version to the managed installer', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, version: '1.10.0' }), {
      headers: { 'content-type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(api.installOpenTofu('1.10.0')).resolves.toMatchObject({ success: true });
    expect(fetchMock).toHaveBeenCalledWith('/api/opentofu/install', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ version: '1.10.0' }),
    }));
  });
});

describe('apiUploadFile', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('aborts the browser request when its signal is canceled', async () => {
    class MockXMLHttpRequest {
      static latest: MockXMLHttpRequest;
      upload = { onprogress: null as ((event: ProgressEvent) => void) | null };
      onerror: ((event: ProgressEvent) => void) | null = null;
      onabort: ((event: ProgressEvent) => void) | null = null;
      onload: ((event: ProgressEvent) => void) | null = null;
      responseText = '';
      status = 0;
      abort = vi.fn(() => this.onabort?.({} as ProgressEvent));
      open = vi.fn();
      send = vi.fn();
      setRequestHeader = vi.fn();

      constructor() {
        MockXMLHttpRequest.latest = this;
      }
    }
    vi.stubGlobal('XMLHttpRequest', MockXMLHttpRequest);
    const controller = new AbortController();

    const upload = apiUploadFile('/files/upload', new File(['large file'], 'large.bin'), undefined, controller.signal);
    controller.abort();

    await expect(upload).rejects.toMatchObject({ status: 499, message: 'Upload canceled' });
    expect(MockXMLHttpRequest.latest.abort).toHaveBeenCalledOnce();
  });
});

it('100 percent browser upload waits for server acknowledgement and may still fail', async () => {
  class UploadRequest {
    static latest: UploadRequest;
    upload = { onprogress: null as ((event: ProgressEvent) => void) | null };
    onload: (() => void) | null = null;
    onerror = null; onabort = null;
    responseText = ''; status = 0;
    open() {} setRequestHeader() {} send() {} abort() {}
    constructor() { UploadRequest.latest = this; }
  }
  vi.stubGlobal('XMLHttpRequest', UploadRequest);
  try {
    const progress=vi.fn(); let finished=false;
    const pending=apiUploadFile('/files/upload',new File(['abc'],'test.txt'),progress);
    const checked=expect(pending).rejects.toMatchObject({status:500,message:'Destination write failed'});
    void pending.then(()=>{finished=true;},()=>{finished=true;});
    const xhr=UploadRequest.latest;
    xhr.upload.onprogress?.({lengthComputable:true,loaded:3,total:3} as ProgressEvent);
    await Promise.resolve();
    expect(progress).toHaveBeenLastCalledWith(100); expect(finished).toBe(false);
    xhr.status=500; xhr.responseText=JSON.stringify({error:'Destination write failed'}); xhr.onload?.();
    await checked;
    progress.mockClear();
    xhr.upload.onprogress?.({lengthComputable:true,loaded:3,total:3} as ProgressEvent);
    expect(progress).not.toHaveBeenCalled();
  } finally { vi.unstubAllGlobals(); }
});

describe('structured validation errors', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('preserves a bounded field identifier without retaining the response payload', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({error:'Use HTTPS.',field:'endpoint',secret:'must-not-be-retained'}), {status:400})));
    try { await apiFetch('/validation', {skipAuth:true}); expect.fail('Expected rejection'); }
    catch (error) {
      expect(error).toMatchObject({message:'Use HTTPS.',status:400,field:'endpoint'});
      expect(error).not.toHaveProperty('secret');
    }
  });
  it.each([{}, null, 'a'.repeat(65), '#endpoint', ['endpoint']])('ignores malformed field metadata %j', async field => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({error:{unexpected:true},field}), {status:400})));
    await expect(apiFetch('/validation', {skipAuth:true})).rejects.toMatchObject({message:'Request failed: 400',status:400,field:undefined});
  });
});

it('binary export sends confirmation credentials in a POST body, never the URL', async () => {
  const {apiDownload}=await import('./api');
  vi.useFakeTimers();
  const anchor={href:'',download:'',click:vi.fn()};
  const objectUrl=vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:fixture');
  const revokeUrl=vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
  vi.stubGlobal('document',{createElement:()=>anchor});
  const fetchMock=vi.fn().mockResolvedValue(new Response('encrypted-fixture'));
  vi.stubGlobal('fetch',fetchMock);
  try {
    await apiDownload('/system/database-backup','backup.bin',{body:{password:'synthetic-account-password',passphrase:'synthetic-backup-passphrase'}});
    expect(fetchMock).toHaveBeenCalledWith('/api/system/database-backup',expect.objectContaining({method:'POST',headers:expect.objectContaining({'Content-Type':'application/json'}),body:JSON.stringify({password:'synthetic-account-password',passphrase:'synthetic-backup-passphrase'})}));
    expect(anchor.click).toHaveBeenCalledOnce();
    expect(anchor.download).toBe('backup.bin');
    vi.runAllTimers();
    expect(revokeUrl).toHaveBeenCalledWith('blob:fixture');
  } finally {objectUrl.mockRestore();revokeUrl.mockRestore();vi.unstubAllGlobals();vi.useRealTimers();}
});

it('audit download keeps the requested environment even when browser selection differs',async()=>{
 vi.useFakeTimers();
 const anchor={href:'',download:'',click:vi.fn()};
 const objectUrl=vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:audit');
 const revokeUrl=vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
 vi.stubGlobal('document',{createElement:()=>anchor});
 vi.stubGlobal('localStorage',{getItem:(key:string)=>key==='shipyard_environment'?'other-environment':null});
 const fetchMock=vi.fn().mockResolvedValue(new Response('audit fixture'));
 vi.stubGlobal('fetch',fetchMock);
 try{
  await api.exportAuditLog({environment_id:'requested-environment',action:'server.update'});
  expect(fetchMock).toHaveBeenCalledWith('/api/system/audit/export?environment_id=requested-environment&action=server.update',expect.objectContaining({headers:expect.objectContaining({'X-Shipyard-Environment':'requested-environment'})}));
  expect(anchor.download).toBe('fleet-audit-log.csv');expect(anchor.click).toHaveBeenCalledOnce();vi.runAllTimers();
 }finally{objectUrl.mockRestore();revokeUrl.mockRestore();vi.unstubAllGlobals();vi.useRealTimers();}
});
