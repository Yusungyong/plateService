// Explicit local export for the app's development-only review screen.
// Never called by prebuild/postbuild or included in public files.
const fs = require("node:fs");
const path = require("node:path");
const {hash} = require("./lib.cjs");
const {mobileBlocks} = require("./mobile.cjs");
const sourceRoot = process.argv[2];
if (!sourceRoot) throw new Error("Pass the app docs/legal/drafts/2026-09-14 directory");
const result = {};
for (const [type, slug] of [["terms", "terms-of-service"], ["privacy", "privacy-policy"]]) {
  const source = fs.readFileSync(path.join(sourceRoot, `${slug}.md`), "utf8");
  result[type] = {title: type === "terms" ? "서비스 이용약관 검토본" : "개인정보 처리방침 검토본",
    sourceSha256: hash(source), blocks: mobileBlocks(source)};
}
process.stdout.write(JSON.stringify(result, null, 2) + "\n");
