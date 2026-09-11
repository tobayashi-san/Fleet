const { chromium, expect } = require('../../../frontend-next/node_modules/@playwright/test');
const fs = require('fs');
const path = require('path');
const project = path.resolve(__dirname, '../../..');
const frontend = path.join(project, 'frontend-next');
const temporary = path.join(frontend, 'f04-audit-download.html');

(async () => {
  let browser;
  try {
    if (fs.existsSync(temporary)) throw new Error(`Temporary fixture exists: ${temporary}`);
    fs.copyFileSync(path.join(__dirname, 'audit-download-review.html'), temporary);
    browser = await chromium.launch({ headless: true, executablePath: '/home/tobiasamstutz/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome', args: ['--no-sandbox'] });
    const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1200, height: 900 } });
    const page = await context.newPage();
    await page.goto('http://localhost:5188/f04-audit-download.html');
    await expect(page.getByText('1 entry total')).toBeVisible();
    await page.getByText('Export and retention policy').click();
    await expect(page.getByText(/up to 10,000 entries/)).toBeVisible();
    await expect(page.getByText(/older than 90 days/)).toBeVisible();
    await page.screenshot({ path: path.join(__dirname, 'audit-export-policy-final.png'), fullPage: true });
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('fleet-audit-log.csv');
    const savedPath = await download.path();
    const content = fs.readFileSync(savedPath, 'utf8');
    expect(content).toContain('SHIPYARD-AUDIT-DOWNLOAD-VERIFIED');
    expect(content).toContain('server.update');
    console.log(`PASS browser download ${download.suggestedFilename()} (${Buffer.byteLength(content)} bytes)`);
  } finally {
    if (browser) await browser.close();
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
