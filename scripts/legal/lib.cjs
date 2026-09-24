const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const MarkdownIt = require("markdown-it");
const { mobileBlocks } = require("./mobile.cjs");

const root = path.resolve(__dirname, "../..");
const contentRoot = path.join(root, "content/legal");
const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[c]);
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const slugPattern = /^[a-z0-9][a-z0-9-]*$/;

function renderMarkdown(source, resolveLink = (href) => href) {
  const md = new MarkdownIt({ html: false, linkify: true, typographer: false });
  const tokens = md.parse(source, {});
  const headings = [];
  let sectionTitle = "문서 표";
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token.type === "heading_open") {
      if (token.tag === "h1") {
        token.tag = "p";
        token.attrSet("class", "legal-source-title");
        tokens[i + 2].tag = "p";
      } else {
        const title = tokens[i + 1].content;
        const id = `section-${headings.length + 1}`;
        token.attrSet("id", id);
        headings.push({ id, title });
        sectionTitle = title;
      }
    }
    if (token.type === "table_open") token.meta = { title: sectionTitle };
    for (const child of token.children || []) {
      if (child.type !== "link_open") continue;
      const href = resolveLink(child.attrGet("href"));
      // Markdown HTML stays disabled; link targets cannot execute scripts.
      child.attrSet("href", md.validateLink(href) ? href : "#");
      if (/^https?:/i.test(href)) child.attrSet("rel", "noopener noreferrer");
    }
  }
  md.renderer.rules.table_open = (items, index) =>
    `<div class="legal-table-scroll" role="region" tabindex="0" aria-label="${escape(items[index].meta.title)} 표, 가로 스크롤 가능"><table>`;
  md.renderer.rules.table_close = () => "</table></div>\n";
  md.renderer.rules.th_open = () => '<th scope="col">';
  return { html: md.renderer.render(tokens, md.options, {}), headings };
}

function legalHeader() {
  return '<header class="legal-site-header"><a class="legal-brand" href="/" aria-label="접시 홈으로 이동"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m3 10 9-7 9 7v11h-6v-7H9v7H3Z"/></svg> 접시 <small>홈으로</small></a><nav aria-label="서비스 안내"><a href="/faq">고객지원</a><span>이용 안내</span></nav></header>';
}

function frame(title, inner) {
  return `<div class="legal-site"><a class="legal-skip" href="#legal-main">본문 바로가기</a>
${legalHeader()}
<main id="legal-main" class="legal-page"><h1>${escape(title)}</h1>${inner}</main>
<footer class="legal-footer">접시 · 운영자 유성용 · <a href="mailto:su12ng@gmail.com">su12ng@gmail.com</a></footer></div>`;
}

function documentBody(doc, version, rendered, review = false) {
  const isSnapshot = version.status === "snapshot";
  const status = review ? "미게시 준비본 · 검토 전용" : version.label;
  const notice = review
    ? "공개 약관이 아닙니다. 확인 주석과 미구현 정책을 포함한 준비본이며 시행일은 미확정입니다."
    : isSnapshot
      ? "이 문서는 정비 전 화면의 보관본입니다. 당시 미완성 문구와 이전 연락처를 그대로 보존했으며, 현재 안내나 시행된 약관의 증거가 아닙니다."
      : version.status === "published" ? "이 문서의 시행일과 변경 내용을 확인해 주세요."
        : "확인된 운영 정보를 먼저 정정한 안내입니다. 정식 전문의 시행이나 새로운 동의를 의미하지 않습니다.";
  const toc = rendered.headings.map(({ id, title }) => `<li><a href="#${id}">${escape(title)}</a></li>`).join("");
  return frame(doc.title, `<p class="legal-status">${escape(status)}</p>
<dl class="legal-meta"><div><dt>문서 버전</dt><dd>${escape(version.version)}</dd></div><div><dt>시행일</dt><dd>${escape(version.effectiveDate || "미확정")}</dd></div><div><dt>기록일</dt><dd>${escape(version.recordedOn)}</dd></div></dl>
<p class="legal-notice">${notice}</p>
${review ? '<p><a href="/">준비본 목록으로</a></p>' : `<nav class="legal-actions" aria-label="문서 버전"><a href="/${doc.slug}">현재 안내</a><a href="/${doc.slug}/versions">이전 버전 열람</a><a href="/legal/documents/${doc.id}/${version.version}.md" download>원문 다운로드</a></nav>`}
${toc ? `<nav class="legal-toc" aria-label="문서 목차"><h2>목차</h2><ol>${toc}</ol></nav>` : ""}
<article class="legal-prose" aria-label="${escape(doc.title)} 본문">${rendered.html}</article>
<p class="legal-back-top"><a href="#legal-main">맨 위로</a></p>`);
}

function htmlPage(title, body, canonical, noindex = false) {
  // No React bootstrap: fetch(), disabled JS and native app readers see the same text.
  return `<!doctype html>\n<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(title)} | 접시</title><meta name="description" content="접시 ${escape(title)} 및 버전 안내">${canonical ? `<link rel="canonical" href="${escape(canonical)}">` : ""}${noindex ? '<meta name="robots" content="noindex, nofollow">' : ""}<link rel="stylesheet" href="/legal/legal.css"></head><body>${body}</body></html>\n`;
}

