const { chromium, expect } = require('../../../frontend-next/node_modules/@playwright/test');
const fs = require('fs');
const path = require('path');

const project = path.resolve(__dirname, '../../..');
const frontend = path.join(project, 'frontend-next');
const fixtures = [
  'dashboard-image-stale-review',
  'dashboard-custom-stale-review',
  'dashboard-unknown-review',
  'image-summary-navigation-review',
  'custom-summary-navigation-review',
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
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

    await page.goto('http://localhost:5188/dashboard-image-stale-review.html');
    await expect(page.getByText(/Update checks are missing or stale for 1 host/)).toBeVisible();
    await page.screenshot({ path: path.join(__dirname, 'dashboard-image-stale-final.png'), fullPage: true });
    await page.getByRole('button', { name: 'Mark catalog freshly checked' }).click();
    await expect(page.getByText(/Update checks are missing or stale for 1 host/)).toHaveCount(0);

    await page.goto('http://localhost:5188/dashboard-custom-stale-review.html');
    await expect(page.getByText(/Update checks are missing or stale for 1 host/)).toBeVisible();
    await page.getByRole('button', { name: 'Mark catalog freshly checked' }).click();
    await expect(page.getByText(/Update checks are missing or stale for 1 host/)).toHaveCount(0);

    await page.goto('http://localhost:5188/dashboard-unknown-review.html');
    await expect(page.getByText(/Update checks are missing or stale for 1 host/)).toBeVisible();
    console.log('PASS dashboard preserves missing/stale OS, image and custom states');

    await page.goto('http://localhost:5188/image-summary-navigation-review.html');
    await expect(page.getByText('2 image updates · Image counts differ: catalog 1, inventory 2; refresh both sources')).toBeVisible();
    await page.getByRole('tab', { name: 'Workloads' }).click();
    await expect(page.getByText('Update available', { exact: true })).toBeVisible();
    await expect(page.getByText(/Registry digest comparison over SSH/)).toBeVisible();
    await expect(page.getByText(/11 Sept 2026, 10:00 \(Europe\/Zurich\)/)).toBeVisible();
    await page.screenshot({ path: path.join(__dirname, 'image-catalog-consistency-final.png'), fullPage: true });
    console.log('PASS image count discrepancy, source, collection time and detail status');

    await page.goto('http://localhost:5188/custom-summary-navigation-review.html');
    await expect(page.getByText(/1 custom updates/)).toBeVisible();
    await expect(page.getByText(/Custom check missing or stale/)).toBeVisible();
    await expect(page.getByText(/Custom update check failed/)).toBeVisible();
    await page.getByRole('tab', { name: 'Updates' }).click();
    await expect(page.getByText('Release endpoint unavailable')).toBeVisible();
    await expect(page.getByText(/Last successful check: 11 Sept 2026, 10:00 \(Europe\/Zurich\)/)).toBeVisible();
    await expect(page.getByText(/Command check over SSH/)).toBeVisible();
    await page.screenshot({ path: path.join(__dirname, 'custom-catalog-consistency-final.png'), fullPage: true });
    console.log('PASS custom count, failed/stale state, source and timestamps');
  } finally {
    if (browser) await browser.close();
    for (const file of temporary) if (fs.existsSync(file)) fs.unlinkSync(file);
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
