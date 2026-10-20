#!/usr/bin/env node
// Local browser QA with synthetic fixtures only. All APIs are intercepted before network access.
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const option = (name, fallback) => {const index = args.indexOf(name); return index < 0 ? fallback : args[index + 1];};
const base = new URL(option('--base-url', 'http://localhost:4186'));
assert(['localhost', '127.0.0.1', '[::1]'].includes(base.hostname), 'Only a loopback server may be tested.');
assert(['http:', 'https:'].includes(base.protocol), 'A local HTTP URL is required.');
assert(!base.username && !base.password, 'Server URLs must not contain credentials.');
const output = path.resolve(option('--output', path.join(root, 'output/admin-workspace-browser')));
const modulePath = process.env.PLATE_PLAYWRIGHT_MODULE;
const {chromium} = modulePath ? await import(pathToFileURL(modulePath).href) : require('playwright');
const now = new Date();
const date = '2026-10-20T01:00:00Z';
const pageOf = (content, size = 20) => ({content, page: 0, size, totalElements: content.length, totalPages: 1, hasNext: false});
const imageUrl = 'https://ui-fixture.invalid/meal.svg';
const mealSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500"><rect width="800" height="500" fill="#f4e8d6"/><ellipse cx="400" cy="260" rx="240" ry="170" fill="#fffaf1"/><ellipse cx="400" cy="260" rx="170" ry="110" fill="#d57c47"/><path d="M300 250q100-80 200 0M300 280q100-80 200 0" fill="none" stroke="#f5d68a" stroke-width="20"/><text x="400" y="455" text-anchor="middle" font-family="sans-serif" font-size="24" fill="#6a5139">SYNTHETIC UI FIXTURE</text></svg>';
const member = {username: 'alice', nickname: '테스트 회원', role: 'USER', createdAt: '2026-01-01', tokenVersion: 3, activeSessions: 2, canRevokeSessions: true};
const feed = {feedId: 42, username: 'alice', content: '합성 사진 콘텐츠 · 가을 한 끼를 기록했어요.', storeName: '합성 접시 식당', visibilityStatus: 'visible', recommended: false, reportCount: 1, version: 2, previewImages: [imageUrl], createdAt: date};
const food = {id: 99, nameKo: '합성 대하', status: 'PUBLISHED', categoryCode: 'CRUSTACEAN', version: 3, shortDescription: '가을에 즐기는 제철 음식 · 화면 검증용 합성 데이터', representativeImageUrl: imageUrl, imagePreviewUrl: imageUrl, months: [9, 10], monthsEditable: true};
const approval = {id: 42, name: '합성 신청 매장', ownerName: '합성 신청자', categories: [{code: 'KOREAN', name: '한식'}], region: {code: 'SEOUL', name: '서울'}, address: '화면 검증용 합성 주소', phone: '000-0000-0000', email: 'fixture@example.com', businessNumber: '000-00-00000', approvalStatus: 'pending', verificationStatus: 'reviewing', appliedAt: date, version: 7, mainImageUrl: imageUrl, description: '운영 데이터와 무관한 합성 신청입니다.', representativeMenus: ['가을 한 상'], documents: [{id: 1, name: '합성 서류.pdf'}]};
const restaurant = {id: 17, title: '합성 검수 매장', address: '화면 검증용 합성 주소', categories: ['한식'], exposureStatus: 'review', menuCount: 2, updatedAt: date, representativeImageUrl: imageUrl};
const qna = {qnaId: 1, question: '합성 문의', answer: '', category: '계정문의', statusCode: 'received', isPublic: false, guestName: '합성 사용자', guestEmail: 'fixture@example.com', createdAt: date};
const faq = {faqId: 1, title: '합성 FAQ', answer: '안내내용 · 화면 검증용 합성 답변입니다.', category: 'service', statusCode: 'published', isPinned: false, username: '운영자', updatedAt: date, viewCount: 1, displayOrder: 0};
const fixtures = new Map([
  ['/api/admin/member-monitoring/summary', {totalUsers: 30, newUsersToday: 2, activeUsers7d: 12, loginFailureRateToday: 3, pendingRoleChanges: 1, riskUsers24h: 1}],
  ['/api/admin/member-monitoring/login-risks', [{username: 'alice', riskType: 'LOGIN_FAILURE', riskLabel: '로그인 실패 증가', detail: '합성 테스트', state: '확인 필요'}]],
  ['/api/admin/member-monitoring/profile-changes', [{historyId: 1, username: 'alice', changeType: 'NICKNAME', createdAt: date, actor: 'system'}]],
  ['/api/admin/member-monitoring/risk-users', [{username: 'alice', reportCount: 2, blockedCount: 1, score: 3}]],
  ['/api/admin/member-monitoring/members', [member]],
  ['/api/admin/member-monitoring/members/alice', {member, reports30d: 1, imagePosts30d: 2, videoPosts30d: 0, recentChanges: []}],
  ['/api/admin/feeds', pageOf([feed, {...feed, feedId: 43, content: '신고가 없는 합성 콘텐츠', reportCount: 0}])],
  ['/api/admin/feeds/42', feed],
  ['/api/admin/feeds/42/reports', pageOf([{id: 1, reason: '합성 신고 · 내용 확인 요청', status: 'open'}])],
  ['/api/admin/seasonal-foods', pageOf([food], 50)],
  ['/api/admin/seasonal-foods/99', food],
  ['/api/admin/store-approvals', pageOf([approval], 10)],
  ['/api/admin/store-approvals/42', approval],
  ['/api/admin/restaurants', pageOf([restaurant])],
  ['/api/admin/restaurants/17', restaurant],
  ['/api/admin/qna', pageOf([qna])],
  ['/api/faqs', pageOf([faq])],
  ['/api/faqs/1', faq],
  ['/api/admin/dashboard/summary', {metrics: [
    {key: 'newStoreApplications', label: '신규 매장 신청', value: 3, changeRate: 12, comparison: 'previous_period'},
    {key: 'pendingApprovals', label: '승인 대기', value: 1, comparison: 'current'},
    {key: 'activeStores', label: '변경된 매장', value: 17, comparison: 'current_period'},
    {key: 'userReports', label: '사용자 신고', value: 2, comparison: 'current_period'},
  ]}],
  ['/api/admin/dashboard/activity-trends', []],
  ['/api/admin/dashboard/region-distribution', [{regionCode: 'SEOUL', regionName: '서울', postCount: 7}, {regionCode: 'BUSAN', regionName: '부산', postCount: 3}]],
  ['/api/admin/activities', pageOf([{id: 1, occurredAt: date, storeName: '합성 신청 매장', actionLabel: '화면 검증 기록', action: 'STORE_APPROVED', operatorName: '합성 운영자', status: 'approved'}])],
]);
function trendsForRange(params) {
  const from = Date.parse(params.get('from')), to = Date.parse(params.get('to'));
  const length = Math.floor((to - from) / 86400000) + 1;
  assert(Number.isFinite(length) && length >= 1 && length <= 93, 'Dashboard fixtures require a bounded date range.');
  return Array.from({length}, (_, index) => ({date: new Date(from + index * 86400000).toISOString().slice(0, 10), activeStoreCount: index % 5 + 1, postCount: index % 8 + 3, reactionCount: index % 12 + 5}));
}
const report = {schemaVersion: 1, startedAt: now.toISOString(), baseUrl: base.origin, syntheticFixtures: true, productionCredentialsUsed: false, realMutations: 0, externalRequestsSent: 0, cases: [], apiRequests: [], blockedRequests: [], unexpectedRequests: [], pageErrors: []};
await mkdir(output, {recursive: true});
const browser = await chromium.launch({channel: 'chrome', headless: true});
const identity = {accessToken: 'SYNTHETIC.' + Buffer.from(JSON.stringify({sub: 'workspace-ui-fixture', displayName: '합성 검증 운영자', roles: ['ADMIN'], exp: Math.floor(Date.now() / 1000) + 3600})).toString('base64url') + '.NOT_A_SIGNATURE'};

