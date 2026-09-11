const { chromium, expect } = require('../../../frontend-next/node_modules/@playwright/test');
const fs = require('fs');
const path = require('path');
const project = path.resolve(__dirname, '../../..');
const frontend = path.join(project, 'frontend-next');
const temporary = path.join(frontend, 'f02-operations-fixture.html');

(async () => {
  let browser;
  try {
    if (fs.existsSync(temporary)) throw new Error(`Temporary fixture exists: ${temporary}`);
    fs.copyFileSync(path.join(__dirname, 'operations-direct-navigation-review.html'), temporary);
    browser = await chromium.launch({
      headless: true,
      executablePath: '/home/tobiasamstutz/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome',
      args: ['--no-sandbox'],
    });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.goto('http://localhost:5188/f02-operations-fixture.html');
    await expect(page.getByRole('region', { name: 'Operating status' })).toBeVisible();
    await expect(page.getByLabel('Activity from date')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open execution: Completed update' })).toBeVisible();
    await page.getByRole('button', { name: 'Show task details: Completed update' }).click();
    await expect(page.getByText('Selected execution host-1')).toBeVisible();
    await expect(page.getByText('Execution 1 · 90s')).toBeVisible();
    await page.getByText('Execution log').click();
    await expect(page.getByText('Exact log for host-1')).toBeVisible();
    await page.screenshot({ path: path.join(__dirname, 'operations-activity-final.png'), fullPage: true });
    await page.getByRole('link', { name: 'Open execution: Completed update' }).click();
    await expect(page.getByRole('heading', { name: 'Completed update' })).toBeVisible();
    await expect(page.getByText('Selected execution host-1')).toBeVisible();
    await expect(page.getByText('Exact log for host-1')).toBeVisible();
    await page.screenshot({ path: path.join(__dirname, 'operations-execution-final.png'), fullPage: true });
    console.log('PASS compact status, filters, task detail, direct execution and exact log');
  } finally {
    if (browser) await browser.close();
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
