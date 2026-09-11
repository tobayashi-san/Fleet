import { afterEach, expect, it, vi } from 'vitest';
import { revokeCurrentSignIn } from './sign-out';
import { getToken, setToken } from './auth';

function storage() {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
  setToken('active-token');
}
afterEach(() => vi.unstubAllGlobals());

it('clears the local token only after server revocation succeeds', async () => {
  storage();
  let finish!: (response: Response) => void;
  const fetchMock = vi.fn(() => new Promise<Response>(resolve => { finish = resolve; }));
  vi.stubGlobal('fetch', fetchMock);
  const pending = revokeCurrentSignIn();
  expect(getToken()).toBe('active-token');
  expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ Authorization: 'Bearer active-token' }) }));
  finish(Response.json({ success: true }));
  await pending;
  expect(getToken()).toBeNull();
});

it('retains credentials after a server failure and permits a successful retry', async () => {
  storage();
  const fetchMock = vi.fn().mockResolvedValueOnce(Response.json({error:'Audit unavailable'}, {status:503})).mockResolvedValueOnce(Response.json({success:true}));
  vi.stubGlobal('fetch', fetchMock);
  await expect(revokeCurrentSignIn()).rejects.toThrow('Audit unavailable');
  expect(getToken()).toBe('active-token');
  await revokeCurrentSignIn();
  expect(getToken()).toBeNull();
});

it('retains credentials on connection failure', async () => {
  storage();
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network unavailable')));
  await expect(revokeCurrentSignIn()).rejects.toThrow('Network unavailable');
  expect(getToken()).toBe('active-token');
});

it('finishes local sign-out when the server already rejects the session', async () => {
  storage();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({}, {status:401})));
  await revokeCurrentSignIn();
  expect(getToken()).toBeNull();
});
