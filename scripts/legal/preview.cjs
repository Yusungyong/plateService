const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { root, contentRoot, readJson, hash, escape, frame, renderMarkdown, documentBody, htmlPage, loadPublic, notFoundBody } = require("./lib.cjs");

function createPreviewFiles(includeReview) {
  const { files: publicFiles, catalog, manifest } = loadPublic();
  const files = {};
  for (const [key, value] of Object.entries(publicFiles)) {
    files[`/${key}`] = value;
    if (key.endsWith("/index.html")) files[`/${key.slice(0, -11)}`] = value;
  }
  files["/legal/legal.css"] = fs.readFileSync(path.join(root, "src/legal/legal.css"));
  files["/legal/manifest.json"] = JSON.stringify(manifest);
  const publicLinks = catalog.documents.filter((doc) => doc.currentVersion).map((doc) => `<li><a href="/${doc.slug}">${escape(doc.title)} — 정정 안내</a></li>`).join("");
  let reviewLinks = "";
  if (includeReview) {
    const provenance = readJson(path.join(contentRoot, "review/provenance.json"));
    for (const record of provenance.documents) {
      const source = fs.readFileSync(path.join(contentRoot, "review/source", record.path));
      if (hash(source) !== record.sha256) throw new Error(`Reference modified: ${record.path}`);
      const doc = catalog.documents.find((entry) => record.path.endsWith(`/${entry.slug}.md`));
      const resolveLink = (href) => {
        if (/^(?:[a-z][a-z0-9+.-]*:|#|\/)/i.test(href)) return href;
        const target = path.posix.normalize(path.posix.join(path.posix.dirname(record.path), href));
        return provenance.documents.some((item) => item.path === target)
          ? `/review/source/${target.replace(/\.md$/, ".html")}`
          : `https://github.com/${provenance.repository}/blob/${provenance.commit}/docs/legal/${target}`;
      };
      const rendered = renderMarkdown(source.toString("utf8"), resolveLink);
      const title = doc?.title || record.path;
      const version = { version: "draft-2026-09-14", recordedOn: "2026-09-15", effectiveDate: null };
      const body = documentBody({ title }, version, rendered, true);
      const html = htmlPage(title, body, null, true);
      files[`/review/source/${record.path.replace(/\.md$/, ".html")}`] = html;
      if (doc) {
        files[`/review/${doc.slug}`] = html;
        reviewLinks += `<li><a href="/review/${doc.slug}">${escape(title)} — 전문 준비본</a></li>`;
      }
    }
  }
  files["/"] = htmlPage("문서 미리보기", frame("문서 미리보기", `<h2>공개 반영 후보</h2><ul>${publicLinks}</ul>${includeReview ? `<h2>미게시 전문 준비본</h2><p class="legal-notice">이 영역은 로컬 검토용입니다. 원문의 확인 주석을 보존하며 공개 배포에 포함되지 않습니다.</p><ul>${reviewLinks}</ul>` : ""}`), null, true);
  return files;
}

function createServer(includeReview = true) {
  const files = createPreviewFiles(includeReview);
  return http.createServer((req, res) => {
    let uri;
    try { uri = decodeURIComponent(new URL(req.url, "http://localhost").pathname).replace(/\/+$/, "") || "/"; }
    catch { res.writeHead(400); res.end(); return; }
    const data = Object.prototype.hasOwnProperty.call(files, uri) ? files[uri] : null;
    const contentType = uri.endsWith(".css") ? "text/css" : uri.endsWith(".json") ? "application/json" : uri.endsWith(".md") ? "text/plain" : "text/html";
    res.writeHead(data === null ? 404 : 200, { "Content-Type": `${data === null ? "text/html" : contentType}; charset=utf-8`, "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", "X-Content-Type-Options": "nosniff" });
    res.end(data === null ? htmlPage("문서 없음", notFoundBody(), null, true) : data);
  });
}

if (require.main === module) {
  const includeReview = !process.argv.includes("--public");
  const port = includeReview ? 4174 : 4173;
  createServer(includeReview).listen(port, "127.0.0.1", () => {
    console.log(`Legal ${includeReview ? "review" : "public"} preview: http://127.0.0.1:${port}`);
  });
}
module.exports = { createPreviewFiles, createServer };
