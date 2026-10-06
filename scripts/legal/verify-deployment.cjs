// Read-only release verification. Never submits user data or modifies hosting.
const {createHash} = require('node:crypto');
const origin = new URL(process.argv[2] || 'https://plate-service.com');
let failures = 0;
async function check(uri, test) {
  try {
    const response = await fetch(new URL(uri, origin), {signal: AbortSignal.timeout(15000)});
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!test(response, bytes)) throw new Error('unexpected status, body, MIME or hash');
    console.log(`PASS ${uri}`);
    return bytes;
  } catch (error) {failures++; console.error(`FAIL ${uri}: ${error.message}`); return null;}
}
(async () => {
  const raw = await check('/legal/manifest.json', (r,b) => r.ok && r.headers.get('content-type')?.includes('json') && Array.isArray(JSON.parse(b).documents));
  if (raw) {
    const manifest = JSON.parse(raw);
    for (const doc of manifest.documents) {
      if (doc.currentVersion) await check('/' + doc.slug, (r,b) => r.ok && /<article\b/.test(b.toString()) && !b.includes('static/js/main.'));
      for (const version of doc.versions) {
        version.sourceUrl = `/legal/documents/${doc.id}/${version.version}.md`;
        for (const [urlKey, hashKey] of [['htmlUrl','sha256'], ['sourceUrl','sourceSha256'], ['mobileUrl','mobileSha256']]) {
          if (!version[urlKey] || !version[hashKey]) continue;
          // Check this environment even when its manifest contains canonical production URLs.
          await check(new URL(version[urlKey], origin).pathname, (r,b) => r.ok && createHash('sha256').update(b).digest('hex') === version[hashKey]);
        }
      }
    }
  }
  await check('/sitemap.xml', (r,b) => r.ok && /<urlset\b/.test(b.toString()));
  await check('/terms-of-service/versions/nonexistent-release-check', r => r.status === 404);
  await check('/nonexistent-release-check', r => r.status === 404);
  process.exitCode = failures ? 1 : 0;
})();
