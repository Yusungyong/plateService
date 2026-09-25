const fs = require("node:fs");
const path = require("node:path");
const { root, loadPublic, htmlPage, notFoundBody } = require("./lib.cjs");

const { pages, files, manifest } = loadPublic();
const generated = path.join(root, "src/legal/generated.json");
fs.mkdirSync(path.dirname(generated), { recursive: true });
// Only loadPublic-verified immutable Markdown enters downloadable browser blobs.
// Generic SPA hosting may rewrite .md requests to index.html.
const downloads = Object.fromEntries(Object.entries(files)
  .filter(([relative]) => /^legal\/documents\/[^/]+\/[^/]+\.md$/.test(relative))
  .map(([relative, source]) => ['/' + relative, {
    filename: relative.split('/').slice(-2).join('-'),
    source: source.toString('utf8'),
  }]));
fs.writeFileSync(generated, JSON.stringify({ pages, downloads, notFound: notFoundBody() }));

if (process.argv.includes("--build")) {
  files["legal/legal.css"] = fs.readFileSync(path.join(root, "src/legal/legal.css"));
  files["legal/manifest.json"] = JSON.stringify(manifest, null, 2) + "\n";
  files["legal/not-found.html"] = htmlPage("문서를 찾을 수 없습니다", notFoundBody(), null, true);
  for (const [relative, content] of Object.entries(files)) {
    const target = path.join(root, "build", relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  // Deploy this viewer-request function before a generic SPA rewrite.
  const routes = Object.fromEntries(Object.keys(pages).map((uri) => [uri, `${uri}/index.html`]));
  const fn = `function handler(event) {
  var request = event.request;
  var uri = request.uri.replace(/\\/+$/, "");
  var routes = ${JSON.stringify(routes)};
  var staticFiles = ${JSON.stringify(Object.fromEntries(Object.keys(files).filter(key => key.startsWith('legal/')).map(key => ['/' + key, true])))};
  if (Object.prototype.hasOwnProperty.call(routes, uri)) {
    request.uri = routes[uri];
    return request;
  }
  if (/^\\/legal(\\/|$)/.test(uri) && !Object.prototype.hasOwnProperty.call(staticFiles, uri)) {
    return { statusCode: 404, statusDescription: "Not Found", headers: { "cache-control": { value: "no-store" } }, body: "Document not found" };
  }
  if (/^\\/(terms-of-service|privacy-policy|location-terms)(\\/|$)/.test(uri)) {
    if (/\\/index\\.html$/.test(uri) && Object.prototype.hasOwnProperty.call(routes, uri.slice(0, -11))) return request;
    return { statusCode: 404, statusDescription: "Not Found", headers: { "content-type": { value: "text/plain; charset=utf-8" }, "cache-control": { value: "no-store" } }, body: "아직 게시되지 않았거나 존재하지 않는 문서 버전입니다." };
  }
  return request;
}\n`;
  fs.mkdirSync(path.join(root, ".legal-preview"), { recursive: true });
  fs.writeFileSync(path.join(root, ".legal-preview/cloudfront-function.js"), fn);
}
console.log(`Legal: ${Object.keys(pages).length} public pages; drafts excluded.`);
