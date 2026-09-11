import { describe, expect, it } from 'vitest';
import { terminalDisconnectMessage } from './terminal-disconnect';
describe('terminal disconnect guidance', () => {
  it('distinguishes sign-in, permission and host failures before or after shell readiness', () => {
    for (const ready of [true, false]) {
      expect(terminalDisconnectMessage(4001, ready)).toContain('Sign in again');
      expect(terminalDisconnectMessage(4003, ready)).toContain('role and access');
      expect(terminalDisconnectMessage(4004, ready)).toContain('host inventory');
    }
  });
  it('does not present unexpected transport loss as a normal SSH exit', () => {
    expect(terminalDisconnectMessage(1006, true)).toContain('lost unexpectedly');
    expect(terminalDisconnectMessage(1000, true)).toContain('session has ended');
    expect(terminalDisconnectMessage(1000, false)).toContain('could not be established');
  });
});
