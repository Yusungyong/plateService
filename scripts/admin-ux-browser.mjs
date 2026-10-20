#!/usr/bin/env node
// Offline browser checks: synthetic identities/data only. No request can reach an external API.
import assert from 'node:assert/strict';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import vm from 'node:vm';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
const args=process.argv.slice(2);
const option=(name,fallback)=>{const index=args.indexOf(name);return index<0?fallback:args[index+1];};
const base=new URL(option('--base-url','http://localhost:4186'));
assert(['localhost','127.0.0.1','[::1]'].includes(base.hostname),'Only a loopback web server may be tested.');
assert(base.protocol==='http:'||base.protocol==='https:','A local HTTP URL is required.');
const output=path.resolve(option('--output',path.join(root,'output/admin-ux-browser')));
const playwright=process.env.PLATE_PLAYWRIGHT_MODULE;
const {chromium}=playwright?await import(pathToFileURL(playwright).href):require('playwright');
const {transformSync}=require('@babel/core');
const sourceFile=path.join(root,'src/admin/pages/marketingFixtures.js');
const source=await readFile(sourceFile,'utf8');
const transformed=transformSync(source,{filename:sourceFile,babelrc:false,configFile:false,plugins:[require.resolve('@babel/plugin-transform-modules-commonjs')]}).code;
const loaded={exports:{}};
vm.runInNewContext(transformed,{module:loaded,exports:loaded.exports,require:createRequire(sourceFile)},{filename:sourceFile});
const {fixture,production,CREATIVE}=loaded.exports;
const earlier='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const oldest='cccccccc-cccc-4ccc-cccc-cccccccccccc';
const now=new Date();
const earlierTime=new Date(now.getTime()-86400000).toISOString();
const oldestTime=new Date(now.getTime()-2*86400000).toISOString();
const data=fixture();
data.queue.creatives[0].created_at=now.toISOString();
data.queue.creatives[0].tokenUsage={input_tokens:1200,output_tokens:680};
data.queue.creatives.push({...data.queue.creatives[0],id:earlier,created_at:earlierTime,state:'READY_FOR_PUBLISHING'}, {...data.queue.creatives[0],id:oldest,created_at:oldestTime,state:'REJECTED'});
data.queue.jobs=[{id:CREATIVE,job_key:'ui-example-today',campaign_id:data.queue.campaigns[0].id,status:'SUCCEEDED',not_before:now.toISOString(),created_at:now.toISOString()}];
data.queue.events=[{id:'synthetic-review',created_at:now.toISOString(),event:'PRODUCTION_REVIEWED',reason:'화면 검증용 예시 기록입니다.',actor:'synthetic-operator'}, {id:'synthetic-generated',created_at:earlierTime,event:'JOB_SUCCEEDED',reason:'예시 제작물이 준비됐어요.',actor:'synthetic-worker'}];
data.publishing.runtimeEnabled=true;
data.publishing.control.paused=false;
data.publishing.accounts=[{channel:'WEBSITE',state:'VERIFIED'}, {channel:'INSTAGRAM',username:'plate_ui_example',state:'VERIFIED',profile_landing_confirmed:true,token_expires_at:new Date(now.getTime()+30*86400000).toISOString()}];
data.publishing.posts=[{id:'dddddddd-dddd-4ddd-dddd-dddddddddddd',title:'예시: 사진과 식당 이름을 함께',channel:'WEBSITE',state:'PUBLISHED',due_at:earlierTime,permalink:'https://plate-service.com/how-to/synthetic-ui-example'}];
data.workerChecks=[{kind:'GENERATOR',state:'READY',observedAt:now.toISOString(),reason:'USAGE_CHECK_PASSED',primaryPercent:18,secondaryPercent:12},{kind:'PUBLISHER',state:'READY',observedAt:now.toISOString(),reason:'ACCOUNT_CHECK_PASSED'}];

