const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { JSDOM } = require("jsdom");
const { loadPublic, hash, root, contentRoot, readJson, renderMarkdown } = require("./lib.cjs");
const { createPreviewFiles, createServer } = require("./preview.cjs");

test("public initial HTML has complete body, dates, accessible tables, links and history without JavaScript", () => {
  const { files, manifest } = loadPublic();
  for (const doc of manifest.documents.filter((entry) => entry.currentVersion)) {
    const html = files[`${doc.slug}/index.html`];
    const page = new JSDOM(html).window.document;
    assert.equal(page.querySelectorAll("h1").length, 1);
    assert.equal(page.querySelectorAll("script").length, 0);
    assert.ok(page.querySelector('a[aria-label="접시 홈으로 이동"][href="/"]'));
    assert.ok(page.querySelector("article").textContent.length > 300);
    assert.ok(page.querySelector('a[href="mailto:su12ng@gmail.com"]'));
    const current = doc.versions.find(v => v.version === doc.currentVersion);
    assert.ok(page.querySelector(".legal-meta").textContent.includes(current.effectiveDate || "미확정"));
    assert.ok(page.querySelector(`a[href="/${doc.slug}/versions"]`));
    for (const link of page.querySelectorAll('a[href^="#"]')) {
      assert.ok(page.getElementById(link.getAttribute("href").slice(1)));
    }
    for (const table of page.querySelectorAll("table")) {
      assert.equal(table.parentElement.getAttribute("tabindex"), "0");
      assert.ok(table.querySelector('th[scope="col"]'));
    }
  }
});

test("new policies and draft material cannot leak into the public build or consent metadata", () => {
  const { files, pages, manifest } = loadPublic();
  const publicText = Object.values(files).map(String).join("\n") + JSON.stringify(pages);
  for (const term of ["만 15세 이상부터", "최대 2년", "확인 필요", "draft-2026", "위치 이력 미보관"]) {
    assert.ok(!publicText.includes(term), `Unexpected public policy: ${term}`);
  }
  assert.equal(pages["/location-terms"], undefined);
  assert.equal(pages["/terms-of-service/versions/draft-2026-09-14"], undefined);
  for (const doc of manifest.documents) for (const version of doc.versions) {
    assert.equal(version.consentEligible, version.status === "published");
    assert.equal(version.effectiveDate, version.status === "published" ? "2026-09-25" : null);
    assert.equal(hash(files[new URL(version.htmlUrl).pathname.slice(1)]), version.sha256);
  }
});

test("all pinned original drafts keep their exact bytes and review notes", () => {
  const provenance = readJson(path.join(contentRoot, "review/provenance.json"));
  const previews = createPreviewFiles(true);
  for (const record of provenance.documents) {
    const bytes = fs.readFileSync(path.join(contentRoot, "review/source", record.path));
    assert.equal(hash(bytes), record.sha256);
  }
  for (const slug of ["terms-of-service", "privacy-policy", "location-terms"]) {
    const html = previews[`/review/${slug}`];
    assert.match(html, /미게시 준비본/);
    assert.match(html, /확인 필요|게시 전 확인/);
    assert.match(html, /30일/);
    assert.match(html, /noindex, nofollow/);
    assert.ok(!Object.keys(createPreviewFiles(false)).includes(`/review/${slug}`));
  }
});

test("version artifacts remain byte-identical and archives clearly identify obsolete content", () => {
  const { catalog, files } = loadPublic();
  for (const doc of catalog.documents) for (const version of doc.versions) {
    assert.ok(version.htmlSha256, "Each version must have a frozen HTML artifact");
    assert.equal(hash(files[`legal/documents/${doc.id}/${version.version}.html`]), version.htmlSha256);
    const display = new JSDOM(files[`${doc.slug}/versions/${version.version}/index.html`]).window.document;
    const original = new JSDOM(files[`legal/documents/${doc.id}/${version.version}.html`]).window.document;
    assert.equal(display.querySelector("article").innerHTML, original.querySelector("article").innerHTML);
    assert.ok(display.querySelector('a[aria-label="접시 홈으로 이동"][href="/"]'));
  }
  const archived = files["privacy-policy/versions/legacy-629dc8a/index.html"];
  assert.match(archived, /기존 화면 보관본/);
  assert.match(archived, /dishapp.help@gmail.com/);
  assert.match(archived, /현재 안내나 시행된 약관의 증거가 아닙니다/);
});

