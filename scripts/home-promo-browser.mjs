#!/usr/bin/env node
// Local, unauthenticated promotion-video QA. No API calls or mutations are allowed.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url),
  args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
};
const base = new URL(option("--base-url", "http://127.0.0.1:4196"));
assert(
  ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname),
  "Use a local preview only."
);
assert(!base.username && !base.password);
const output = path.resolve(
  option("--output", "/private/tmp/plate-home-promo-proof-20261028")
);
const allowedVideo = process.env.PLATE_PROMO_MEDIA_URL
  ? new URL(process.env.PLATE_PROMO_MEDIA_URL).href
  : null;
const { chromium } = process.env.PLATE_PLAYWRIGHT_MODULE
  ? await import(pathToFileURL(process.env.PLATE_PLAYWRIGHT_MODULE).href)
  : require("playwright");
const browser = await chromium.launch({
  headless: true,
  channel: process.env.PLATE_BROWSER_CHANNEL || "chrome",
});
const report = {
  startedAt: new Date().toISOString(),
  cases: [],
  pageErrors: [],
  mediaRequests: [],
  blockedRequests: [],
};
await mkdir(output, { recursive: true });

async function check(page, name, task) {
  try {
    report.cases.push({ name, passed: true, ...(await task()) });
  } catch (error) {
    report.cases.push({
      name,
      passed: false,
      error: error.message,
      stack: error.stack,
    });
    await page
      .screenshot({
        path: path.join(output, name + "-failure.png"),
        animations: "disabled",
      })
      .catch(() => {});
    await page
      .getByRole("button", { name: "영상 닫기" })
      .click({ timeout: 1000 })
      .catch(() => {});
  }
  console.log(JSON.stringify(report.cases.at(-1)));
}
async function prepare(viewport, failMedia = false) {
  const context = await browser.newContext({
    viewport,
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    reducedMotion: "no-preference",
    serviceWorkers: "block",
  });
  let failuresRemaining = failMedia ? 1 : 0;
  const requests = [];
  await context.route("**/*", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (
      !["GET", "HEAD"].includes(request.method()) ||
      url.pathname.startsWith("/api/")
    ) {
      report.blockedRequests.push({
        method: request.method(),
        path: url.pathname,
      });
      return route.abort("blockedbyclient");
    }
    if (request.resourceType() === "media") {
      const entry = {
        path: url.pathname,
        range: request.headers().range || null,
      };
      requests.push(entry);
      report.mediaRequests.push(entry);
      if (failuresRemaining > 0) {
        failuresRemaining--;
        return route.fulfill({
          status: 410,
          contentType: "text/plain",
          body: "Synthetic video unavailable",
        });
      }
    }
    if (
      url.origin === base.origin ||
      url.href === allowedVideo ||
      ["data:", "blob:"].includes(url.protocol)
    )
      return route.continue();
    report.blockedRequests.push({
      method: request.method(),
      host: url.hostname,
      path: url.pathname,
    });
    return route.abort("blockedbyclient");
  });
  if (context.routeWebSocket)
    await context.routeWebSocket(/.*/, (socket) => socket.close());
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on("pageerror", (error) => report.pageErrors.push(error.message));
  await page.goto(base.origin + "/", { waitUntil: "networkidle" });
  return { context, page, requests };
}
function opener(page) {
  return page.getByRole("button", { name: "접시 사용 영상 보기" });
}
async function metadata(video) {
  await video.evaluate((element) => {
    if (element.readyState >= 1) return;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Video metadata timed out")),
        12000
      );
      element.addEventListener(
        "loadedmetadata",
        () => {
          clearTimeout(timeout);
          resolve();
        },
        { once: true }
      );
      element.addEventListener(
        "error",
        () => {
          clearTimeout(timeout);
          reject(new Error("Video metadata failed"));
        },
        { once: true }
      );
    });
  });
  return video.evaluate((element) => ({
    duration: element.duration,
    width: element.videoWidth,
    height: element.videoHeight,
    controls: element.controls,
    playsInline: element.playsInline,
    paused: element.paused,
    source: element.currentSrc,
  }));
}
async function assertReleased(page, handle) {
  await page.waitForFunction(
    (element) =>
      element.paused &&
      element.readyState === 0 &&
      element.networkState === 0 &&
      !element.getAttribute("src") &&
      !element.querySelector("source[src]"),
    handle
  );
  assert.equal(await page.getByRole("dialog").count(), 0);
}

