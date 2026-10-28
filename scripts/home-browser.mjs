#!/usr/bin/env node
// Local homepage QA. External requests and all API mutations are blocked.
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const contrastOnly = args.includes('--contrast-only');
const option = (name, fallback) => {const index = args.indexOf(name); return index < 0 ? fallback : args[index + 1];};
const base = new URL(option('--base-url', 'http://127.0.0.1:4196'));
assert(['localhost', '127.0.0.1', '[::1]'].includes(base.hostname), 'Use a local preview only.');
assert(['http:', 'https:'].includes(base.protocol) && !base.username && !base.password);
const output = path.resolve(option('--output', path.join(root, 'output/home-browser')));
const {chromium} = process.env.PLATE_PLAYWRIGHT_MODULE ? await import(pathToFileURL(process.env.PLATE_PLAYWRIGHT_MODULE).href) : require('playwright');
const report = {startedAt: new Date().toISOString(), baseUrl: base.origin, cases: [], contrastAudits: [], pageErrors: [], blockedRequests: [], apiRequests: []};
await mkdir(output, {recursive: true});
const browser = await chromium.launch({headless: true, ...(process.env.PLATE_BROWSER_CHANNEL ? {channel: process.env.PLATE_BROWSER_CHANNEL} : {})});

async function noOverflow(page) {
  const bounds = await page.evaluate(() => ({viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth}));
  assert(bounds.document <= bounds.viewport + 1 && bounds.body <= bounds.viewport + 1, `Horizontal overflow: ${JSON.stringify(bounds)}`);
  return bounds;
}
async function capture(page, name, fullPage = true) {
  await page.screenshot({path: path.join(output, `${name}.png`), fullPage, animations: 'disabled'});
}
async function check(page, name, task) {
  if (contrastOnly && !name.endsWith('-small-text-contrast')) return;
  try {report.cases.push({name, passed: true, ...await task()});}
  catch (error) {report.cases.push({name, passed: false, error: error.message}); await capture(page, name + '-failure').catch(() => {});}
  console.log(JSON.stringify(report.cases.at(-1)));
}
async function loadHome(page) {
  await page.goto(base.origin + '/', {waitUntil: 'networkidle'});
  await page.getByRole('heading', {level: 1}).waitFor();
  await page.evaluate(async () => {
    await document.fonts.ready;
    const height = document.documentElement.scrollHeight;
    for (let y = 0; y < height; y += innerHeight * .75) {
      window.scrollTo(0, y);
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState('networkidle');
}
async function createPage(viewport, reducedMotion = 'reduce') {
  const context = await browser.newContext({viewport, reducedMotion, locale: 'ko-KR', timezoneId: 'Asia/Seoul', serviceWorkers: 'block'});
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.pathname.startsWith('/api/')) {
      report.apiRequests.push({method: request.method(), path: url.pathname});
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
        report.blockedRequests.push({method: request.method(), path: url.pathname});
        return route.fulfill({status: 405, body: '{}'});
      }
      const headers = {'access-control-allow-origin': base.origin, 'access-control-allow-methods': 'GET, OPTIONS', 'access-control-allow-headers': 'authorization,content-type,accept'};
      if (request.method() === 'OPTIONS') return route.fulfill({status: 204, headers});
      return route.fulfill({status: 200, headers, contentType: 'application/json', body: JSON.stringify({content: [], totalElements: 0, totalPages: 0, hasNext: false})});
    }
    if (url.origin === base.origin || ['data:', 'blob:'].includes(url.protocol)) return route.continue();
    report.blockedRequests.push({method: request.method(), host: url.hostname, path: url.pathname});
    return route.abort('blockedbyclient');
  });
  if (context.routeWebSocket) await context.routeWebSocket(/.*/, socket => {
    const url = new URL(socket.url());
    if (url.origin.replace(/^ws/, 'http') === base.origin) socket.connectToServer();
    else socket.close();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.on('pageerror', error => report.pageErrors.push(error.message));
  return {context, page};
}

try {
  for (const viewport of [{width: 320, height: 812}, {width: 390, height: 844}, {width: 768, height: 1024}, {width: 1440, height: 1000}]) {
    const {context, page} = await createPage(viewport), prefix = String(viewport.width);
    await loadHome(page);
    await check(page, prefix + '-layout-assets', async () => {
      assert.equal(await page.getByRole('heading', {level: 1}).count(), 1);
      const brokenImages = await page.locator('.home-site img').evaluateAll(images => images.filter(image => image.getClientRects().length && (!image.complete || !image.naturalWidth)).map(image => image.getAttribute('src')));
      assert.deepEqual(brokenImages, [], 'Visible images should load.');
      await capture(page, prefix + '-home');
      await capture(page, prefix + '-hero', false);
      return {...await noOverflow(page), loadedImages: await page.locator('.home-site img').count()};
    });
    await check(page, prefix + '-small-text-contrast', async () => {
      const results = await page.evaluate(() => {
        const selectors = ['.home-eyebrow', '.home-social .home-section-kicker', '.home-screen-caption', '.home-conversation figcaption', '.home-explorer-note', '.home-explorer-screen figcaption', '.home-availability', '.home-footer-bottom'];
        const rgba = text => {const channels = (text.match(/[\d.]+/g) || []).map(Number); return [...channels.slice(0, 3), channels[3] ?? 1];};
        const over = (front, back) => front.slice(0, 3).map((value, index) => value * front[3] + back[index] * (1 - front[3]));
        const luminance = color => color.slice(0, 3).map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
        return selectors.map(selector => {
          const element = document.querySelector(selector);
          if (!element) return {selector, missing: true};
          const ancestors = []; for (let current = element; current; current = current.parentElement) ancestors.push(current);
          let background = [255, 255, 255];
          for (const ancestor of ancestors.reverse()) background = over(rgba(getComputedStyle(ancestor).backgroundColor), background);
          const foreground = over(rgba(getComputedStyle(element).color), background);
          const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
          return {selector, foreground, background, ratio: (values[0] + .05) / (values[1] + .05)};
        });
      });
      report.contrastAudits.push({viewport: viewport.width, targets: results});
      const failures = results.filter(result => result.missing || result.ratio < 4.5);
      assert.equal(failures.length, 0, `Small text needs 4.5:1 contrast: ${JSON.stringify(failures)}`);
      return {minimumRatio: Math.min(...results.map(result => result.ratio)), targets: results};
    });
    await check(page, prefix + '-download-links', async () => {
      const stores = [['App Store', 'https://apps.apple.com/kr/app/id6759185760'], ['Google Play', 'https://play.google.com/store/apps/details?id=com.plateappnew']];
      for (const [name, url] of stores) {
        const links = page.getByRole('link', {name: `${name}에서 접시 다운로드 (새 창)`});
        assert((await links.count()) >= 2, `${name} should be available at the top and bottom.`);
        for (const link of await links.all()) {
          assert.equal(await link.getAttribute('href'), url);
          assert.equal(await link.getAttribute('target'), '_blank');
          assert.match(await link.getAttribute('rel'), /noopener/);
          assert.match(await link.getAttribute('rel'), /noreferrer/);
        }
      }
      await page.locator('.home-download-link').click();
      assert.equal(new URL(page.url()).hash, '#download');
      await page.locator('#download').scrollIntoViewIfNeeded();
      await capture(page, prefix + '-download', false);
      return {...await noOverflow(page), stores: 2};
    });
    await check(page, prefix + '-feature-tabs', async () => {
      const tabs = page.getByRole('tab');
      const count = await tabs.count();
      assert(count >= 3, 'Feature explorer needs multiple selectable previews.');
      await tabs.first().click();
      await tabs.first().focus();
      await page.keyboard.press('ArrowRight');
      assert.equal(await tabs.nth(1).getAttribute('aria-selected'), 'true');
      assert(await tabs.nth(1).evaluate(node => node === document.activeElement));
      await page.keyboard.press('End');
      assert.equal(await tabs.last().getAttribute('aria-selected'), 'true');
      await page.keyboard.press('ArrowRight');
      assert.equal(await tabs.first().getAttribute('aria-selected'), 'true');
      await page.keyboard.press('ArrowLeft');
      assert.equal(await tabs.last().getAttribute('aria-selected'), 'true');
      await page.keyboard.press('Home');
      assert.equal(await tabs.first().getAttribute('aria-selected'), 'true');
      const panels = [];
      for (let i = 0; i < count; i++) {
        await tabs.nth(i).click();
        assert.equal(await page.locator('[role="tab"][aria-selected="true"]').count(), 1);
        const panelId = await tabs.nth(i).getAttribute('aria-controls');
        const panel = page.locator(`[id="${panelId}"]`);
        assert(await panel.isVisible(), `Selected panel ${panelId} must be visible.`);
        assert.equal(await panel.getAttribute('aria-labelledby'), await tabs.nth(i).getAttribute('id'));
        const preview = panel.getByRole('img');
        await preview.scrollIntoViewIfNeeded();
        await page.waitForFunction(id => {const image = document.getElementById(id)?.querySelector('img'); return image?.complete && image.naturalWidth > 0;}, panelId);
        const dimensions = await preview.evaluate(async image => {
          // srcset scales and integer-rounds naturalWidth; decode the actual asset for an exact ratio.
          const original = new Image();
          original.src = image.currentSrc;
          await original.decode();
          const rect = image.getBoundingClientRect(), phone = image.closest('.home-explorer-phone'), frame = phone.getBoundingClientRect(), css = getComputedStyle(phone);
          return {image: {top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height}, phone: {top: frame.top + parseFloat(css.borderTopWidth), bottom: frame.bottom - parseFloat(css.borderBottomWidth), height: phone.clientHeight}, ratio: original.naturalHeight / original.naturalWidth};
        });
        assert(dimensions.image.top >= dimensions.phone.top - 1 && dimensions.image.bottom <= dimensions.phone.bottom + 1, `Feature ${panelId} clips its screenshot: ${JSON.stringify(dimensions)}`);
        assert(Math.abs(dimensions.image.height - dimensions.image.width * dimensions.ratio) <= 1, `Feature ${panelId} changes the screenshot aspect ratio.`);
        await noOverflow(page);
        panels.push(await tabs.nth(i).innerText());
        if (viewport.width === 390 || viewport.width === 1440) {
          await panel.scrollIntoViewIfNeeded();
          await capture(page, prefix + '-feature-' + (i + 1), false);
        }
      }
      return {panels, arrowNavigation: true, homeEndNavigation: true, fullScreenshotUncropped: true};
    });
    await check(page, prefix + '-social-preview', async () => {
      const social = page.locator('.home-social');
      await social.scrollIntoViewIfNeeded();
      assert(await social.getByText('친구에게 콘텐츠를 보내는 흐름을 보여주는 예시입니다.', {exact: true}).isVisible());
      await social.screenshot({path: path.join(output, prefix + '-social.png'), animations: 'disabled'});
      await page.locator('.home-conversation').screenshot({path: path.join(output, prefix + '-social-card.png'), animations: 'disabled'});
      return {...await noOverflow(page), illustrativeConversationLabel: true};
    });
    await check(page, prefix + '-navigation', async () => {
      await page.evaluate(() => window.scrollTo(0, 0));
      const toggle = page.getByRole('button', {name: '메뉴 열기'});
      if (await toggle.isVisible()) {
        await toggle.click();
        const close = page.getByRole('button', {name: '메뉴 닫기'});
        assert.equal(await close.getAttribute('aria-expanded'), 'true');
        await capture(page, prefix + '-menu', false);
        await page.keyboard.press('Escape');
        assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
        assert(await toggle.evaluate(node => node === document.activeElement));
        await toggle.click();
        await page.mouse.click(8, viewport.height - 12);
        assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
        await toggle.click();
        await page.getByRole('navigation', {name: '홈페이지 메뉴'}).locator('a[href="#features"]').click();
        assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
      } else {
        await page.getByRole('navigation', {name: '홈페이지 메뉴'}).locator('a[href="#features"]').click();
      }
      assert.equal(new URL(page.url()).hash, '#features');
      return {...await noOverflow(page), menuDismissal: true};
    });
    await check(page, prefix + '-reduced-motion', async () => {
      const moving = await page.locator('.home-site, .home-site *').evaluateAll(nodes => nodes.filter(node => {
        const css = getComputedStyle(node);
        return css.animationName !== 'none' && css.animationDuration.split(',').some(value => parseFloat(value) > .01);
      }).map(node => node.className));
      assert.deepEqual(moving, [], 'Reduced-motion preference should stop decorative animations.');
      return {reducedMotion: true};
    });
    await context.close();
  }
  const {context, page} = await createPage({width: 1440, height: 1000}, 'no-preference');
  await check(page, 'support-and-admin-routes', async () => {
    const routes = [['/faq', '자주 묻는 질문'], ['/business', null], ['/privacy-policy', null], ['/terms-of-service', null], ['/admin', '운영자 로그인']];
    for (const [href, heading] of routes) {
      await loadHome(page);
      await page.locator(`a[href="${href}"]`).first().click();
      assert.notEqual(new URL(page.url()).pathname, '/');
      await page.getByRole('heading', {level: 1, ...(heading ? {name: heading} : {})}).first().waitFor();
      assert.equal(await page.locator('.home-site').count(), 0, 'Route should replace the home view.');
    }
    return {routes: routes.map(([href]) => href)};
  });
  await context.close();
  assert.deepEqual(report.pageErrors, [], 'Pages should not throw browser exceptions.');
} finally {
  report.finishedAt = new Date().toISOString();
  report.passed = report.cases.every(item => item.passed) && report.pageErrors.length === 0;
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
if (!report.passed) process.exitCode = 1;
