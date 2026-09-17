const fs = require("node:fs");
const path = require("node:path");
const { contentRoot, readJson, loadPublic, hash } = require("./lib.cjs");

const [documentId, versionId] = process.argv.slice(2);
const catalogFile = path.join(contentRoot, "catalog.json");
const catalog = readJson(catalogFile);
const doc = catalog.documents.find((entry) => entry.id === documentId);
const version = doc?.versions.find((entry) => entry.version === versionId);
if (!version || version.htmlSha256) {
  throw new Error("Specify a registered NEW version without an HTML hash. Existing versions are immutable.");
}
const { files } = loadPublic({ allowUnfrozen: true });
const html = files[`legal/documents/${doc.id}/${version.version}.html`];
const target = path.join(contentRoot, "artifacts", doc.id, `${version.version}.html`);
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, html, { flag: "wx" });
version.htmlSha256 = hash(html);
fs.writeFileSync(catalogFile, JSON.stringify(catalog, null, 2) + "\n");
console.log(`Frozen ${doc.id}/${version.version}; not deployed.`);
