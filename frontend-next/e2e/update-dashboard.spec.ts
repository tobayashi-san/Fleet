import { expect, test, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.evaluate(async () => {
    const body = JSON.stringify({ username: 'e2e-admin', password: 'E2e-password-2026!' });
    let response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    if (!response.ok) response = await fetch('/api/auth/setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    localStorage.setItem('shipyard_token', (await response.json()).token);
  });
}
const catalog = { checked_at: new Date().toISOString(), stale: false, failure: null, updates: [] };

test('updates lists system packages and Docker images with accurate unknown states and host links', async ({ page }) => {
  await login(page);
  await page.route('**/api/servers/update-dashboard', route => route.fulfill({ json: [
    { id: 'update-host', name: 'Update host', status: 'online', reboot_required: true, system: { ...catalog, updates: [{ package: 'openssl', current_version: '1', version: '2' }] }, docker: { ...catalog, updates: [{ container_name: 'web', image: 'nginx:latest', status: 'update_available' }] } },
    { id: 'unknown', name: 'Unknown host', status: 'offline', reboot_required: false, system: { ...catalog, checked_at: null, stale: true } },
    { id: 'failed', name: 'Failed host', status: 'online', reboot_required: false, system: { ...catalog, failure: { reason: 'Package manager unavailable' } } },
  ] }));
  await page.goto('/updates');
  await expect(page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Updates', exact: true })).toHaveAttribute('aria-current', 'page');
  const system = page.getByRole('region', { name: 'System updates for Update host' });
  await system.locator('summary').click();
  await expect(system.getByText('openssl', { exact: true })).toBeVisible();
  await expect(system.getByRole('link')).toHaveAttribute('href', '/servers/update-host#tab=updates');
  const docker = page.getByRole('region', { name: 'Docker updates for Update host' });
  await docker.locator('summary').click();
  await expect(docker.getByText('web', { exact: true })).toBeVisible();
  await expect(docker.getByRole('link')).toHaveAttribute('href', '/servers/update-host#tab=docker');
  await expect(page.getByText('Not checked', { exact: true })).toBeVisible();
  await expect(page.getByText('Check failed', { exact: true })).toBeVisible();
  await page.getByLabel('Filter updates').selectOption('available');
  await expect(page.getByRole('link', { name: 'Unknown host', exact: true })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.getByLabel('Filter updates').selectOption('available');
  await expect(system).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: `${process.env.FLEET_E2E_ARTIFACT_DIR}/updates-mobile.png`, fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.reload();
  await expect(system).toBeVisible();
  await page.screenshot({ path: `${process.env.FLEET_E2E_ARTIFACT_DIR}/updates-desktop.png`, fullPage: true });
});

test('update overview failure is not rendered as an empty healthy dashboard', async ({ page }) => {
  await login(page);
  await page.route('**/api/servers/update-dashboard', route => route.fulfill({ status: 503, json: { error: 'Unavailable' } }));
  await page.goto('/updates');
  await expect(page.getByText('Updates could not be loaded', { exact: true })).toBeVisible();
  await expect(page.getByText('No hosts in this environment.', { exact: true })).toHaveCount(0);
});

test('VM ID preference immediately updates host and deployment lists and persists', async ({ page }) => {
  await login(page);
  await page.route('**/api/servers?*', route => route.fulfill({ json: [{ id: 'vm-host', name: 'VM host', hostname: 'vm-host', status: 'online', proxmox_vm_id: 321, tags: [], services: [] }] }));
  await page.route('**/api/opentofu/vms?*', route => route.fulfill({ json: [{ id: 'vm', name: 'VM definition', node_name: 'pve', vm_id: 321 }] }));
  await page.goto('/servers');
  await expect(page.getByText('VM 321', { exact: true }).first()).toBeVisible();
  await page.goto('/profile');
  const toggle = page.getByRole('switch', { name: 'Show VM IDs', exact: true });
  await expect(toggle).toBeChecked();
  await toggle.click();
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Hosts', exact: true }).click();
  await expect(page.getByText('VM 321', { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('VM 321', { exact: true })).toHaveCount(0);
  await page.goto('/deployments');
  await expect(page.getByText('VM 321', { exact: true })).toHaveCount(0);
  await page.goto('/profile');
  await toggle.click();
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Deployments', exact: true }).click();
  await expect(page.getByText('VM 321', { exact: true })).toBeVisible();
});

test('host-only role cannot access the update dashboard', async ({ page }) => {
  await login(page);
  await page.route('**/api/auth/profile', async route => {
    const response = await route.fetch();
    await route.fulfill({ json: { ...await response.json(), role: 'viewer', permissions: { canViewServers: true, servers: 'all' } } });
  });
  let calls = 0;
  await page.route('**/api/servers/update-dashboard', route => { calls++; return route.fulfill({ json: [] }); });
  await page.goto('/updates');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Updates', exact: true })).toHaveCount(0);
  expect(calls).toBe(0);
});