test("Markdown does not allow active HTML or script links", () => {
  const rendered = renderMarkdown('<script>alert(1)</script>\n\n[bad](javascript:alert(1))\n\n[mail](mailto:su12ng@gmail.com)');
  const page = new JSDOM(rendered.html).window.document;
  assert.equal(page.querySelector("script"), null);
  assert.equal(page.querySelector('a[href^="javascript:"]'), null);
  assert.ok(page.querySelector('a[href^="mailto:"]'));
});

test("public HTTP preview returns initial text and 404 for drafts, traversal and unknown versions", async () => {
  const server = createServer(false);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    const result = await fetch(origin + "/terms-of-service");
    assert.equal(result.status, 200);
    assert.match(result.headers.get("content-type"), /text\/html; charset=utf-8/);
    assert.match(await result.text(), /운영자 및 서비스 담당자: 유성용/);
    for (const uri of ["/review/privacy-policy", "/location-terms", "/terms-of-service/versions/missing", "/content/legal/review/provenance.json", "/%2e%2e/package.json"]) {
      assert.equal((await fetch(origin + uri)).status, 404, uri);
    }
  } finally { await new Promise((resolve) => server.close(resolve)); }
});

test("generated CloudFront function preserves legal HTML routing and rejects unknown versions", () => {
  require("node:child_process").execFileSync(process.execPath, [path.join(__dirname, "generate.cjs"), "--build"]);
  const source = fs.readFileSync(path.join(root, ".legal-preview/cloudfront-function.js"), "utf8");
  const scope = {};
  vm.runInNewContext(source, scope);
  for (const uri of ["/terms-of-service", "/privacy-policy/", "/terms-of-service/versions/legacy-629dc8a"]) {
    const result = scope.handler({ request: { uri } });
    assert.ok(result.uri.endsWith("/index.html"));
  }
  assert.equal(scope.handler({ request: { uri: "/location-terms" } }).statusCode, 404);
  assert.equal(scope.handler({ request: { uri: "/privacy-policy/versions/missing" } }).statusCode, 404);
  assert.equal(scope.handler({ request: { uri: "/faq" } }).uri, "/faq");
});

test("mobile packets preserve source bytes, block structure and immutable hash URLs", () => {
  const {files, manifest} = loadPublic();
  for (const doc of manifest.documents) for (const version of doc.versions) {
    const raw = files[new URL(version.mobileUrl).pathname.slice(1)];
    assert.equal(hash(raw), version.mobileSha256);
    assert.ok(version.mobileUrl.endsWith(`.${version.mobileSha256}.json`));
    const packet = JSON.parse(raw);
    assert.equal(packet.documentId, doc.id);
    assert.equal(packet.version, version.version);
    assert.equal(packet.purpose, "DOCUMENT_DISPLAY_ONLY");
    assert.equal(packet.consentEligible, version.status === "published");
    assert.equal(hash(packet.sourceMarkdown), version.sourceSha256);
    assert.equal(packet.sourceMarkdown, files[`legal/documents/${doc.id}/${version.version}.md`].toString("utf8"));
    assert.ok(packet.blocks.some(block => block.type === "heading"));
    assert.ok(packet.blocks.some(block => block.type === "paragraph"));
    assert.ok(!JSON.stringify(packet).includes("확인 필요"));
  }
});

test("mobile Markdown keeps table columns, numbered lists and safe link targets", () => {
  const {mobileBlocks} = require("./mobile.cjs");
  const blocks = mobileBlocks('## 제목\n\n3. **항목** [문의](mailto:su12ng@gmail.com)\n4. 다음\n\n| 항목 | 기간 |\n| --- | --- |\n| 계정 | 확인 중 |');
  assert.equal(blocks[0].type, "heading");
  assert.equal(blocks[1].marker, "3.");
  assert.equal(blocks[2].marker, "4.");
  assert.equal(blocks[1].spans[0].bold, true);
  assert.equal(blocks[1].spans.find(span => span.href).href, "mailto:su12ng@gmail.com");
  assert.deepEqual(blocks[3].rows.map(row => row.map(cell => cell.map(span => span.text).join(""))), [["항목", "기간"], ["계정", "확인 중"]]);
  assert.throws(() => mobileBlocks('![unreviewed image](https://example.org/a.png)'), /Unsupported/);
});
