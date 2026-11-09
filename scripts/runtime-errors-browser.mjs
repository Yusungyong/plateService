#!/usr/bin/env node
// Synthetic data only. External browser requests are blocked.
// Run after `npm run build` with Chrome and Playwright installed; for a separate
// installation set PLATE_PLAYWRIGHT_MODULE to its absolute module path.
// Screenshots go to the OS temporary directory unless PLATE_QA_OUTPUT is set.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile, stat, mkdir} from 'node:fs/promises';
import {resolve, extname, join} from 'node:path';
import {tmpdir} from 'node:os';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLATE_PLAYWRIGHT_MODULE || 'playwright');
const build = resolve('build'), results = resolve(process.env.PLATE_QA_OUTPUT || join(tmpdir(),'plate-runtime-errors-browser'));
await mkdir(results, {recursive:true});
const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');let file=join(build,decodeURIComponent(url.pathname));if(!file.startsWith(build+'/'))file=join(build,'index.html');try{if(!(await stat(file)).isFile())throw Error();}catch{file=join(build,'index.html');}res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(500);res.end();}});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({channel:'chrome',headless:true});
const identity={accessToken:'SYNTHETIC.'+Buffer.from(JSON.stringify({sub:'su12ng',roles:['ADMIN'],exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.NOT_A_SIGNATURE'};
const snapshot={schemaVersion:1,collectedAt:'2026-11-09T00:00:00Z',api:{runtimeMetrics:[],clientErrors:{available:false}},push:{available:true,counts:[],attempts:[],skips:[]},reports:{available:false},releases:{available:true,items:[],checks:[],workflows:[]},github:{status:'NOT_CONFIGURED'}};
const start=new Date('2026-11-08T00:00:00Z'),hourly=Array.from({length:24},(_,i)=>({bucketStart:new Date(+start+i*3600000).toISOString(),count:i%5===0?2:0}));
const records={available:true,windowHours:24,windowStart:start.toISOString(),windowEnd:'2026-11-09T00:00:00Z',retentionDays:7,total:10,groups:[],kindCounts:[{kind:'REACT_RENDER',count:6},{kind:'JS_FATAL',count:3},{kind:'JS_NONFATAL',count:1}],hourly,recentLimit:50,hasMore:false,recent:[{eventId:'fixture-1',receivedAt:'2026-11-08T01:00:00Z',kind:'REACT_RENDER',client:'ANDROID',screenLabel:'내 주변',identity:'VERIFIED',username:'test-user',appVersion:'2.0.15',buildNumber:'34',errorType:'TypeError',frames:[{line:120,column:45}]},{eventId:'fixture-2',receivedAt:'2026-11-08T01:15:00Z',kind:'JS_FATAL',client:'IOS',identity:'UNAVAILABLE',frames:[]},{eventId:'fixture-3',receivedAt:'2026-11-08T01:20:00Z',kind:'JS_NONFATAL',client:'ANDROID',screenLabel:'친구',identity:'VERIFIED',username:'test-friend',frames:[]}]};
const problems=[];
try{for(const width of [390,768,1440]){
 const context=await browser.newContext({viewport:{width,height:900},locale:'ko-KR',timezoneId:'Asia/Seoul'});
 await context.addInitScript(auth=>localStorage.setItem('plate-service.auth',JSON.stringify(auth)),identity);
 await context.route('**/*',async route=>{const req=route.request(),u=new URL(req.url());if(u.pathname.startsWith('/api/')){const headers={'access-control-allow-origin':origin,'access-control-allow-methods':'GET, OPTIONS','access-control-allow-headers':'authorization,content-type,accept'};if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});const data=u.pathname==='/api/admin/operations/snapshot'?snapshot:u.pathname==='/api/admin/operations/runtime-errors'?records:null;if(req.method()==='GET'&&data)return route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify({success:true,data})});problems.push(`${req.method()} ${u.pathname}`);return route.abort();}if(u.origin===origin||u.protocol==='data:'||u.protocol==='blob:')return route.continue();problems.push(`external ${u.hostname}`);return route.abort();});
 const page=await context.newPage();page.on('pageerror',e=>problems.push(e.message));
 await page.goto(origin+'/admin/operations/incidents');await page.getByRole('button',{name:'앱 화면 오류'}).click();await page.getByText('@test-user').waitFor();await page.getByRole('button',{name:/JS 실행 오류.*1건/}).click();await page.getByText('@test-friend').waitFor();assert.equal(await page.getByText('@test-user').count(),0);await page.getByRole('button',{name:/화면 렌더링.*6건/}).click();assert.equal(await page.getByText('계정 확인 불가').count(),0);await page.getByRole('button',{name:/오류 위치 보기/}).click();await page.getByText(/숫자 위치: 120:45/).waitFor();const sizes=await page.evaluate(()=>({width:innerWidth,doc:document.documentElement.scrollWidth}));assert(sizes.doc<=sizes.width+1,JSON.stringify(sizes));await page.screenshot({path:`${results}/${width}.png`,fullPage:true});console.log(`${width}px PASS`);await context.close();
}assert.deepEqual(problems,[]);}finally{await browser.close();await new Promise(done=>server.close(done));}
