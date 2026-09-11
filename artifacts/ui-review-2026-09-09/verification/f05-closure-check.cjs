const { chromium, expect } = require('../../../frontend-next/node_modules/@playwright/test');
const fs = require('fs');
const path = require('path');
const project = path.resolve(__dirname, '../../..');
const frontend = path.join(project, 'frontend-next');
const source = path.join(__dirname, 'f05-host-inventory-review.html');
const target = path.join(frontend, 'f05-host-inventory-review.html');

(async () => {
  let browser;
  try {
    if (fs.existsSync(target)) throw Error('Temporary fixture exists');
    fs.copyFileSync(source, target);
    browser = await chromium.launch({ headless: true, executablePath: '/home/tobiasamstutz/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome', args: ['--no-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.goto('http://localhost:5188/f05-host-inventory-review.html');
    const table = page.getByRole('table');
    await expect(page.getByRole('columnheader', { name: 'Operating state' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Last contact' })).toBeVisible();
    await expect(table.getByText('OS: 3')).toBeVisible();
    await expect(table.getByText('Images: 1')).toBeVisible();
    await page.getByRole('button', { name: 'Resource options' }).click();
    await page.getByText('Show owner column').click();
    await expect(page.getByRole('columnheader', { name: 'Owner / team' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Platform Operations' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Not assigned' })).toBeVisible();
    await table.getByLabel('Select Production API').check();
    await table.getByLabel('Select Background Worker').check();
    await expect(page.getByText('2 hosts selected', { exact: true })).toBeVisible();
    await page.getByText('Review 2 selected hosts').click();
    await expect(page.getByText(/2 on this page · 0 on other pages · 0 outside current filters/)).toBeVisible();
    await page.screenshot({ path: path.join(__dirname, 'host-inventory-columns-bulk-final.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    const mobileCard = page.getByLabel('Select Production API').last().locator('xpath=ancestor::div[contains(@class,"px-4")][1]');
    await expect(mobileCard).toContainText('Owner / team');
    await expect(mobileCard).toContainText('Platform Operations');
    await page.screenshot({ path: path.join(__dirname, 'host-inventory-mobile-final.png'), fullPage: true });
    console.log('PASS optional operating/contact/owner columns and explicit bulk scope on desktop/mobile');
  } finally {
    if (browser) await browser.close();
    if (fs.existsSync(target)) fs.unlinkSync(target);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
