import { expect, test, type Page } from '@playwright/test';

async function setup(page: Page) {
  await page.goto('/login');
  await page.evaluate(async () => {
    const body = JSON.stringify({username:'e2e-admin',password:'E2e-password-2026!'});
    let response = await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body});
    if (!response.ok) response = await fetch('/api/auth/setup',{method:'POST',headers:{'Content-Type':'application/json'},body});
    localStorage.setItem('fleet_token',(await response.json()).token);
  });
  const calls: {path:string;method:string;body:unknown}[] = [];
  let notes = {notes:'',revision:0,author:null as string|null,updated_at:null as string|null};
  await page.route('**/api/opentofu/managed-servers/refactor-host', route => route.fulfill({json:{resources:[]}}));
  await page.route('**/api/servers/refactor-host{,/**}', route => {
    const request = route.request();
    const url = new URL(request.url());
    calls.push({path:url.pathname+url.search,method:request.method(),body:request.postDataJSON()});
    const suffix = url.pathname.replace('/api/servers/refactor-host','');
    let json: unknown = [];
    if (!suffix) json = {id:'refactor-host',name:'Refactor host',hostname:'host.example',ip_address:'192.0.2.20',status:'online',docker_enabled:true};
    if (suffix === '/info') json = {hostname:'host.example',os:'Debian',reboot_required:false};
    if (suffix === '/notes') {
      if (request.method() === 'PUT') {
        const body = request.postDataJSON();
        if (body.revision !== notes.revision) return route.fulfill({status:409,json:{error:'Notes changed elsewhere'}});
        notes = {notes:body.notes,revision:notes.revision+1,author:'e2e-admin',updated_at:new Date().toISOString()};
      }
      json = notes;
    }
    if (suffix === '/history') json = {items:[],actions:[],total_unfiltered:0,pagination:{page:1,total:0,total_pages:1}};
    if (suffix === '/updates') json = {updates:url.searchParams.has('force')?[{package:'verified-package',current_version:'1',version:'2'}]:[],source:'apt',updated_at:new Date().toISOString(),cached:false,stale:false,stale_after_seconds:900};
    if (suffix === '/docker') json = [{container_name:'web',image:'nginx:latest',state:'running',status:'Up 1 hour',cpu_percent:1,memory_usage:'1 MiB'}];
    if (suffix === '/docker/image-updates/cached') json = {results:[],updated_at:new Date().toISOString()};
    if (suffix === '/docker/web/logs') json = {logs:'first line\nsecond line'};
    return route.fulfill({json});
  });
  return calls;
}

test('host notes, package checks and container logs keep their own state and requests', async ({page}) => {
  const calls = await setup(page);
  await page.goto('/servers/refactor-host#tab=notes');
  await page.getByRole('button',{name:'Create host notes'}).click();
  await page.getByRole('textbox',{name:'Host notes Markdown'}).fill('# Runbook\nSaved by browser test');
  await page.getByRole('tab',{name:'Updates',exact:true}).click();
  await page.getByRole('button',{name:'Check for updates',exact:true}).click();
  await expect(page.getByText('verified-package',{exact:true})).toBeVisible();
  await page.getByRole('tab',{name:'Notes',exact:true}).click();
  await expect(page.getByRole('textbox',{name:'Host notes Markdown'})).toHaveValue('# Runbook\nSaved by browser test');
  await page.getByRole('button',{name:'Save notes'}).click();
  await expect(page.getByText('No unsaved changes',{exact:true})).toBeVisible();
  expect(calls.find(call => call.path.endsWith('/notes') && call.method === 'PUT')?.body).toEqual({notes:'# Runbook\nSaved by browser test',revision:0});
  await page.getByRole('tab',{name:'Workloads',exact:true}).click();
  await page.getByRole('button',{name:'Show logs',exact:true}).click();
  await expect(page.getByRole('region',{name:'Container log'})).toContainText('first line\nsecond line');
  expect(calls.some(call => call.path.endsWith('/docker/web/logs?tail=200'))).toBe(true);
  expect(calls.filter(call => call.method === 'POST')).toEqual([]);
});

test('a limited host role does not load or expose denied feature data', async ({page}) => {
  const calls = await setup(page);
  await page.route('**/api/auth/profile', async route => {
    const response = await route.fetch();
    await route.fulfill({json:{...await response.json(),role:'viewer',permissions:{canViewServers:true,canViewNotes:true,servers:'all'}}});
  });
  await page.goto('/servers/refactor-host');
  await expect(page.getByRole('tablist',{name:'Host sections'}).getByRole('tab')).toHaveText(['Overview','Snapshots','Notes']);
  await page.getByRole('tab',{name:'Notes',exact:true}).click();
  await expect(page.getByRole('button',{name:'Create host notes'})).toHaveCount(0);
  expect(calls.filter(call => /\/(updates|docker|history|custom-update-tasks|files)(?:[/?]|$)/.test(call.path))).toEqual([]);
});
