import { fork } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Page, Route } from '@playwright/test';

// The shared suite API survives Playwright worker retries. Keep the first-user
// lifecycle on a separate real API so every attempt starts with an empty DB.
export async function withFreshOnboardingApi(page: Page, run: () => Promise<void>) {
  const root = mkdtempSync(join(tmpdir(), 'shipyard-onboarding-e2e-'));
  const child = fork(fileURLToPath(new URL('../../../server/test/fixtures/onboarding-browser-server.js', import.meta.url)), [], {
    env: {
      ...process.env,
      NODE_ENV: 'test',
      DB_PATH: join(root, 'test.sqlite'),
      JWT_SECRET: 'isolated-onboarding-jwt',
      SHIPYARD_KEY_SECRET: 'isolated-onboarding-encryption',
      SHIPYARD_MFA_POLICY: 'optional',
      SHIPYARD_SSH_DIR: join(root, 'ssh'),
      SHIPYARD_PLAYBOOKS_DIR: join(root, 'playbooks'),
      SHIPYARD_GIT_WORKSPACE_DIR: join(root, 'git'),
      PLUGINS_DIR: join(root, 'plugins'),
    },
    stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
  });
  let stderr = '';
  child.stderr?.on('data', chunk => { stderr += chunk.toString(); });
  let handler: ((route: Route) => Promise<void>) | undefined;
  try {
    const port = await new Promise<number>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Onboarding API startup timed out: ${stderr}`)), 10000);
      child.once('message', (message: { port: number }) => { clearTimeout(timer); resolve(message.port); });
      child.once('error', error => { clearTimeout(timer); reject(error); });
      child.once('exit', code => { clearTimeout(timer); reject(new Error(`Onboarding API exited (${code}): ${stderr}`)); });
    });
    handler = async route => {
      const url = new URL(route.request().url());
      const response = await route.fetch({ url: `http://127.0.0.1:${port}${url.pathname}${url.search}` });
      await route.fulfill({ response });
    };
    await page.route(url => url.pathname.startsWith('/api/'), handler);
    await run();
  } finally {
    await page.unrouteAll({ behavior: 'wait' });
    if (child.exitCode === null && child.signalCode === null) {
      await new Promise<void>(resolve => {
        const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
        child.once('exit', () => { clearTimeout(timer); resolve(); });
        child.kill('SIGTERM');
      });
    }
    rmSync(root, { recursive: true, force: true });
  }
}
