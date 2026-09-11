const { chromium, expect } = require('../../../frontend-next/node_modules/@playwright/test');
const fs = require('fs');
const path = require('path');
const project = path.resolve(__dirname, '../../..');
const frontend = path.join(project, 'frontend-next');
const temporary = path.join(frontend, 'variables-review-fixture.html');

(async () => {
  let browser;
  try {
    if (fs.existsSync(temporary)) throw Error(`Temporary fixture exists: ${temporary}`);
    fs.copyFileSync(path.join(__dirname, 'variables-review-fixture.html'), temporary);
    browser = await chromium.launch({
      headless: true,
      executablePath: '/home/tobiasamstutz/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome',
      args: ['--no-sandbox'],
    });
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    await page.goto('http://localhost:5188/variables-review-fixture.html');

    await expect(page.getByText('worker_limits')).toBeVisible();
    await expect(page.getByText('service_token')).toBeVisible();
    await expect(page.getByText('••••••••')).toBeVisible();
    await expect(page.getByText(/Rotation due: 2026-01-01 · Overdue · advisory/)).toBeVisible();
    await page.getByText('Variable change history').click();
    await expect(page.getByText('updated · service_token')).toBeVisible();
    await expect(page.getByText('deleted · retired_password')).toBeVisible();
    await expect(page.getByText(/Values and description contents are never recorded/)).toBeVisible();
    await page.screenshot({ path: path.join(__dirname, 'variables-inventory-history-final.png'), fullPage: true });

    await page.getByRole('button', { name: /Add/ }).click();
    const secret = page.getByRole('switch', { name: 'Secret value' });
    await expect(secret).toBeChecked();
    await expect(page.getByLabel('Value type')).toBeDisabled();
    await page.getByLabel(/Key/).fill('service_token_next');
    await secret.click();
    await expect(page.getByText(/This looks like a credential/)).toBeVisible();
    await page.getByLabel('Value type').selectOption('json');
    await expect(page.getByText(/Variables supplied to a run override stored environment variables/)).toBeVisible();
    await page.screenshot({ path: path.join(__dirname, 'variables-input-guidance-final.png'), fullPage: true });
    console.log('PASS variable inventory, secret metadata, history, defaults, types and precedence guidance');
  } finally {
    if (browser) await browser.close();
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
