const {chromium,expect}=require('../../../frontend-next/node_modules/@playwright/test');
const fs=require('fs');const path=require('path');const project=path.resolve(__dirname,'../../..');const frontend=path.join(project,'frontend-next');const temporary=path.join(frontend,'f23-proxmox-updates.html');
(async()=>{let browser;try{
 fs.copyFileSync(path.join(__dirname,'f23-proxmox-updates.html'),temporary);
 browser=await chromium.launch({headless:true,executablePath:'/home/tobiasamstutz/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome',args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1280,height:900}});page.on('pageerror',error=>console.error('PAGE',error));
 await page.goto('http://localhost:5188/f23-proxmox-updates.html');
 await expect(page.getByText('Operational impact')).toBeVisible();await expect(page.getByText(/CHG-104/)).toBeVisible();await expect(page.getByRole('link',{name:'Package release information'})).toHaveCount(2);await expect(page.getByRole('link',{name:'Review maintenance'})).toBeVisible();
 await page.screenshot({path:path.join(__dirname,'proxmox-updates-final.png'),fullPage:true});console.log('PASS package impact, release information and maintenance context');
}finally{if(browser)await browser.close();if(fs.existsSync(temporary))fs.unlinkSync(temporary);}})().catch(e=>{console.error(e);process.exitCode=1});
