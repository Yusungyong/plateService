const MarkdownIt = require("markdown-it");

// Display transport only. These blocks never constitute a consent request.
function mobileBlocks(source) {
  const md = new MarkdownIt({ html: false, linkify: true });
  const tokens = md.parse(source, {});
  const blocks = [];
  let heading = null;
  let table = null;
  let row = null;
  let item = null;
  let section = 0;
  const lists = [];
  const inline = (children) => {
    const spans = [];
    let bold = 0;
    let href;
    for (const child of children || []) {
      if (child.type === "strong_open") bold++;
      else if (child.type === "strong_close") bold--;
      else if (child.type === "link_open") href = child.attrGet("href");
      else if (child.type === "link_close") href = undefined;
      else if (["text", "code_inline", "softbreak", "hardbreak"].includes(child.type)) {
        const text = child.type.endsWith("break") ? "\n" : child.content;
        if (text) spans.push({ text, ...(bold > 0 ? { bold: true } : {}), ...(href && /^(https:\/\/|mailto:)/.test(href) ? { href } : {}) });
      } else if (!["em_open", "em_close", "s_open", "s_close"].includes(child.type)) {
        throw new Error(`Unsupported mobile inline: ${child.type}`);
      }
    }
    return spans;
  };
  for (const token of tokens) {
    switch (token.type) {
      case "heading_open": heading = Number(token.tag.slice(1)); break;
      case "heading_close": heading = null; break;
      case "bullet_list_open": lists.push({ ordered: false, next: 0 }); break;
      case "ordered_list_open": lists.push({ ordered: true, next: Number(token.attrGet("start") || 1) }); break;
      case "bullet_list_close": case "ordered_list_close": lists.pop(); break;
      case "list_item_open": {
        const list = lists[lists.length - 1];
        item = list.ordered ? `${list.next++}.` : "•";
        break;
      }
      case "list_item_close": item = null; break;
      case "table_open": table = { type: "table", rows: [] }; break;
      case "tr_open": row = []; break;
      case "tr_close": table.rows.push(row); row = null; break;
      case "table_close": blocks.push(table); table = null; break;
      case "inline": {
        const spans = inline(token.children);
        if (row) row.push(spans);
        else if (heading) blocks.push({ type: "heading", id: `section-${++section}`, level: heading, spans });
        else blocks.push({ type: "paragraph", spans, ...(item ? { marker: item } : {}) });
        break;
      }
      case "paragraph_open": case "paragraph_close": case "thead_open": case "thead_close":
      case "tbody_open": case "tbody_close": case "th_open": case "th_close":
      case "td_open": case "td_close": case "blockquote_open": case "blockquote_close": case "hr": break;
      default: throw new Error(`Unsupported mobile block: ${token.type}`);
    }
  }
  return blocks;
}
module.exports = { mobileBlocks };
