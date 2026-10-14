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
  if (/^\\/(terms-of-service|privacy-policy|location-terms|account-deletion|child-safety)(\\/|$)/.test(uri)) {
    if (/\\/index\\.html$/.test(uri) && Object.prototype.hasOwnProperty.call(routes, uri.slice(0, -11))) return request;
    return { statusCode: 404, statusDescription: "Not Found", headers: { "content-type": { value: "text/plain; charset=utf-8" }, "cache-control": { value: "no-store" } }, body: "아직 게시되지 않았거나 존재하지 않는 문서 버전입니다." };
  }
  return request;
}\n`;
  fs.mkdirSync(path.join(root, ".legal-preview"), { recursive: true });
  fs.writeFileSync(path.join(root, ".legal-preview/cloudfront-function.js"), fn);
  // Complete website router: legal artifacts must return before the SPA fallback.
  const routeSource = fs.readFileSync(path.join(root, 'src/config/routes.js'), 'utf8');
  const spaRoutes = [...new Set([...routeSource.matchAll(/path:\s*"([^"]+)"/g)].map(match => match[1])
    .filter(uri => !uri.includes('*')).concat(['/', '/login', '/business', '/business/stores/new', '/admin']))];
  const expressions = spaRoutes.map(uri => '^' + uri.split('/').map(part => part.startsWith(':') ? '[^/]+' : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('/') + '$');
  const complete = fn.replace('function handler(event)', 'function routeLegal(event)') + `
function handler(event) {
  var result = routeLegal(event);
  if (result.statusCode) return result;
  var uri = result.uri;
  if (/^\\/(legal|terms-of-service|privacy-policy|location-terms|account-deletion|child-safety)(\\/|$)/.test(uri)) return result;
  if (/^\\/(static|images)(\\/|$)/.test(uri) || /^\\/(index\\.html|robots\\.txt|sitemap\\.xml|favicon\\.ico|manifest\\.json|logo192\\.png|logo512\\.png)$/.test(uri)) return result;
  var routes = ${JSON.stringify(expressions)};
  var normalized = uri.replace(/\\/+$/, '') || '/';
  for (var i = 0; i < routes.length; i++) {
    if (new RegExp(routes[i]).test(normalized)) { result.uri = '/index.html'; return result; }
  }
  return { statusCode: 404, statusDescription: 'Not Found', headers: { 'content-type': { value: 'text/html; charset=utf-8' }, 'cache-control': { value: 'no-store' } }, body: '<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>페이지를 찾을 수 없습니다 · 접시</title><h1>페이지를 찾을 수 없습니다</h1><p>주소를 확인하거나 홈으로 이동해 주세요.</p><a href="/">접시 홈으로</a></html>' };
}
`;
  fs.writeFileSync(path.join(root, '.legal-preview/cloudfront-viewer-request.js'), complete);
  const sitemapRoutes = ['/', '/faq', ...manifest.documents.filter(doc => doc.currentVersion).map(doc => '/' + doc.slug)];
  fs.writeFileSync(path.join(root, 'build/sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + sitemapRoutes.map(uri => `<url><loc>https://plate-service.com${uri}</loc></url>`).join('\n') + '\n</urlset>\n');
}
console.log(`Legal: ${Object.keys(pages).length} public pages; drafts excluded.`);
