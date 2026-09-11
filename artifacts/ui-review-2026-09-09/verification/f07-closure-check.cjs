const { chromium, expect } = require('../../../frontend-next/node_modules/@playwright/test');
const fs = require('fs');
const path = require('path');
const project = path.resolve(__dirname, '../../..');
const frontend = path.join(project, 'frontend-next');
const source = path.join(__dirname, 'f07-host-overview-review.html');
const target = path.join(frontend, 'f07-host-overview-review.html');
(async () => {
  let browser;
  try {
    if (fs.existsSync(target)) throw new Error(`Temporary fixture already exists: ${target}`);
    fs.copyFileSync(source, target);
    browser = await chromium.launch({headless:true,executablePath:'/home/tobiasamstutz/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome',args:['--no-sandbox']});
    const page = await browser.newPage({viewport:{width:1440,height:1100}});
    await page.goto('http://localhost:5188/f07-host-overview-review.html');
    await expect(page.getByText('Shipyard API round-trip')).toBeVisible();
    await expect(page.getByText(/Measured 11 Sept 2026, 10:42.*Shipyard Agent/)).toBeVisible();
    await expect(page.getByLabel('Recent host capacity trends')).toBeVisible();
    await expect(page.getByRole('img',{name:/CPU recent trend, latest 38%/})).toBeVisible();
    await page.screenshot({path:path.join(__dirname,'host-overview-trends-final.png'),fullPage:true});
    await page.getByRole('tab',{name:'System'}).click();
    const table = page.getByRole('table');
    await expect(table.getByText('Mounted',{exact:true})).toBeVisible();
    await expect(table.getByText('Not mounted',{exact:true})).toBeVisible();
    await expect(table.getByText('ONLINE',{exact:true})).toBeVisible();
    await page.screenshot({path:path.join(__dirname,'host-storage-states-final.png'),fullPage:true});
    await page.setViewportSize({width:390,height:844});
    await expect(page.getByText('Not mounted',{exact:true}).first()).toBeVisible();
    await page.screenshot({path:path.join(__dirname,'host-storage-mobile-final.png'),fullPage:true});
    console.log('PASS measurement name/source/time, bounded trends, storage states, desktop and mobile');
  } finally {
    if (browser) await browser.close();
    if (fs.existsSync(target)) fs.unlinkSync(target);
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
