const { chromium, expect } = require('../../../frontend-next/node_modules/@playwright/test');
const fs = require('fs');
const path = require('path');

const project = path.resolve(__dirname, '../../..');
const frontend = path.join(project, 'frontend-next');
const fixtures = [
  'os-preview-fixture',
  'package-impact-fixture',
  'custom-dialog-fixture',
  'custom-detail-review',
];
const temporary = [];

(async () => {
  let browser;
  try {
    for (const name of fixtures) {
      const target = path.join(frontend, `${name}.html`);
      if (fs.existsSync(target)) throw new Error(`Temporary fixture already exists: ${target}`);
      fs.copyFileSync(path.join(__dirname, `${name}.html`), target);
      temporary.push(target);
    }

    browser = await chromium.launch({
      headless: true,
      executablePath: '/home/tobiasamstutz/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome',
      args: ['--no-sandbox'],
    });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

    await page.goto('http://localhost:5188/os-preview-fixture.html');
    await page.getByRole('button', { name: 'Preview package changes' }).click();
    await expect(page.getByText('1 upgrades · 1 new installations · 1 removals')).toBeVisible();
    await expect(page.getByText('openssl', { exact: true })).toBeVisible();
    await expect(page.getByText('3.0.13-1', { exact: true })).toBeVisible();
    await expect(page.getByText('3.0.13-2', { exact: true })).toBeVisible();
    await expect(page.getByText('Potential service impact')).toBeVisible();
    await page.screenshot({ path: path.join(__dirname, 'os-preview-final.png'), fullPage: true });
    await page.getByRole('button', { name: 'Simulate next request failure' }).click();
    await page.getByRole('button', { name: 'Preview package changes' }).click();
    await expect(page.getByRole('alert')).toContainText('Simulated preview failure');
    console.log('PASS OS package preview, versions, impact and failure');

    await page.goto('http://localhost:5188/package-impact-fixture.html');
    await expect(page.getByText('Host currently reports a required reboot.')).toBeVisible();
    await expect(page.getByText('Current reboot requirement has not been reported.')).toBeVisible();
    await expect(page.getByText('No reboot currently reported. These updates may still require one.')).toBeVisible();
    await page.screenshot({ path: path.join(__dirname, 'package-impact-final.png'), fullPage: true });
    console.log('PASS reboot and version-difference states');

    await page.goto('http://localhost:5188/custom-dialog-fixture.html');
    await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Application release');
    await expect(page.getByLabel('Type', { exact: true })).toHaveValue('script');
    await expect(page.getByLabel('Check Command (installed version)', { exact: true })).toHaveValue('my-app --version');
    await expect(page.getByLabel('Desired-state command (target version)', { exact: true })).toHaveValue('cat /etc/my-app/desired-version');
    await expect(page.getByText(/Each SSH command has a 30-second limit/)).toBeVisible();
    await page.getByRole('button', { name: 'Test check before saving' }).click();
    await expect(page.getByText('Observed:')).toBeVisible();
    await expect(page.getByText('Compared with:')).toBeVisible();
    await expect(page.getByText('This check indicates an update.')).toBeVisible();
    await page.getByLabel('Check Command (installed version)', { exact: true }).fill('my-app --version --short');
    await expect(page.getByText('Inputs changed. Run the check again for this draft.')).toBeVisible();
    await page.screenshot({ path: path.join(__dirname, 'custom-check-dialog-final.png'), fullPage: true });
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Simulated save failure');
    await expect(page.getByLabel('Check Command (installed version)', { exact: true })).toHaveValue('my-app --version --short');
    console.log('PASS custom labels, preview, changed-input invalidation and save failure');

    await page.goto('http://localhost:5188/custom-detail-review.html');
    await expect(page.getByText('Old successful check')).toBeVisible();
    await expect(page.getByText('Known pending update')).toBeVisible();
    await expect(page.getByText(/Last successful check:/).first()).toBeVisible();
    await expect(page.getByText(/Stale result; verify before updating/)).toBeVisible();
    await page.screenshot({ path: path.join(__dirname, 'custom-update-status-final.png'), fullPage: true });
    console.log('PASS custom versions, last check and stale status');
  } finally {
    if (browser) await browser.close();
    for (const file of temporary) if (fs.existsSync(file)) fs.unlinkSync(file);
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