const report={schemaVersion:1,startedAt:now.toISOString(),baseUrl:base.origin,syntheticFixtures:true,productionCredentialsUsed:false,realMutations:0,externalRequestsSent:0,cases:[],blockedRequests:[],unexpectedRequests:[],pageErrors:[]};
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const identity=(subject='su12ng')=>({accessToken:'SYNTHETIC.'+Buffer.from(JSON.stringify({sub:subject,displayName:subject==='su12ng'?'UI 검증 운영자':'su12ng',roles:['ADMIN'],exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.NOT_A_SIGNATURE'});
const previewPage=await browser.newPage({viewport:{width:1080,height:1350}});
await previewPage.setContent('<html lang="ko"><style>*{box-sizing:border-box}body{margin:0;background:#fff4e9;color:#392c26;padding:90px;font-family:Arial,sans-serif}small{font-size:24px;color:#986957}h1{font-size:78px;line-height:1.25;margin:70px 0 50px}p{font-size:35px;line-height:1.6}.photo{height:570px;border-radius:36px;background:#f5b67f;display:grid;place-items:center;font-size:150px}.label{padding-top:42px;color:#6d5545}</style><small>접시 · UI 검증용 예시</small><h1>사진에 식당 이름도<br>함께 남겨요.</h1><div class="photo">🍜</div><p class="label">테스트 이미지입니다.<br>실제 게시물이 아닙니다.</p></html>');
const preview=await previewPage.screenshot({type:'jpeg',quality:85});
await previewPage.close();

async function contextFor(viewport,subject='su12ng'){
 const context=await browser.newContext({viewport,locale:'ko-KR',timezoneId:'Asia/Seoul',serviceWorkers:'block',reducedMotion:'reduce'});
 await context.addInitScript(value=>localStorage.setItem('plate-service.auth',JSON.stringify(value)),identity(subject));
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url()),method=request.method(),headers={'access-control-allow-origin':base.origin,'access-control-allow-methods':'GET, OPTIONS','access-control-allow-headers':'authorization,content-type,accept'};
  const json=value=>route.fulfill({status:200,contentType:'application/json',headers,body:JSON.stringify({success:true,data:value})});
  if(url.pathname.startsWith('/api/')){
   if(method==='OPTIONS')return route.fulfill({status:204,headers});
   if(method!=='GET'){report.blockedRequests.push({method,path:url.pathname});return route.fulfill({status:405,headers,contentType:'application/json',body:JSON.stringify({success:false,message:'UI harness blocks all mutations.'})});}
   if(url.pathname==='/api/admin/marketing/console')return json(data);
   if(url.pathname==='/api/admin/marketing/console/recurring-status')return json({reports:[{state:'READY',stale:false,generation_time:'09:00',publish_time:'19:30',weekly_time:'10:00',observed_at:now.toISOString(),weekly_published:1,weekly_unknown:0}]});
   if(/^\/api\/admin\/marketing\/creatives\/[^/]+\/production$/.test(url.pathname)){
    const item=production();
    if(url.pathname.includes(earlier)){item.state='READY_FOR_PUBLISHING';item.production.state='READY_FOR_PUBLISHING';}
    if(url.pathname.includes(oldest)){item.state='REJECTED';item.production.state='REJECTED';}
    item.production.reviews=[{at:earlierTime,decision:'APPROVE',reason:'UI 검증용 합성 기록입니다.'}];
    return json(item);
   }
   if(/^\/api\/admin\/marketing\/console\/creatives\/[^/]+\/previews\/[ab]$/.test(url.pathname))return route.fulfill({status:200,contentType:'image/jpeg',headers,body:preview});
   if(url.pathname.startsWith('/api/admin/marketing/measurement/'))return json({collectionState:'DISABLED',groups:[]});
   if(url.pathname==='/api/admin/dashboard/summary')return json({metrics:[]});
   if(['/api/admin/dashboard/activity-trends','/api/admin/dashboard/region-distribution','/api/admin/operations/reviews'].includes(url.pathname))return json([]);
   if(url.pathname==='/api/admin/activities')return json({content:[],hasNext:false});
   report.unexpectedRequests.push({method,path:url.pathname});
   return route.fulfill({status:404,headers,contentType:'application/json',body:JSON.stringify({success:false,message:'No synthetic fixture registered.'})});
  }
  if(url.origin===base.origin)return route.continue();
  if(url.protocol==='data:'||url.protocol==='blob:')return route.continue();
  report.blockedRequests.push({method,path:url.pathname,host:url.hostname});
  return route.abort('blockedbyclient');
 });
 if(context.routeWebSocket)await context.routeWebSocket(/.*/,socket=>{const url=new URL(socket.url());if(url.hostname===base.hostname&&url.port===base.port)socket.connectToServer();else{report.blockedRequests.push({method:'WEBSOCKET',host:url.hostname,path:url.pathname});socket.close();}});
 const page=await context.newPage();
 page.on('pageerror',error=>report.pageErrors.push(error.message));
 return {context,page};
}
async function check(name,fn){try{const details=await fn();report.cases.push({name,passed:true,...details});}catch(error){report.cases.push({name,passed:false,error:error.message});}}
async function screenshot(page,name){
 // Reset before a full-page capture so fixed elements above the viewport do not
 // appear midway down the image after Playwright scrolls to a clicked control.
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>resolve())));
 await page.screenshot({path:path.join(output,name+'.png'),fullPage:true});
}
async function noOverflow(page){const bounds=await page.evaluate(()=>({width:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth}));assert(bounds.document<=bounds.width+1&&bounds.body<=bounds.width+1,'Horizontal overflow: '+JSON.stringify(bounds));return bounds;}
async function findVisible(locator){for(const item of await locator.all())if(await item.isVisible())return item;throw Error('No visible matching control.');}