try {
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 1000 },
  ]) {
    const { context, page, requests } = await prepare(viewport),
      prefix = String(viewport.width);
    await check(page, prefix + "-lazy-video-and-no-smooth-scroll", async () => {
      assert.equal(
        requests.length,
        0,
        "The homepage must not download video before it is opened."
      );
      const closedSources = await page
        .locator("video")
        .evaluateAll((elements) =>
          elements
            .flatMap((element) => [
              element.getAttribute("src"),
              ...[...element.querySelectorAll("source")].map((source) =>
                source.getAttribute("src")
              ),
            ])
            .filter(Boolean)
        );
      assert.deepEqual(closedSources, []);
      const scroll = await page.evaluate(() => ({
        html: getComputedStyle(document.documentElement).scrollBehavior,
        body: getComputedStyle(document.body).scrollBehavior,
      }));
      assert.equal(scroll.html, "auto");
      assert.equal(scroll.body, "auto");
      assert.equal(await opener(page).count(), 1);
      return { noPreload: true, instantScroll: true };
    });
    await check(page, prefix + "-dialog-playback-and-cleanup", async () => {
      const trigger = opener(page);
      await trigger.scrollIntoViewIfNeeded();
      await trigger.focus();
      await page.evaluate(() =>
        window.scrollTo({ top: 120, behavior: "instant" })
      );
      const scrollBefore = await page.evaluate(() => scrollY);
      await trigger.click();
      const dialog = page.getByRole("dialog"),
        video = dialog.locator("video");
      await dialog.waitFor();
      assert(
        await dialog.evaluate((element) => element.matches(":modal")),
        "The video must open with native showModal."
      );
      const bounds = await dialog.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          viewportWidth: innerWidth,
          viewportHeight: visualViewport?.height || innerHeight,
        };
      });
      assert(
        bounds.left >= -1 &&
          bounds.top >= -1 &&
          bounds.right <= bounds.viewportWidth + 1 &&
          bounds.bottom <= bounds.viewportHeight + 1,
        "Dialog must fit the viewport: " + JSON.stringify(bounds)
      );
      const details = await metadata(video);
      assert.equal(details.width, 720);
      assert.equal(details.height, 1280);
      assert(
        details.duration >= 35 && details.duration <= 37,
        "Expected the completed 36-second introduction."
      );
      assert(
        details.controls && details.playsInline,
        "Native playback controls and inline mobile playback are required."
      );
      const outside = page
        .getByRole("link", { name: "App Store에서 접시 다운로드 (새 창)" })
        .first();
      await outside.evaluate((element) => element.focus());
      assert(
        await dialog.evaluate((element) =>
          element.contains(document.activeElement)
        ),
        "Background content must be inert while the dialog is open."
      );
      const close = dialog.getByRole("button", { name: /닫기/ });
      await close.focus();
      for (let index = 0; index < 10; index++) {
        await page.keyboard.press("Tab");
        assert(
          await dialog.evaluate(
            (element) =>
              !document.hasFocus() || element.contains(document.activeElement)
          ),
          "Tab must never focus background page controls."
        );
      }
      await close.focus();
      if (await video.evaluate((element) => element.paused)) {
        await video.focus();
        await page.keyboard.press("Space");
      }
      await page.waitForFunction(() => {
        const element = document.querySelector("dialog[open] video");
        return element && !element.paused && element.currentTime > 0.2;
      });
      await video.evaluate((element) => {
        element.textTracks[0].mode = "hidden";
      });
      await page.waitForFunction(
        () =>
          document.querySelector("dialog[open] video")?.textTracks[0]?.cues
            ?.length === 11
      );
      const captions = await video.evaluate((element) => {
        const track = element.textTracks[0],
          cues = [...track.cues];
        return {
          language: track.language,
          kind: track.kind,
          count: cues.length,
          end: cues.at(-1).endTime,
        };
      });
      assert.equal(captions.language, "ko");
      assert.equal(captions.kind, "captions");
      assert.equal(captions.end, 36);
      await video.evaluate((element) => {
        element.currentTime = 18;
      });
      await page.waitForFunction(() => {
        const element = document.querySelector("dialog[open] video");
        return element && !element.seeking && element.currentTime >= 18.2;
      });
      const audio = await video.evaluate((element) => ({
        decodedBytes: element.webkitAudioDecodedByteCount || 0,
        audioTracks: element.audioTracks?.length || 0,
      }));
      assert(
        audio.decodedBytes > 0 || audio.audioTracks > 0,
        "AAC audio should decode during playback."
      );
      await page.screenshot({
        path: path.join(output, prefix + "-playing.png"),
        animations: "disabled",
      });
      const handle = await video.elementHandle();
      await page.keyboard.press("Escape");
      await assertReleased(page, handle);
      assert(
        await trigger.evaluate((element) => element === document.activeElement),
        "Closing must restore opener focus."
      );
      assert(
        Math.abs((await page.evaluate(() => scrollY)) - scrollBefore) <= 1,
        "Closing must preserve the original scroll position."
      );
      const closedCount = requests.length;
      await page.waitForLoadState("networkidle");
      assert.equal(
        requests.length,
        closedCount,
        "Video requests must stop after closing."
      );
      return {
        duration: details.duration,
        width: details.width,
        height: details.height,
        audioDecoded: true,
        captions,
        backgroundInert: true,
        keyboardBackgroundInert: true,
        escapeClose: true,
        sourceReleased: true,
        focusRestored: true,
        scrollRestored: true,
      };
    });
    await check(
      page,
      prefix + "-reopen-backdrop-and-close-button",
      async () => {
        const trigger = opener(page);
        await trigger.click();
        const dialog = page.getByRole("dialog"),
          video = dialog.locator("video");
        await metadata(video);
        assert(
          (await video.evaluate((element) => element.currentTime)) < 1,
          "Reopening should start from the beginning."
        );
        const rect = await dialog.boundingBox(),
          handle = await video.elementHandle();
        assert(
          rect.x > 2 || rect.y > 2,
          "There should be a usable backdrop around the modal."
        );
        await page.mouse.move(rect.x + rect.width / 2, rect.y + 15);
        await page.mouse.down();
        await page.mouse.move(1, 1);
        await page.mouse.up();
        assert.equal(
          await dialog.count(),
          1,
          "Dragging from inside to the backdrop must not dismiss the video."
        );
        await page.mouse.click(1, 1);
        await assertReleased(page, handle);
        assert(
          await trigger.evaluate(
            (element) => element === document.activeElement
          )
        );
        await trigger.click();
        const reopenedVideo = page.getByRole("dialog").locator("video"),
          reopenedHandle = await reopenedVideo.elementHandle();
        await page
          .getByRole("dialog")
          .getByRole("button", { name: /닫기/ })
          .click();
        await assertReleased(page, reopenedHandle);
        return {
          restarts: true,
          backdropClose: true,
          dragDoesNotDismiss: true,
          closeButton: true,
        };
      }
    );
    await context.close();
  }
  const { context, page } = await prepare({ width: 390, height: 844 }, true);
  await check(page, "video-error-and-retry", async () => {
    await opener(page).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("alert").waitFor();
    await page.screenshot({
      path: path.join(output, "video-load-error.png"),
      animations: "disabled",
    });
    await dialog.getByRole("button", { name: /다시|재시도/ }).click();
    const video = dialog.locator("video");
    await metadata(video);
    assert.equal(await dialog.getByRole("alert").count(), 0);
    const handle = await video.elementHandle();
    await dialog.getByRole("button", { name: /닫기/ }).click();
    await assertReleased(page, handle);
    return { friendlyError: true, retryRecovery: true };
  });
  await context.close();
  assert.deepEqual(report.pageErrors, []);
} finally {
  report.finishedAt = new Date().toISOString();
  report.passed =
    report.cases.every((item) => item.passed) &&
    report.pageErrors.length === 0 &&
    report.blockedRequests.length === 0;
  await writeFile(
    path.join(output, "report.json"),
    JSON.stringify(report, null, 2) + "\n"
  );
  await browser.close();
}
if (!report.passed) process.exitCode = 1;
