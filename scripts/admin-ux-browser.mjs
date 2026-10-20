#!/usr/bin/env node
// Offline browser checks: synthetic identities/data only. No request can reach an external API.
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

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
const now=new Date();
const earlierTime=new Date(now.getTime()-86400000).toISOString();
const errorReport={method:'POST',path:'/api/images',errorCount:3,http5xxCount:2,http4xxCount:0,networkCount:1,timeoutCount:0,clients:['IOS'],lastSeenAt:now.toISOString(),recent:[{kind:'HTTP',status:500,client:'IOS',count:2,lastSeenAt:now.toISOString()},{kind:'NETWORK',status:null,client:'IOS',count:1,lastSeenAt:now.toISOString()}]};
const registry={declaredBaseline:{routes:[{id:'image',method:'POST',path:'/api/images',module:'content',surfaces:['app'],menuIds:['editor']}],menus:[{id:'editor',label:'검증용 사진 등록'}]},activeRoutes:[{method:'POST',path:'/api/images',module:'content'},{method:'GET',path:'/api/admin/api-registry',module:'platform'}],runtimeMetrics:[{method:'POST',path:'/api/images',status:200,requestCount:80,totalTimeMs:800},{method:'POST',path:'/api/images',status:500,requestCount:20,totalTimeMs:600}],clientErrors:{available:true,windowHours:24,windowStart:earlierTime,windowEnd:now.toISOString(),rows:[errorReport]},architecture:{servicePortCount:2,modules:[{id:'content',portCount:1,commandMethodCount:1,queryMethodCount:2,ports:[]},{id:'platform',portCount:1,commandMethodCount:1,queryMethodCount:1,ports:[]}],dependencies:[],progress:[]}};
const attempt={deliveryId:5,providerStatus:'FAILED',platform:'IOS',attemptedAt:now.toISOString(),errorCode:'SYNTHETIC_FAILURE',receivedAt:null,openedAt:null};
const release={releaseId:'r1',platform:'ANDROID',version:'2.1.0',build:'40',revision:'a'.repeat(40),createdAt:now.toISOString()};
const operations={schemaVersion:1,collectedAt:now.toISOString(),api:{...registry,routes:registry.declaredBaseline.routes,menus:registry.declaredBaseline.menus},push:{available:true,counts:[{status:'SUCCESS',count:40},{status:'FAILED',count:10}],attempts:[attempt,{...attempt,deliveryId:6,providerStatus:'SUCCESS',errorCode:null}],skips:[{reason:'NO_ACTIVE_TOKEN',category:'CHAT',count:4}]},reports:{available:true,activeFlags:3},releases:{available:true,items:[release],checks:[{eventId:'check-one',releaseId:'r1',check:'CHAT',result:'FAIL',checkedAt:now.toISOString()},{eventId:'check-two',releaseId:'r1',check:'LOGIN',result:'PASS',checkedAt:earlierTime}],workflows:[{repository:'Yusungyong/plateApp2',revision:release.revision,runId:9,workflow:'.github/workflows/mobile-ci.yml',status:'completed',conclusion:'success',attempt:1,updatedAt:now.toISOString()}]},github:{status:'CONNECTED',checkedAt:now.toISOString()}};
const report={schemaVersion:1,startedAt:now.toISOString(),baseUrl:base.origin,syntheticFixtures:true,productionCredentialsUsed:false,apiRequests:[],realMutations:0,externalRequestsSent:0,cases:[],blockedRequests:[],unexpectedRequests:[],pageErrors:[]};
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const identity=(subject='su12ng')=>({accessToken:'SYNTHETIC.'+Buffer.from(JSON.stringify({sub:subject,displayName:subject==='su12ng'?'UI 검증 운영자':'su12ng',roles:['ADMIN'],exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.NOT_A_SIGNATURE'});
async function contextFor(viewport,subject='su12ng'){
 const context=await browser.newContext({viewport,locale:'ko-KR',timezoneId:'Asia/Seoul',serviceWorkers:'block',reducedMotion:'reduce'});
 await context.addInitScript(value=>{localStorage.setItem('plate-service.auth',JSON.stringify(value));localStorage.setItem('plate-admin.pinned.su12ng',JSON.stringify(['/admin/marketing','/admin/api-registry']));},identity(subject));
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url()),method=request.method(),headers={'access-control-allow-origin':base.origin,'access-control-allow-methods':'GET, OPTIONS','access-control-allow-headers':'authorization,content-type,accept'};
  const json=value=>route.fulfill({status:200,contentType:'application/json',headers,body:JSON.stringify({success:true,data:value})});
  if(url.pathname.startsWith('/api/')){
   report.apiRequests.push({method,path:url.pathname});
   if(method==='OPTIONS')return route.fulfill({status:204,headers});
   if(method!=='GET'){report.blockedRequests.push({method,path:url.pathname});return route.fulfill({status:405,headers,contentType:'application/json',body:JSON.stringify({success:false,message:'UI harness blocks all mutations.'})});}
   if(url.pathname==='/api/admin/operations/snapshot')return json(operations);
   if(url.pathname==='/api/admin/api-registry')return json(registry);
   if(url.pathname==='/api/admin/operations/push-attempts/5')return json(attempt);
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
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>resolve())));
 await page.screenshot({path:path.join(output,name+'.png'),fullPage:true});
}
async function noOverflow(page){const bounds=await page.evaluate(()=>({width:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth}));assert(bounds.document<=bounds.width+1&&bounds.body<=bounds.width+1,'Horizontal overflow: '+JSON.stringify(bounds));return bounds;}
async function findVisible(locator){for(const item of await locator.all())if(await item.isVisible())return item;throw Error('No visible matching control.');}

try {
 for(const viewport of [{width:1440,height:1000},{width:390,height:844},{width:768,height:1024}]){
  const {context,page}=await contextFor(viewport),prefix=String(viewport.width);page.setDefaultTimeout(12000);
  await check(prefix+'-remaining-menu-overview',async()=>{
   await page.goto(base.origin+'/admin/operations');await page.getByRole('heading',{name:'오늘의 운영',exact:true}).waitFor();
   assert.equal(await page.locator('a[href="/admin/marketing"]').count(),0);await screenshot(page,prefix+'-overview');return {viewport,...await noOverflow(page)};
  });
  await check(prefix+'-menu-search-keyboard',async()=>{
   const trigger=await findVisible(page.getByRole('button',{name:'메뉴 찾기',exact:true}));await trigger.click();
   const dialog=page.getByRole('dialog',{name:'어떤 일을 할까요?'});await dialog.waitFor();const input=dialog.getByLabel('메뉴 검색');
   assert(await input.evaluate(node=>node===document.activeElement),'Menu search must receive initial focus.');
   await input.fill('API');await dialog.locator('a[href="/admin/api-registry"]').waitFor();await screenshot(page,prefix+'-menu-search');
   await input.fill('마케팅');await dialog.getByText(/일치하는 메뉴가 없어요/).waitFor();assert.equal(await dialog.locator('a[href="/admin/marketing"]').count(),0);
   await input.fill('');const focusable=dialog.locator('button:not(:disabled),input,a[href]');await focusable.last().focus();await page.keyboard.press('Tab');
   assert(await focusable.first().evaluate(node=>node===document.activeElement),'Dialog focus must wrap.');await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
   assert(await trigger.evaluate(node=>node===document.activeElement),'Closing menu must restore trigger focus.');await page.keyboard.press('Control+k');await dialog.waitFor();await page.getByRole('button',{name:'메뉴 찾기 닫기',exact:true}).click();await dialog.waitFor({state:'hidden'});return {keyboardFocus:true};
  });
  if(viewport.width<821)await check(prefix+'-mobile-drawer',async()=>{
   const trigger=page.getByRole('button',{name:'메뉴',exact:true});await trigger.click();assert.equal(await trigger.getAttribute('aria-expanded'),'true');await page.locator('#admin-sidebar').waitFor({state:'visible'});await screenshot(page,prefix+'-mobile-menu');await page.keyboard.press('Escape');assert.equal(await trigger.getAttribute('aria-expanded'),'false');assert(await trigger.evaluate(node=>node===document.activeElement));return {viewport};
  });
  await check(prefix+'-retired-admin-bookmark',async()=>{
   await page.goto(base.origin+'/admin/marketing?tab=studio#legacy');await page.getByRole('heading',{name:'대시보드',exact:true}).waitFor();assert.equal(new URL(page.url()).pathname,'/admin/dashboard');assert.equal(new URL(page.url()).search,'');assert.equal(new URL(page.url()).hash,'');return {allowedEntryPreserved:true,...await noOverflow(page)};
  });
  await check(prefix+'-retired-public-links',async()=>{
   const before=report.apiRequests.length;
   for(const retired of ['/how-to','/how-to/old-post?utm_source=instagram#old','/go/old-campaign?visit=old']){
    await page.goto(base.origin+retired);await page.getByRole('heading',{name:/오늘의 맛있는 발견/}).waitFor();const landed=new URL(page.url());assert.equal(landed.pathname,'/');assert.equal(landed.search,'');assert.equal(landed.hash,'');
    assert.equal(await page.locator('a[href="https://apps.apple.com/kr/app/id6759185760"]').count(),2);assert.equal(await page.locator('a[href="https://play.google.com/store/apps/details?id=com.plateappnew"]').count(),2);await noOverflow(page);
   }
   assert.equal(report.apiRequests.length,before,'Retired public links must not call an API.');await screenshot(page,prefix+'-legacy-home');return {oldLinks:3,storeDownloads:2};
  });
  await check(prefix+'-inert-oauth-callback',async()=>{
   const before=report.apiRequests.length;for(const callback of ['/marketing/instagram/callback/','/marketing/instagram/callback/index.html']){await page.goto(base.origin+callback+'?code=synthetic&state=synthetic#synthetic');await page.getByRole('heading',{name:'계정 연결 기능이 종료됐어요.',exact:true}).waitFor();const landed=new URL(page.url());assert.equal(landed.search,'');assert.equal(landed.hash,'');assert.equal(await page.locator('[download],button').count(),0);assert.equal(report.apiRequests.length,before);await page.getByRole('link',{name:'접시 홈으로 이동',exact:true}).waitFor();await noOverflow(page);}await screenshot(page,prefix+'-callback-retired');return {noCodeReadOrExchange:true,...await noOverflow(page)};
  });
  await context.close();
 }
 await check('other-admin-cannot-find-private-menus',async()=>{
  const {context,page}=await contextFor({width:1440,height:1000},'other-admin');await page.goto(base.origin+'/admin/marketing');await page.getByRole('heading',{name:'대시보드',exact:true}).waitFor();await(await findVisible(page.getByRole('button',{name:'메뉴 찾기',exact:true}))).click();const dialog=page.getByRole('dialog',{name:'어떤 일을 할까요?'});await dialog.waitFor();for(const target of ['/admin/marketing','/admin/api-registry','/admin/operations'])assert.equal(await dialog.locator('a[href="'+target+'"]').count(),0,'Private menu leaked: '+target);await screenshot(page,'other-admin-menu');await context.close();return {accountAliasCannotGrantAccess:true};
 });
} finally {
 await browser.close();report.finishedAt=new Date().toISOString();report.passed=report.cases.every(item=>item.passed)&&report.pageErrors.length===0&&report.unexpectedRequests.length===0&&report.blockedRequests.length===0;await writeFile(path.join(output,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,cases:report.cases.length,failures:report.cases.filter(item=>!item.passed),pageErrors:report.pageErrors,unexpectedRequests:report.unexpectedRequests,blockedRequests:report.blockedRequests,output}));if(!report.passed)process.exitCode=1;
}
