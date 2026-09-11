const { chromium, expect } = require('../../../frontend-next/node_modules/@playwright/test');
const fs = require('fs');
const path = require('path');

const project = path.resolve(__dirname, '../../..');
const frontend = path.join(project, 'frontend-next');
const fixtures = ['host-pagination-controller-review', 'host-individual-log-review'];
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
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

    await page.goto('http://localhost:5188/host-pagination-controller-review.html');
    await expect(page.getByText('26 of 26 runs match.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open log' })).toHaveCount(25);
    await page.getByRole('button', { name: 'Older runs' }).click();
    await expect(page.getByText('ERROR: Older restart failed because package lock unavailable', { exact: true }).last()).toBeVisible();
    await expect(page.getByText(/26–26 of 26|26-26 of 26/)).toBeVisible();

    await page.getByLabel('Action type').selectOption('reboot');
    await expect(page.getByText('1 of 26 runs match.')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Reboot', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await page.getByLabel('Status').selectOption('failed');
    await expect(page.getByText('1 of 26 runs match.')).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await page.getByLabel('Search action, actor or log').fill('package lock');
    await expect(page.getByText('1 of 26 runs match.')).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await page.getByLabel('From · Europe/Zurich').fill('2026-09-10');
    await page.getByLabel('Through · Europe/Zurich').fill('2026-09-10');
    await expect(page.getByText('1 of 26 runs match.')).toBeVisible();
    await expect(page.getByRole('cell', { name: /10 Sept 2026, 08:00 \(Europe\/Zurich\)/ })).toBeVisible();
    await page.screenshot({ path: path.join(__dirname, 'host-history-filters-final.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByText('Cause:')).toBeVisible();
    await page.screenshot({ path: path.join(__dirname, 'host-history-mobile-final.png'), fullPage: true });
    console.log('PASS pagination, action/status/text/date filters, failure cause and mobile layout');

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('http://localhost:5188/host-individual-log-review.html');
    await page.getByRole('button', { name: 'Open log' }).first().click();
    await expect(page.getByText('Latest individual log', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Refresh log' }).click();
    await expect(page.getByRole('alert')).toContainText('last loaded version');
    await expect(page.getByText('Latest individual log', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Refresh log' }).click();
    await expect(page.getByText('Recovered individual log', { exact: true })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await page.screenshot({ path: path.join(__dirname, 'host-history-log-final.png'), fullPage: true });
    console.log('PASS individual log load, refresh failure preservation and retry');
  } finally {
    if (browser) await browser.close();
    for (const file of temporary) if (fs.existsSync(file)) fs.unlinkSync(file);
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