async function contextFor(viewport) {
  const context = await browser.newContext({viewport, locale: 'ko-KR', timezoneId: 'Asia/Seoul', serviceWorkers: 'block', reducedMotion: 'reduce'});
  await context.addInitScript(value => localStorage.setItem('plate-service.auth', JSON.stringify(value)), identity);
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), method = request.method();
    const headers = {'access-control-allow-origin': base.origin, 'access-control-allow-methods': 'GET, OPTIONS', 'access-control-allow-headers': 'authorization,content-type,accept'};
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      report.blockedRequests.push({method, path: url.pathname, host: url.hostname});
      return route.fulfill({status: 405, headers, contentType: 'application/json', body: JSON.stringify({success: false, message: 'Browser harness blocks every mutation.'})});
    }
    if (url.pathname.startsWith('/api/')) {
      if (method === 'OPTIONS') return route.fulfill({status: 204, headers});
      report.apiRequests.push({method, path: url.pathname, query: Object.fromEntries(url.searchParams)});
      if (fixtures.has(url.pathname)) {
        // FAQ's existing public API returns raw pages/details; admin APIs use an envelope.
        const value = url.pathname === '/api/admin/dashboard/activity-trends' ? trendsForRange(url.searchParams) : fixtures.get(url.pathname);
        const payload = url.pathname === '/api/faqs' || url.pathname.startsWith('/api/faqs/') ? value : {success: true, data: value};
        return route.fulfill({status: 200, headers, contentType: 'application/json', body: JSON.stringify(payload)});
      }
      report.unexpectedRequests.push({method, path: url.pathname});
      return route.fulfill({status: 404, headers, contentType: 'application/json', body: JSON.stringify({success: false, message: 'No synthetic fixture registered.'})});
    }
    if (url.href === imageUrl) return route.fulfill({status: 200, contentType: 'image/svg+xml', body: mealSvg});
    if (url.origin === base.origin || ['data:', 'blob:'].includes(url.protocol)) return route.continue();
    report.blockedRequests.push({method, path: url.pathname, host: url.hostname});
    return route.abort('blockedbyclient');
  });
  if (context.routeWebSocket) await context.routeWebSocket(/.*/, socket => {
    const url = new URL(socket.url());
    if (['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) && url.port === base.port) socket.connectToServer();
    else {report.blockedRequests.push({method: 'WEBSOCKET', host: url.hostname, path: url.pathname}); socket.close();}
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => report.pageErrors.push(error.message));
  return {context, page};
}
async function screenshot(page, name) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
  await page.screenshot({path: path.join(output, name + '.png'), fullPage: true});
}
async function noOverflow(page) {
  const bounds = await page.evaluate(() => ({width: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth, dialogs: [...document.querySelectorAll('[role="dialog"]')].filter(el => el.getClientRects().length).map(el => ({width: el.clientWidth, scroll: el.scrollWidth}))}));
  assert(bounds.document <= bounds.width + 1 && bounds.body <= bounds.width + 1, 'Horizontal page overflow: ' + JSON.stringify(bounds));
  assert(bounds.dialogs.every(item => item.scroll <= item.width + 1), 'Horizontal dialog overflow: ' + JSON.stringify(bounds));
  return bounds;
}
async function namedControls(page) {
  const unnamed = await page.evaluate(() => [...document.querySelectorAll('button,input:not([type="hidden"]),select,textarea')].filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden').filter(el => {
    if (el.getAttribute('aria-label') || el.getAttribute('title') || el.labels?.length || el.getAttribute('aria-labelledby')) return false;
    return el.tagName !== 'BUTTON' || !el.textContent.trim();
  }).map(el => ({tag: el.tagName, type: el.type, class: el.className})));
  assert.deepEqual(unnamed, [], 'Visible controls must have accessible names.');
  return {namedControls: true};
}
async function capture(page, name) {
  await screenshot(page, name);
  return {...await noOverflow(page), ...await namedControls(page)};
}
async function visible(locator) {for (const item of await locator.all()) if (await item.isVisible()) return item; throw Error('No visible matching control.');}
async function openWithKeyboard(page, trigger) {await trigger.focus(); await page.keyboard.press('Enter');}
async function checkDrawer(page, dialog, trigger) {
  await dialog.waitFor();
  assert(await dialog.evaluate(el => el.contains(document.activeElement)), 'Initial focus must be inside the detail panel.');
  const controls = dialog.locator('button:enabled:visible, input:enabled:visible, select:enabled:visible, textarea:enabled:visible, a[href]:visible, summary:visible, [tabindex="0"]:visible');
  await controls.last().focus(); await page.keyboard.press('Tab');
  assert(await controls.first().evaluate(el => el === document.activeElement), 'Tab must wrap inside the panel.');
  await page.keyboard.press('Shift+Tab');
  assert(await controls.last().evaluate(el => el === document.activeElement), 'Shift+Tab must wrap inside the panel.');
  await page.keyboard.press('Escape'); await dialog.waitFor({state: 'hidden'});
  assert(await trigger.evaluate(el => new Promise(resolve => requestAnimationFrame(() => resolve(el === document.activeElement)))), 'Closing the panel must restore opener focus.');
  return {keyboardOpen: true, focusTrap: true, escapeClose: true, focusRestored: true};
}
async function check(page, name, task) {
  try {report.cases.push({name, passed: true, ...await task()});}
  catch (error) {
    await screenshot(page, name + '-failure').catch(() => {});
    report.cases.push({name, passed: false, error: error.message});
  }
  console.log(JSON.stringify(report.cases.at(-1)));
}

