const { chromium, expect } = require('../../../frontend-next/node_modules/@playwright/test');
const fs = require('fs');
const path = require('path');
const project = path.resolve(__dirname, '../../..');
const frontend = path.join(project, 'frontend-next');
const temporary = path.join(frontend, 'f03-maintenance-fixture.html');

(async () => {
  let browser;
  try {
    if (fs.existsSync(temporary)) throw new Error(`Temporary fixture exists: ${temporary}`);
    fs.copyFileSync(path.join(__dirname, 'maintenance-repeat-fixture.html'), temporary);
    browser = await chromium.launch({ headless: true, executablePath: '/home/tobiasamstutz/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome', args: ['--no-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
    await page.goto('http://localhost:5188/f03-maintenance-fixture.html');
    await page.getByLabel('Name').fill('Database maintenance');
    await page.getByLabel('Repeat').selectOption('weekly');
    await page.getByText('database-01').click();
    await expect(page.locator('#maintenance-owners option[value="Database operations"]')).toHaveCount(1);
    await page.getByLabel('Owner / team').fill('Database operations');
    await page.getByLabel('Change reference').fill('CHG-2026-104');
    await page.getByLabel('Search timezones').fill('New York');
    await page.getByLabel('Timezone', { exact: true }).selectOption('America/New_York');
    await expect(page.getByText('Choose a date and time or enter it with the keyboard')).toBeVisible();
    await expect(page.getByText('Overlaps: Storage maintenance')).toBeVisible();
    await page.screenshot({ path: path.join(__dirname, 'maintenance-planning-final.png'), fullPage: true });
    console.log('PASS picker, timezone search, host/team selection, recurrence and overlap preview');
  } finally {
    if (browser) await browser.close();
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
