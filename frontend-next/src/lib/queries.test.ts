import { describe, expect, it } from 'vitest';
import { canAccessDeployments, canAccessOperations, type Profile } from './queries';

const operator: Profile = { role: 'user', permissions: { canManageDeployments: true } };
const deploymentViewer: Profile = { role: 'user', permissions: { canViewDeployments: true } };
const auditor: Profile = { role: 'user', permissions: { canViewAudit: true } };
describe('navigation access rules', () => {
  it('requires the integrated deployment capability', () => {
    expect(canAccessDeployments(operator)).toBe(true);
    expect(canAccessDeployments(deploymentViewer)).toBe(true);
    expect(canAccessDeployments({ ...operator, permissions: {} })).toBe(false);
    expect(canAccessDeployments({ role: 'user', permissions: { canManageDeploymentPlatforms: true } })).toBe(true);
  });

  it('keeps operations available to audit-only roles without exposing deployments', () => {
    expect(canAccessDeployments(auditor)).toBe(false);
    expect(canAccessOperations(auditor)).toBe(true);
  });
});