try {
  for (const viewport of [{width: 1440, height: 1000}, {width: 390, height: 844}, {width: 768, height: 1024}]) {
    const {context, page} = await contextFor(viewport), prefix = String(viewport.width);
    await check(page, prefix + '-member-search', async () => {
      await page.goto(base.origin + '/admin/member-monitoring');
      const search = page.getByRole('searchbox', {name: '회원 검색'});
      await search.fill('alice'); await search.press('Enter');
      const trigger = page.getByRole('button', {name: '회원 alice 확인'});
      await trigger.waitFor();
      await capture(page, prefix + '-members');
      await openWithKeyboard(page, trigger);
      const detail = page.getByRole('region', {name: '회원 alice', exact: true});
      await detail.getByRole('heading', {name: '최근 30일 활동'}).waitFor();
      assert(await detail.getByRole('heading', {name: '테스트 회원', exact: true}).evaluate(el => el === document.activeElement), 'Selected member heading must receive focus.');
      return {...await capture(page, prefix + '-member-detail'), keyboardOpen: true, detailFocus: true};
    });
    await check(page, prefix + '-member-signals', async () => {
      const searchTab = page.getByRole('tab', {name: '회원 찾기', exact: true});
      await searchTab.focus(); await page.keyboard.press('ArrowRight');
      const signals = page.getByRole('tab', {name: '이상 징후', exact: true});
      assert.equal(await signals.getAttribute('aria-selected'), 'true');
      assert(await signals.evaluate(el => el === document.activeElement));
      await page.getByText('로그인 실패 증가', {exact: true}).waitFor();
      await capture(page, prefix + '-member-signals');
      await page.getByRole('tab', {name: '신고·차단', exact: true}).click();
      await page.getByRole('heading', {name: '신고·차단 집중 사용자'}).waitFor();
      return {...await noOverflow(page), tabArrowKeyboard: true};
    });
    await check(page, prefix + '-feeds', async () => {
      await page.goto(base.origin + '/admin/feeds');
      await page.getByRole('button', {name: '피드 #43 검토'}).waitFor();
      await capture(page, prefix + '-feeds');
      await page.getByRole('checkbox', {name: '이 페이지에서 신고 있는 항목만'}).check();
      assert.equal(await page.getByRole('button', {name: '피드 #43 검토'}).count(), 0);
      const trigger = page.getByRole('button', {name: '피드 #42 검토'});
      await openWithKeyboard(page, trigger);
      const dialog = page.getByRole('dialog', {name: '피드 #42'});
      await dialog.getByText(/합성 신고/).waitFor();
      const bounds = await capture(page, prefix + '-feed-detail');
      return {...bounds, reportFilter: true, ...await checkDrawer(page, dialog, trigger)};
    });
    await check(page, prefix + '-seasonal', async () => {
      await page.goto(base.origin + '/admin/seasonal-foods');
      const trigger = page.getByRole('button', {name: /합성 대하/}); await trigger.waitFor();
      await capture(page, prefix + '-seasonal'); await openWithKeyboard(page, trigger);
      const dialog = page.getByRole('dialog', {name: '합성 대하', exact: true});
      await dialog.getByRole('textbox', {name: '소개', exact: true}).waitFor();
      const bounds = await capture(page, prefix + '-seasonal-detail');
      return {...bounds, ...await checkDrawer(page, dialog, trigger)};
    });
    await check(page, prefix + '-approvals', async () => {
      await page.goto(base.origin + '/admin/store-approvals');
      const group = page.getByRole('group', {name: '승인 상태 빠른 필터'});
      await group.getByRole('button', {name: '대기', exact: true}).click();
      await page.getByRole('button', {name: '상세 필터 열기'}).click();
      await page.getByRole('combobox', {name: '지역', exact: true}).selectOption('SEOUL');
      await page.getByRole('button', {name: '조회', exact: true}).click();
      const trigger = await visible(page.getByRole('button', {name: /^(검토|합성 신청 매장 신청 상세 검토)$/}));
      await capture(page, prefix + '-approvals'); await openWithKeyboard(page, trigger);
      const dialog = page.getByRole('dialog', {name: '합성 신청 매장', exact: true});
      await dialog.getByText('합성 서류.pdf', {exact: true}).waitFor();
      const bounds = await capture(page, prefix + '-approval-detail');
      return {...bounds, advancedFilters: true, ...await checkDrawer(page, dialog, trigger)};
    });
    await check(page, prefix + '-stores', async () => {
      await page.goto(base.origin + '/admin/stores');
      await page.getByRole('group', {name: '매장 노출 상태 빠른 필터'}).getByRole('button', {name: '검수 요청', exact: true}).click();
      const trigger = page.getByRole('button', {name: '합성 검수 매장 관리 작업 열기'}); await trigger.waitFor();
      await capture(page, prefix + '-stores'); await openWithKeyboard(page, trigger);
      const dialog = page.getByRole('dialog', {name: '합성 검수 매장', exact: true});
      await dialog.getByRole('link', {name: '매장 정보 편집'}).waitFor();
      const bounds = await capture(page, prefix + '-store-detail');
      return {...bounds, ...await checkDrawer(page, dialog, trigger)};
    });
    await check(page, prefix + '-qna', async () => {
      await page.goto(base.origin + '/admin/qna');
      const trigger = page.getByRole('region', {name: '문의 목록', exact: true}).getByRole('button', {name: /합성 문의/});
      await trigger.waitFor(); await capture(page, prefix + '-qna'); await openWithKeyboard(page, trigger);
      const detail = page.getByRole('region', {name: '선택한 문의', exact: true});
      await detail.getByRole('textbox', {name: '답변 내용', exact: true}).waitFor();
      assert.equal(await trigger.getAttribute('aria-current'), 'true');
      return {...await capture(page, prefix + '-qna-detail'), keyboardOpen: true, selectedState: true};
    });
    await check(page, prefix + '-faq', async () => {
      await page.goto(base.origin + '/admin/faq');
      const trigger = page.getByRole('region', {name: 'FAQ 목록', exact: true}).getByRole('button', {name: /합성 FAQ/});
      await trigger.waitFor(); await capture(page, prefix + '-faq'); await openWithKeyboard(page, trigger);
      const detail = page.getByRole('region', {name: '선택한 FAQ', exact: true});
      await detail.getByText(/안내내용 · 화면 검증용 합성 답변/).waitFor();
      assert.equal(await trigger.getAttribute('aria-current'), 'true');
      return {...await capture(page, prefix + '-faq-detail'), keyboardOpen: true, selectedState: true};
    });
    await check(page, prefix + '-dashboard', async () => {
      await page.goto(base.origin + '/admin/dashboard');
      const thirtyDays = page.getByRole('button', {name: '최근 30일', exact: true}); await thirtyDays.click();
      await page.waitForFunction(() => document.querySelector('.dashboard-periods button[aria-pressed="true"]')?.textContent === '최근 30일');
      await page.getByText('화면 검증 기록', {exact: true}).locator('visible=true').first().waitFor();
      const lastRequest = report.apiRequests.filter(item => item.path === '/api/admin/dashboard/summary').at(-1);
      assert.equal((Date.parse(lastRequest.query.to) - Date.parse(lastRequest.query.from)) / 86400000, 29, '30-day shortcut must send a 30-day inclusive date range.');
      const chart = page.getByRole('region', {name: '날짜별 활동 그래프 · 좌우로 이동'});
      const columns = chart.locator('.admin-trend-chart__column');
      await columns.nth(29).waitFor();
      assert.equal(await columns.count(), 30, 'Every day must have its own chart column.');
      const chartBounds = await chart.evaluate(el => ({width: el.clientWidth, scroll: el.scrollWidth, columnRows: [...new Set([...el.children].map(child => Math.round(child.getBoundingClientRect().top)))]}));
      assert.equal(chartBounds.columnRows.length, 1, 'The 30-day chart must stay on one scrollable row.');
      assert(chartBounds.scroll > chartBounds.width, 'Long ranges must scroll within the chart.');
      assert(await page.locator('.admin-chart-legend').isVisible(), 'The chart legend must remain visible.');
      await chart.focus(); await page.keyboard.press('ArrowRight');
      await page.waitForFunction(el => el.scrollLeft > 0, await chart.elementHandle(), {timeout: 1000});
      await chart.evaluate(el => {el.scrollLeft = 0;});
      return {...await capture(page, prefix + '-dashboard-30days'), thirtyDayRange: lastRequest.query, chartColumns: 30, chartBounds, keyboardChartScroll: true};
    });
    await context.close();
  }
} finally {
  await browser.close();
  report.finishedAt = new Date().toISOString();
  report.passed = report.cases.every(item => item.passed) && !report.pageErrors.length && !report.unexpectedRequests.length && !report.blockedRequests.length;
  await writeFile(path.join(output, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({passed: report.passed, cases: report.cases.length, failures: report.cases.filter(item => !item.passed), pageErrors: report.pageErrors, unexpectedRequests: report.unexpectedRequests, blockedRequests: report.blockedRequests, output}));
  if (!report.passed) process.exitCode = 1;
}
