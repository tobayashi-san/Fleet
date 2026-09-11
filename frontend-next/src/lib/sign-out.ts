import { useMutation } from '@tanstack/react-query';
import { ApiError, apiFetch } from './api';
import { setToken } from './auth';

export async function revokeCurrentSignIn() {
  try {
    await apiFetch('/auth/logout', { method: 'POST', timeoutMs: 10000 });
  } catch (error) {
    // A rejected session already has no server access. Network/server errors
    // keep the local token so the user can retry revocation.
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
  }
  setToken(null);
}

export function useSignOut() {
  return useMutation({
    mutationFn: revokeCurrentSignIn,
    retry: false,
    onSuccess: () => window.location.assign('/login'),
  });
}
