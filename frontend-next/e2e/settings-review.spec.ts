import {test,expect,type Page} from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
const shots=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../test-results/settings-regressions');
async function signIn(page:Page){
 await page.goto('/login');
 await page.evaluate(async()=>{const credentials={username:'e2e-admin',password:'E2e-password-2026!'};let response=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(credentials)});if(!response.ok)response=await fetch('/api/auth/setup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(credentials)});const result=await response.json();if(!result.token)throw new Error('Isolated login failed');localStorage.setItem('shipyard_token',result.token);});
 await page.goto('/settings');
}
async function api(page:Page,url:string,body?:unknown,method=body?'PUT':'GET'){
 return page.evaluate(async({url,body,method})=>{const response=await fetch(`/api${url}`,{method,headers:{Authorization:`Bearer ${localStorage.getItem('shipyard_token')}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});if(!response.ok)throw new Error(`${url}: ${response.status}`);return response.json();},{url,body,method});
}
async function shot(page:Page,name:string){fs.mkdirSync(shots,{recursive:true});await page.screenshot({path:path.join(shots,`${name}.png`),fullPage:true,animations:'disabled'});}

test('manifest preserves drafts, detects concurrent changes, compares and restores history',async({page})=>{
 await signIn(page);await api(page,'/system/settings',{agentEnabled:true});await page.goto('/settings/agent-manifest');
 const editor=page.getByRole('textbox',{name:'Manifest JSON'});await expect(editor).toBeVisible();
 const first=JSON.parse(await editor.inputValue());await editor.fill(JSON.stringify({...first,interval:1}));await expect(page.getByText('Interval must be between 5 and 3600 seconds',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Save new manifest version'})).toBeDisabled();first.interval=71;await editor.fill(JSON.stringify(first,null,2));
 await page.getByRole('button',{name:'Refresh server version'}).click();await expect(editor).toHaveValue(JSON.stringify(first,null,2));
 const current=await api(page,'/v1/agent-manifest');await api(page,'/v1/agent-manifest',{content:{...current.content,interval:82},expectedVersion:current.version,changelog:'Concurrent administrator change'});
 await page.getByRole('button',{name:'Refresh server version'}).click();await expect(page.getByText('The server has a newer manifest.',{exact:false})).toBeVisible();await expect(page.getByRole('button',{name:'Save new manifest version'})).toBeDisabled();await expect(editor).toHaveValue(JSON.stringify(first,null,2));
 await shot(page,'manifest-conflict');
 page.once('dialog',dialog=>dialog.dismiss());await page.getByRole('link',{name:'System',exact:true}).click();await expect(editor).toBeVisible();
 await page.getByRole('button',{name:'Keep draft against latest version'}).click();await page.getByRole('button',{name:'Save new manifest version'}).click();await expect(page.getByRole('button',{name:'Save new manifest version'})).toBeDisabled();expect((await api(page,'/v1/agent-manifest')).content.interval).toBe(71);
 await page.getByRole('button',{name:`Load v${current.version}`,exact:true}).click();await expect(page.getByRole('textbox',{name:'Manifest changelog'})).toHaveValue(`Restore content from v${current.version}`);expect((await api(page,'/v1/agent-manifest')).content.interval).toBe(71);
 await page.getByRole('button',{name:'Discard changes',exact:true}).click();
});

test('settings drafts, explicit SMTP modes, recovery records and personal navigation',async({page})=>{
 await signIn(page);await page.goto('/settings/notifications');await page.locator('summary').filter({hasText:'Notification events'}).click();
 const events=page.getByRole('switch',{name:'Playbook failures',exact:true});await expect(events).toBeVisible();const saved=await api(page,'/system/settings');await events.click();expect((await api(page,'/system/settings')).notifPlaybookFailed).toBe(saved.notifPlaybookFailed);
 await page.getByRole('button',{name:'Discard changes',exact:true}).click();await expect(events).toHaveAttribute('aria-checked',String(saved.notifPlaybookFailed));
 await events.click();await page.getByRole('button',{name:'Save notification preferences'}).click();await expect(page.getByRole('button',{name:'Save notification preferences'})).toBeDisabled();expect((await api(page,'/system/settings')).notifPlaybookFailed).toBe(!saved.notifPlaybookFailed);
 await page.locator('summary').filter({hasText:'Email (SMTP)'}).click();await page.getByRole('combobox',{name:'SMTP transport',exact:true}).selectOption('starttls');await page.getByRole('textbox',{name:'SMTP Host',exact:true}).fill('smtp.example.invalid');await page.getByRole('button',{name:'Save email settings'}).click();await expect(page.getByRole('button',{name:'Save email settings'})).toBeDisabled();expect((await api(page,'/system/settings')).smtpSecurity).toBe('starttls');
 await shot(page,'notifications-desktop');
 await page.goto('/settings/collection');await page.getByText('Agents — configuration and affected hosts',{exact:true}).click();const enabled=(await api(page,'/system/settings')).agentEnabled;await page.getByRole('switch',{name:'Enable agent feature'}).click();expect((await api(page,'/system/settings')).agentEnabled).toBe(enabled);await expect(page.getByText('After saving:',{exact:false})).toBeVisible();await shot(page,'agent-preview');await page.getByRole('button',{name:'Discard changes',exact:true}).click();
 await page.goto('/settings/appearance');await expect(page.getByRole('switch',{name:'Show VM IDs in infrastructure tree'})).toHaveCount(0);await page.goto('/profile');await expect(page.getByRole('switch',{name:'Show VM IDs in infrastructure tree'})).toBeVisible();
 await page.goto('/settings/backup');await page.getByText('Record an external backup or recovery test',{exact:true}).click();await page.getByRole('combobox',{name:'Recovery record type'}).selectOption('recovery');await page.getByLabel('Performed at (local time)').fill('2026-01-01T12:00');await page.getByLabel('Scope',{exact:true}).fill('Isolated restore of database and application files');await page.getByLabel('Application version',{exact:true}).fill('e2e-version');await page.getByRole('button',{name:'Save record',exact:true}).click();await expect(page.getByText('Application version: e2e-version',{exact:true})).toBeVisible();await shot(page,'recovery-desktop');
 await page.setViewportSize({width:390,height:844});await page.goto('/settings/notifications');await page.locator('summary').filter({hasText:'Email (SMTP)'}).click();await expect(page.getByRole('combobox',{name:'SMTP transport',exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);await shot(page,'notifications-mobile');await page.goto('/settings/backup');await expect(page.getByRole('heading',{name:'Backup & Recovery',exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);await shot(page,'recovery-mobile');
});

test('settings structure retains direct routes and separates playbook Git work',async({page})=>{
 await signIn(page);await expect(page.getByRole('link',{name:'Collection & agents'})).toBeVisible();await expect(page.getByRole('link',{name:'Danger Zone',exact:true})).toHaveCount(0);
 await page.goto('/settings/danger');await expect(page.getByRole('button',{name:'Reset hosts, schedules, accounts and user playbooks',exact:true})).toBeVisible();
 await page.route('**/api/opentofu/status',route=>route.fulfill({json:{installed:true,version:'1.12.6',binary:'/isolated/bin/tofu',installing:false}}));await page.route('**/api/opentofu/releases',route=>route.fulfill({json:{releases:['1.13.0','1.12.6','1.9.0']}}));
 await page.goto('/settings/system');await page.getByText('Advanced: version management',{exact:true}).click();await expect(page.getByRole('combobox',{name:'Available version',exact:true})).toBeVisible();await page.getByRole('combobox',{name:'Available version',exact:true}).selectOption('1.9.0');await expect(page.getByRole('button',{name:'Downgrade OpenTofu',exact:true})).toBeVisible();await page.getByRole('combobox',{name:'Available version',exact:true}).selectOption('1.12.6');await expect(page.getByRole('button',{name:'Reinstall OpenTofu',exact:true})).toBeVisible();await page.getByRole('combobox',{name:'Available version',exact:true}).selectOption('1.13.0');await expect(page.getByRole('button',{name:'Upgrade OpenTofu',exact:true})).toBeVisible();await shot(page,'system-desktop');
 await page.goto('/playbooks#tab=git');await expect(page.getByRole('tab',{name:'Git',exact:true})).toHaveAttribute('aria-selected','true');await expect(page.getByRole('link',{name:'Playbook Git settings',exact:true})).toBeVisible();
 await page.route('**/api/plugins',route=>route.fulfill({json:[{id:'review-fixture',name:'Review fixture plugin',description:'Isolated visual fixture',version:'1.0.0',loaded:true,enabled:false,hasUi:true,trust:{digest:'a'.repeat(64),scheme:'sha256',scope:'package',trusted:false,policy:'review'}}]}));
 await page.goto('/settings/plugins');await expect(page.getByText('Allow user access',{exact:true})).toBeVisible();await expect(page.getByText('SHA-256 '+ 'a'.repeat(64),{exact:true})).not.toBeVisible();await shot(page,'plugins-desktop');await page.getByText('Technical details',{exact:true}).click();await expect(page.getByText('SHA-256 '+ 'a'.repeat(64),{exact:true})).toBeVisible();await shot(page,'plugins-details');
 for(const tab of ['appearance','ssh','users-roles','git','collection']){await page.goto(`/settings/${tab}`);await expect(page.getByRole('heading',{name:'Administration',exact:true})).toBeVisible();await shot(page,`${tab}-desktop`);}
});
