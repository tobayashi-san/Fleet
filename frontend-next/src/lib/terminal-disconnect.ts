export function terminalDisconnectMessage(code: number, established: boolean): string {
  if (code === 4001) return 'Your sign-in session expired or was revoked. Sign in again before opening a new terminal.';
  if (code === 4003) return 'Terminal access is no longer allowed. Ask an administrator to check your role and access to this host.';
  if (code === 4004) return 'This host is no longer available in the selected environment. Refresh the host inventory.';
  if (code === 1006) return 'The terminal connection was lost unexpectedly. Check connectivity and the host status before opening a new terminal.';
  return established ? 'The SSH session has ended. Open a new terminal if you want to continue.' : 'The terminal connection could not be established. Check the host status and SSH configuration.';
}
