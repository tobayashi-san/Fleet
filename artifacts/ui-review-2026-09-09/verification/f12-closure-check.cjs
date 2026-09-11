const { chromium, expect } = require('../../../frontend-next/node_modules/@playwright/test');
const fs = require('fs');
const path = require('path');
const project = path.resolve(__dirname, '../../..');
const frontend = path.join(project, 'frontend-next');
const names = ['files-fixture', 'terminal-frame-fixture'];
const temporary = [];

(async () => {
  let browser;
  try {
    for (const name of names) {
      const target = path.join(frontend, `${name}.html`);
      if (fs.existsSync(target)) throw Error(`Temporary fixture exists: ${target}`);
      fs.copyFileSync(path.join(__dirname, `${name}.html`), target);
      temporary.push(target);
    }
    browser = await chromium.launch({ headless: true, executablePath: '/home/tobiasamstutz/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome', args: ['--no-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

    await page.goto('http://localhost:5188/files-fixture.html');
    await expect(page.getByText('5 of 5 entries shown · 2 hidden entries.')).toBeVisible();
    await page.getByRole('switch', { name: 'Show hidden files' }).click();
    await expect(page.getByText('3 of 5 entries shown · 2 hidden entries.')).toBeVisible();
    await page.getByLabel('Search this directory').fill('report10');
    await expect(page.getByText('1 of 5 entries shown · 2 hidden entries.')).toBeVisible();
    await expect(page.getByText('report10.txt')).toBeVisible();
    await expect(page.getByText('report2.txt')).toBeHidden();
    await page.getByText('Understanding file modes').click();
    await expect(page.getByText(/read = 4, write = 2, execute = 1/)).toBeVisible();
    await expect(page.getByLabel(/644\./)).toHaveAttribute('title', /Owner:/);
    await page.screenshot({ path: path.join(__dirname, 'files-filter-mode-final.png'), fullPage: true });

    await page.goto('http://localhost:5188/terminal-frame-fixture.html');
    await expect(page.getByText(/Connected as operator/)).toBeVisible();
    await expect(page.getByText(/Connected duration/)).toBeVisible();
    await page.getByText('Session and audit policy').click();
    await expect(page.getByText(/Connection and disconnection metadata are recorded/)).toBeVisible();
    await expect(page.getByText(/Idle limit: 30 minutes/)).toBeVisible();
    await page.getByRole('button', { name: 'Expand terminal' }).click();
    await expect(page.getByRole('button', { name: 'Restore size' })).toBeVisible();
    await page.getByLabel('Search terminal buffer').fill('application data only');
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByRole('status').filter({ hasText: /1 of 1 matches/ })).toBeVisible();
    await page.screenshot({ path: path.join(__dirname, 'terminal-session-audit-search-final.png'), fullPage: true });
    await page.getByRole('button', { name: 'Simulate idle expiry' }).click();
    await expect(page.getByText('Terminal disconnected')).toBeVisible();
    await expect(page.getByRole('paragraph').filter({ hasText: /configured period without terminal input/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ctrl+C' })).toBeDisabled();
    await page.screenshot({ path: path.join(__dirname, 'terminal-expiry-final.png'), fullPage: true });
    console.log('PASS file filters/mode help and terminal duration/audit/search/expiry');
  } finally {
    if (browser) await browser.close();
    for (const file of temporary) if (fs.existsSync(file)) fs.unlinkSync(file);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
