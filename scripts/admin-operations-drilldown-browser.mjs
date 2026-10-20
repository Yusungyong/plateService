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
const output=path.resolve(option('--output',path.join(root,'output/admin-operations-drilldown-browser')));
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

data.queue.jobs.push({id:'job-unknown',job_key:'검증용 결과 미확인 생성',status:'UNKNOWN',campaign_id:data.queue.campaigns[0].id,not_before:now.toISOString(),started_at:now.toISOString()},{id:'job-queued',job_key:'검증용 대기 생성',status:'QUEUED',not_before:now.toISOString()});
data.publishing.posts.push({id:'post-unknown',title:'검증용 결과 미확인 게시',state:'UNKNOWN',channel:'INSTAGRAM',due_at:now.toISOString()},{id:'post-queued',title:'검증용 예약 게시',state:'QUEUED',channel:'WEBSITE',due_at:new Date(now.getTime()+86400000).toISOString()});
const errorReport={method:'POST',path:'/api/images',errorCount:3,http5xxCount:2,http4xxCount:0,networkCount:1,timeoutCount:0,clients:['IOS'],lastSeenAt:now.toISOString(),recent:[{kind:'HTTP',status:500,client:'IOS',count:2,lastSeenAt:now.toISOString()},{kind:'NETWORK',status:null,client:'IOS',count:1,lastSeenAt:now.toISOString()}]};
const registry={declaredBaseline:{routes:[{id:'image',method:'POST',path:'/api/images',module:'content',surfaces:['app'],menuIds:['editor']}],menus:[{id:'editor',label:'검증용 사진 등록'}]},activeRoutes:[{method:'POST',path:'/api/images',module:'content'},{method:'GET',path:'/api/admin/api-registry',module:'platform'}],runtimeMetrics:[{method:'POST',path:'/api/images',status:200,requestCount:80,totalTimeMs:800},{method:'POST',path:'/api/images',status:500,requestCount:20,totalTimeMs:600}],clientErrors:{available:true,windowHours:24,windowStart:earlierTime,windowEnd:now.toISOString(),rows:[errorReport]},architecture:{servicePortCount:2,modules:[{id:'content',portCount:1,commandMethodCount:1,queryMethodCount:2,ports:[]},{id:'platform',portCount:1,commandMethodCount:1,queryMethodCount:1,ports:[]}],dependencies:[],progress:[]}};
const attempt={deliveryId:5,providerStatus:'FAILED',platform:'IOS',attemptedAt:now.toISOString(),errorCode:'SYNTHETIC_FAILURE',receivedAt:null,openedAt:null};
const release={releaseId:'r1',platform:'ANDROID',version:'2.1.0',build:'40',revision:'a'.repeat(40),createdAt:now.toISOString()};
const operations={schemaVersion:1,collectedAt:now.toISOString(),api:{...registry,routes:registry.declaredBaseline.routes,menus:registry.declaredBaseline.menus},push:{available:true,counts:[{status:'SUCCESS',count:40},{status:'FAILED',count:10}],attempts:[attempt,{...attempt,deliveryId:6,providerStatus:'SUCCESS',errorCode:null}],skips:[{reason:'NO_ACTIVE_TOKEN',category:'CHAT',count:4}]},reports:{available:true,activeFlags:3},releases:{available:true,items:[release],checks:[{eventId:'check-one',releaseId:'r1',check:'CHAT',result:'FAIL',checkedAt:now.toISOString()},{eventId:'check-two',releaseId:'r1',check:'LOGIN',result:'PASS',checkedAt:earlierTime}],workflows:[{repository:'Yusungyong/plateApp2',revision:release.revision,runId:9,workflow:'.github/workflows/mobile-ci.yml',status:'completed',conclusion:'success',attempt:1,updatedAt:now.toISOString()}]},github:{status:'CONNECTED',checkedAt:now.toISOString()}};
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
   if(url.pathname==='/api/admin/operations/snapshot')return json(operations);
   if(url.pathname==='/api/admin/api-registry')return json(registry);
   if(url.pathname==='/api/admin/operations/push-attempts/5')return json(attempt);
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
  await check(prefix+'-operations-home',async()=>{
   await page.goto(base.origin+'/admin/operations');await page.getByRole('heading',{name:'오늘의 운영',exact:true}).waitFor();await page.getByRole('link',{name:/서버 응답 실패율/}).click();
   const evidence=page.getByRole('region',{name:'운영 지표 근거'});await evidence.waitFor();assert.equal(await evidence.getByRole('cell',{name:'500',exact:true}).count(),1);assert.equal(await evidence.getByRole('cell',{name:'200',exact:true}).count(),0);
   await page.getByRole('button',{name:'POST /api/images 응답 500 근거 보기',exact:true}).click();assert(page.url().includes('response=500'));assert.equal(await evidence.getByRole('row').count(),2);await page.goBack();await evidence.getByRole('cell',{name:'500',exact:true}).waitFor();assert(!page.url().includes('response='));await screenshot(page,prefix+'-home-evidence');return {viewport,...await noOverflow(page)};
  });
  await check(prefix+'-incidents',async()=>{
   await page.goto(base.origin+'/admin/operations/incidents?view=push');await page.getByRole('button',{name:'전송 실패 10건 →',exact:true}).click();await page.getByText('조회된 2건 중 1건',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'전송 #6 보기',exact:true}).count(),0);
   await page.getByRole('button',{name:'전송 #5 보기',exact:true}).click();await page.getByRole('button',{name:'기기 수신 근거 보기',exact:true}).click();await page.getByText('선택 단계: 기기 수신',{exact:true}).waitFor();await screenshot(page,prefix+'-push-evidence');await noOverflow(page);
   await page.getByRole('button',{name:'API 오류',exact:true}).click();await page.getByRole('combobox',{name:/오류 유형/}).selectOption('networkCount');await page.getByRole('button',{name:'오류 보기',exact:true}).click();await page.getByRole('link',{name:'API 관계도에서 보기 →',exact:true}).waitFor();await screenshot(page,prefix+'-api-incident');return {viewport,...await noOverflow(page)};
  });
  await check(prefix+'-releases',async()=>{
   await page.goto(base.origin+'/admin/operations/releases');await page.getByRole('button',{name:'자동 검증 근거 보기',exact:true}).click();await page.getByRole('link',{name:'success 실행 로그 보기',exact:true}).waitFor();assert(page.url().includes('evidence=ci'));
   await page.getByRole('button',{name:'채팅 송수신 점검 이력 보기',exact:true}).click();await page.getByLabel('점검 항목').waitFor();assert.equal(await page.getByLabel('점검 항목').inputValue(),'CHAT');assert.equal(await page.locator('#ops-release-history li').count(),1);assert(page.url().includes('check=CHAT'));await page.goBack();assert.equal(await page.getByLabel('점검 항목').inputValue(),'');await screenshot(page,prefix+'-release-evidence');return {viewport,...await noOverflow(page)};
  });
  await check(prefix+'-registry',async()=>{
   await page.goto(base.origin+'/admin/api-registry');await page.getByRole('button',{name:'서버 등록 API 목록',exact:true}).click();await page.getByText('2개 표시',{exact:true}).waitFor();await page.getByRole('button',{name:'호출 지표 보기',exact:true}).click();await page.getByRole('button',{name:'POST /api/images 오류율 근거',exact:true}).click();const evidence=page.getByRole('region',{name:'서버 호출 근거'});await evidence.getByRole('cell',{name:'500',exact:true}).waitFor();assert.equal(await evidence.getByRole('row').count(),3);await screenshot(page,prefix+'-registry-evidence');await noOverflow(page);
   await page.getByRole('button',{name:'미등록 API 목록',exact:true}).click();assert.equal(await page.getByRole('button',{name:'POST /api/images',exact:true}).count(),0);await page.getByRole('button',{name:'필터 초기화',exact:true}).click();await page.getByRole('button',{name:'영향 API 목록',exact:true}).click();await page.getByText('1개 표시',{exact:true}).waitFor();await screenshot(page,prefix+'-registry-errors');return {viewport,...await noOverflow(page)};
  });
  await check(prefix+'-marketing',async()=>{
   await page.goto(base.origin+'/admin/marketing');await page.getByRole('button',{name:'검토할 제작물 2개 근거 보기',exact:true}).click();await page.getByRole('img',{name:'현재 A안 홍보 카드',exact:true}).waitFor();assert.equal(await page.getByLabel('제작 상태').inputValue(),'review');assert.equal(await page.locator('.mk-library-list li').count(),2);await screenshot(page,prefix+'-marketing-review');await noOverflow(page);
   await page.getByRole('tab',{name:'오늘',exact:true}).click();await page.getByRole('button',{name:'결과 확인 필요 2건 근거 보기',exact:true}).click();const evidence=page.getByRole('region',{name:'결과 확인 필요 근거'});await evidence.waitFor();assert.equal(await evidence.locator('.mk-evidence-row').count(),2);await screenshot(page,prefix+'-marketing-unknown');await evidence.getByRole('button',{name:/제작 · 검증용 결과 미확인 생성/}).click();assert.equal(await page.getByLabel('생성 작업 상태').inputValue(),'UNKNOWN');await page.goBack();await evidence.waitFor();await page.getByRole('button',{name:'게시 완료 1건 근거 보기',exact:true}).click();assert.equal(await page.getByLabel('게시 상태').inputValue(),'PUBLISHED');assert.equal(await page.getByRole('heading',{name:'검증용 예약 게시',exact:true}).count(),0);await screenshot(page,prefix+'-marketing-published');return {viewport,...await noOverflow(page)};
  });
  await context.close();
 }
} finally {
 await browser.close();report.finishedAt=new Date().toISOString();report.passed=report.cases.every(item=>item.passed)&&report.pageErrors.length===0&&report.unexpectedRequests.length===0&&report.blockedRequests.length===0;await writeFile(path.join(output,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,cases:report.cases.length,failures:report.cases.filter(item=>!item.passed),pageErrors:report.pageErrors,unexpectedRequests:report.unexpectedRequests,blockedRequests:report.blockedRequests,output}));if(!report.passed)process.exitCode=1;
}