try{
 for(const viewport of [{width:1440,height:1000},{width:390,height:844},{width:768,height:1024}]){
  const {context,page}=await contextFor(viewport),prefix=String(viewport.width);
  page.setDefaultTimeout(12000);
  await check(prefix+'-overview',async()=>{
   await page.goto(base.origin+'/admin/marketing?tab=overview');
   await page.getByText('오늘 확인할 일',{exact:true}).waitFor();
   await page.getByRole('tab',{name:'오늘',exact:true}).waitFor();
   assert.equal(await page.locator('.mk-preview').count(),0,'Overview must not eagerly render private cards.');
   await screenshot(page,prefix+'-overview');return {viewport,...await noOverflow(page)};
  });
  await check(prefix+'-menu-search-keyboard',async()=>{
   const trigger=await findVisible(page.getByRole('button',{name:'메뉴 찾기',exact:true}));
   await trigger.click();
   const dialog=page.getByRole('dialog',{name:'어떤 일을 할까요?'});
   await dialog.waitFor();
   const input=dialog.getByLabel('메뉴 검색');
   assert(await input.evaluate(node=>node===document.activeElement),'Menu search must receive initial focus.');
   await input.fill('홍보');
   await dialog.locator('a[href="/admin/marketing"]').waitFor();
   await screenshot(page,prefix+'-menu-search');
   await input.fill('없는메뉴검증');
   await dialog.getByText(/일치하는 메뉴가 없어요/).waitFor();
   await input.fill('');
   const focusable=dialog.locator('button:not(:disabled),input,a[href]');
   await focusable.last().focus();await page.keyboard.press('Tab');
   assert(await focusable.first().evaluate(node=>node===document.activeElement),'Dialog focus must wrap.');
   await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
   assert(await trigger.evaluate(node=>node===document.activeElement),'Closing menu must restore trigger focus.');
   await page.keyboard.press('Control+k');await dialog.waitFor();
   await page.getByRole('button',{name:'메뉴 찾기 닫기',exact:true}).click();
   await dialog.waitFor({state:'hidden'});return {keyboardFocus:true};
  });
  if(viewport.width<821)await check(prefix+'-mobile-drawer',async()=>{
   const trigger=page.getByRole('button',{name:'메뉴',exact:true});await trigger.click();
   assert.equal(await trigger.getAttribute('aria-expanded'),'true');
   const sidebar=page.locator('#admin-sidebar');await sidebar.waitFor({state:'visible'});
   await screenshot(page,prefix+'-mobile-menu');
   await page.keyboard.press('Escape');
   assert.equal(await trigger.getAttribute('aria-expanded'),'false');
   assert(await trigger.evaluate(node=>node===document.activeElement),'Drawer must return focus to the opener.');
   return {viewport};
  });
  await check(prefix+'-studio',async()=>{
   await page.getByRole('tab',{name:'제작물',exact:true}).click();
   await page.getByRole('img',{name:'현재 A안 홍보 카드',exact:true}).waitFor();
   const stateFilter=page.getByLabel('제작 상태');await stateFilter.selectOption('ready');
   await page.getByRole('img',{name:'현재 A안 홍보 카드',exact:true}).waitFor();
   await stateFilter.selectOption('all');
   const search=page.getByLabel('제작물 검색');await search.fill('없는제작물검증');
   await screenshot(page,prefix+'-studio-empty-search');
   await search.fill('');
   await page.getByRole('button',{name:'B안',exact:true}).click();
   await page.getByRole('img',{name:'현재 B안 홍보 카드',exact:true}).waitFor();
   await page.getByRole('button',{name:'나란히 비교',exact:true}).click();
   await page.getByRole('img',{name:'현재 A안 홍보 카드',exact:true}).waitFor();
   await page.getByRole('img',{name:'현재 B안 홍보 카드',exact:true}).waitFor();
   await screenshot(page,prefix+'-studio-compare');
   await page.getByRole('button',{name:'A안',exact:true}).click();
   await screenshot(page,prefix+'-studio');return {viewport,...await noOverflow(page)};
  });
  await check(prefix+'-history',async()=>{
   await page.getByRole('tab',{name:'이력',exact:true}).click();
   await page.getByRole('heading',{name:'작업·변경 이력',exact:true}).waitFor();
   await page.getByText('화면 검증용 예시 기록입니다.',{exact:true}).waitFor();
   await screenshot(page,prefix+'-history');return {viewport,...await noOverflow(page)};
  });
  await context.close();
 }
 await check('other-admin-cannot-find-private-menus',async()=>{
  const {context,page}=await contextFor({width:1440,height:1000},'other-admin');
  await page.goto(base.origin+'/admin/dashboard');await page.getByRole('heading',{name:'대시보드',exact:true}).waitFor();
  await (await findVisible(page.getByRole('button',{name:'메뉴 찾기',exact:true}))).click();
  const dialog=page.getByRole('dialog',{name:'어떤 일을 할까요?'});await dialog.waitFor();
  for(const target of ['/admin/marketing','/admin/api-registry','/admin/operations'])assert.equal(await dialog.locator('a[href="'+target+'"]').count(),0,'Private menu leaked: '+target);
  await screenshot(page,'other-admin-menu');await context.close();return {accountAliasCannotGrantAccess:true};
 });
}finally{
 await browser.close();
 report.finishedAt=new Date().toISOString();
 report.passed=report.cases.every(item=>item.passed)&&report.pageErrors.length===0&&report.unexpectedRequests.length===0&&report.blockedRequests.length===0;
 await writeFile(path.join(output,'verification.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({passed:report.passed,cases:report.cases.length,failures:report.cases.filter(item=>!item.passed),pageErrors:report.pageErrors,unexpectedRequests:report.unexpectedRequests,blockedRequests:report.blockedRequests,output}));
 if(!report.passed)process.exitCode=1;
}