function loadPublic({ allowUnfrozen = false } = {}) {
  const catalog = readJson(path.join(contentRoot, "catalog.json"));
  const files = {};
  const pages = {};
  const manifest = { schemaVersion: 1, purpose: "DOCUMENT_DISPLAY_ONLY", documents: [] };
  for (const doc of catalog.documents) {
    if (!slugPattern.test(doc.slug) || !slugPattern.test(doc.id)) throw new Error("Invalid document path");
    const versions = new Set();
    const publicDoc = { id: doc.id, slug: doc.slug, title: doc.title, currentVersion: doc.currentVersion, versions: [] };
    for (const version of doc.versions) {
      if (!version.htmlSha256 && !allowUnfrozen) throw new Error("Freeze new HTML versions before building");
      if (!slugPattern.test(version.version) || versions.has(version.version)) throw new Error("Invalid/duplicate version");
      versions.add(version.version);
      if (!["snapshot", "correction", "published"].includes(version.status)) throw new Error("Drafts cannot enter public catalog");
      if (!version.source.startsWith("public/") || version.source.includes("..")) throw new Error("Public source path required");
      const source = fs.readFileSync(path.join(contentRoot, version.source));
      if (hash(source) !== version.sourceSha256) throw new Error(`Source changed: ${version.source}. Create a new version.`);
      if (version.status === "published" && (!/^\d{4}-\d{2}-\d{2}$/.test(version.effectiveDate || "") || !version.releaseEvidence)) {
        throw new Error("Published documents require an effective date and release evidence");
      }
      if (version.status !== "snapshot" && /\[.*(?:확인 필요|구현 확인|게시 전 확인)|미게시 초안|검토용 초안/.test(source.toString("utf8"))) {
        throw new Error("Unresolved review notes cannot be published");
      }
      const rendered = renderMarkdown(source.toString("utf8"));
      let body = documentBody(doc, version, rendered);
      const versionPath = `/${doc.slug}/versions/${version.version}`;
      const htmlPath = `/legal/documents/${doc.id}/${version.version}.html`;
      let fullHtml = htmlPage(doc.title, body, catalog.origin + versionPath, version.status !== "published");
      if (version.htmlSha256) {
        const artifact = fs.readFileSync(path.join(contentRoot, "artifacts", doc.id, `${version.version}.html`));
        if (hash(artifact) !== version.htmlSha256) throw new Error(`Immutable HTML changed: ${doc.id}/${version.version}`);
        fullHtml = artifact.toString("utf8");
        body = fullHtml.match(/<body>([\s\S]*)<\/body>/)[1];
      }
      // The downloadable artifact stays immutable. Browsing pages use today's navigation.
      const displayBody = body.replace(/<header class="legal-site-header">[\s\S]*?<\/header>/, legalHeader());
      const displayHtml = fullHtml.replace(/<body>[\s\S]*<\/body>/, () => `<body>${displayBody}</body>`);
      pages[versionPath] = { title: doc.title, body: displayBody, noindex: version.status !== "published" };
      files[`${versionPath.slice(1)}/index.html`] = displayHtml;
      files[htmlPath.slice(1)] = fullHtml;
      files[`legal/documents/${doc.id}/${version.version}.md`] = source;
      const mobile = JSON.stringify({ schemaVersion: 1, purpose: "DOCUMENT_DISPLAY_ONLY",
        documentId: doc.id, title: doc.title, version: version.version, status: version.status,
        label: version.label, effectiveDate: version.effectiveDate, recordedOn: version.recordedOn,
        changeSummary: version.changeSummary, consentEligible: version.status === "published",
        sourceSha256: hash(source), sourceMarkdown: source.toString("utf8"),
        blocks: mobileBlocks(source.toString("utf8")) }) + "\n";
      // Content-addressed paths prevent renderer changes overwriting an old packet.
      const mobileSha256 = hash(mobile);
      const mobilePath = `/legal/mobile/v1/${doc.id}/${version.version}.${mobileSha256}.json`;
      files[mobilePath.slice(1)] = mobile;
      publicDoc.versions.push({ version: version.version, status: version.status, effectiveDate: version.effectiveDate,
        recordedOn: version.recordedOn, changeSummary: version.changeSummary, url: catalog.origin + versionPath,
        htmlUrl: catalog.origin + htmlPath, sha256: hash(fullHtml), sourceSha256: hash(source),
        consentEligible: version.status === "published", mobileUrl: catalog.origin + mobilePath, mobileSha256 });
      if (version.version === doc.currentVersion) {
        pages[`/${doc.slug}`] = pages[versionPath];
        files[`${doc.slug}/index.html`] = displayHtml;
      }
    }
    if (doc.currentVersion && !versions.has(doc.currentVersion)) throw new Error("Current version missing");
    if (doc.currentVersion) {
      const rows = publicDoc.versions.map((v) => `<li><a href="/${doc.slug}/versions/${v.version}">${escape(v.version)}</a><p>시행일: ${escape(v.effectiveDate || "미확정")} · 기록일: ${escape(v.recordedOn)}</p><p>${escape(v.changeSummary)}</p></li>`).join("");
      const body = frame(`${doc.title} 버전 이력`, `<p class="legal-notice">기록일은 시행일이 아닙니다. 기존 화면 보관본은 과거 동의나 시행 사실을 증명하지 않습니다.</p><a href="/${doc.slug}">현재 안내로 돌아가기</a><ol class="legal-history">${rows}</ol>`);
      pages[`/${doc.slug}/versions`] = { title: `${doc.title} 버전 이력`, body, noindex: true };
      files[`${doc.slug}/versions/index.html`] = htmlPage(doc.title, body, `${catalog.origin}/${doc.slug}/versions`, true);
    }
    manifest.documents.push(publicDoc);
  }
  return { catalog, pages, files, manifest };
}

function notFoundBody() {
  return frame("문서를 찾을 수 없습니다", '<p>아직 게시되지 않았거나 존재하지 않는 문서 버전입니다.</p><p><a href="/terms-of-service">이용약관 안내</a> · <a href="/privacy-policy">개인정보 처리방침 안내</a></p>');
}

module.exports = { root, contentRoot, escape, hash, readJson, renderMarkdown, frame, documentBody, htmlPage, loadPublic, notFoundBody };
