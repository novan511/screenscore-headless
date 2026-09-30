import { NodeType, parse, type HTMLElement, type Node } from "node-html-parser";
import { sanitizeWpHtml } from "./utils";

/**
 * Article presentation layer for the detail page.
 *
 * WordPress articles arrive as editor soup: section titles are plain short
 * paragraphs ("Sinopsis Singkat", "Kecocokan dengan Anak:"), fact sheets are
 * bullet lists of "Label: value" pairs, and real <h2>s are rare. This module
 * normalises that markup server-side (once per ISR render) so the page can
 * typeset it like an editorial piece: real headings with anchor ids, a fact
 * card, and a table of contents — without touching the copy itself.
 */

export interface TocItem {
  id: string;
  text: string;
}

export interface ArticleRender {
  html: string;
  toc: TocItem[];
}

const BLOCK_SELECTOR =
  "p, div, ul, ol, table, blockquote, figure, h1, h2, h3, h4, h5, h6";

export function renderArticle(body: string): ArticleRender {
  const safe = sanitizeWpHtml(body);
  if (!safe.trim()) return { html: "", toc: [] };

  const root = parse(safe);
  dropEmptyBlocks(root);
  promoteHeadings(root);
  styleFactLists(root);
  const toc = assignHeadingIds(root);

  return { html: root.toString().trim(), toc };
}

/** Remove <p>/<div> wrappers that carry no text and no structure. */
function dropEmptyBlocks(root: HTMLElement): void {
  const nodes = root.querySelectorAll("p, div").reverse();
  for (const el of nodes) {
    if (el.textContent.trim()) continue;
    if (el.querySelector("hr, table")) continue;
    el.remove();
  }
}

/**
 * Promote section-title paragraphs to <h2>.
 *
 * Deepest-first so an inner promotion becomes a block child and disqualifies
 * its wrapper from being promoted a second time.
 */
function promoteHeadings(root: HTMLElement): void {
  const nodes = root.querySelectorAll("h1, p, div").reverse();
  for (const el of nodes) {
    const tag = el.tagName.toLowerCase();

    // The page <h1> is the product title — demote any in-body <h1>.
    if (tag === "h1") {
      el.tagName = "h2";
      continue;
    }

    // Facts/lists/quotes carry their own context; never promote from inside.
    if (el.closest("li, td, th, blockquote, h1, h2, h3, h4, h5, h6")) continue;
    // A wrapper around real blocks is not a heading.
    if (el.querySelector(BLOCK_SELECTOR)) continue;

    const text = collapse(el.textContent);
    if (!isHeadingText(el, text)) continue;

    el.tagName = "h2";
  }
}

/** "Label: value" bullet lists become a fact card. */
function styleFactLists(root: HTMLElement): void {
  for (const list of root.querySelectorAll("ul, ol")) {
    const items = list.children.filter((c) => c.tagName.toLowerCase() === "li");
    if (items.length < 3) continue;
    const matches = items.filter((li) => FACT_LABEL.test(collapse(li.textContent)));
    if (matches.length / items.length < 0.6) continue;

    list.setAttribute("class", "ss-facts");
    for (const li of items) splitFactLabel(li);
  }
}

// Lookahead keeps the value's first character out of the match so it is not
// lost when the label is split off; the spacing moves into `rest`.
const FACT_LABEL = /^([A-Za-z][^:]{1,38}):(\s*)(?=\S)/;

/**
 * Bold the "Label:" prefix inside a fact row. Three source shapes appear in
 * the wild: a bare text node, a <b>Label:</b> sibling, or one inline element
 * holding the whole "Label: value" string — handled in that order.
 */
function splitFactLabel(li: HTMLElement): void {
  const walker = li.querySelectorAll("*");
  const candidates: HTMLElement[] = [li, ...walker];

  for (const el of candidates) {
    for (const child of [...el.childNodes]) {
      if (child.nodeType !== NodeType.TEXT_NODE) continue;
      const raw = child.textContent;
      const match = raw.match(FACT_LABEL);
      if (!match) continue;

      const label = match[1] + ":";
      const rest = match[2] + raw.slice(match[0].length);
      replaceChildWithHtml(el, child, `<b class="ss-fact-label">${label}</b>${rest}`);
      return;
    }

    // <b>Genre:</b> sitting next to its value: just mark the element.
    const own = collapse(el.textContent);
    if (
      el.tagName.toLowerCase() !== "li" &&
      own.endsWith(":") &&
      own.length <= 42
    ) {
      el.setAttribute("class", "ss-fact-label");
      return;
    }
  }
}

/**
 * Swap one child node for an HTML fragment. Text nodes expose no
 * `replaceWith`, so the child list is patched directly — serialization only
 * walks `childNodes`.
 */
function replaceChildWithHtml(parent: HTMLElement, child: Node, html: string): void {
  const nodes = parse(html).childNodes;
  const idx = parent.childNodes.indexOf(child);
  if (idx === -1) return;
  for (const node of nodes) node.parentNode = parent;
  parent.childNodes.splice(idx, 1, ...nodes);
}

/** Slug ids for every heading; collect the table of contents. */
function assignHeadingIds(root: HTMLElement): TocItem[] {
  const toc: TocItem[] = [];
  const seen = new Map<string, number>();

  for (const el of root.querySelectorAll("h2, h3")) {
    const text = collapse(el.textContent);
    if (!text) continue;

    let id = slugify(text) || `bagian-${toc.length + 1}`;
    const count = seen.get(id) ?? 0;
    seen.set(id, count + 1);
    if (count > 0) id = `${id}-${count + 1}`;
    el.setAttribute("id", id);
    toc.push({ id, text });
  }
  return toc;
}

/**
 * A paragraph is a section title when it is short and title-shaped:
 * ends with a colon (but is not a sentence followed by a colon), is fully
 * bold, or is a multi-word fragment with no sentence-ending punctuation.
 */
function isHeadingText(el: HTMLElement, text: string): boolean {
  if (!text || text.length > 110) return false;
  // A lone domain is a source credit, not a heading.
  if (/^[\w.-]+\.[a-z]{2,}$/i.test(text)) return false;
  // Sentences stay paragraphs.
  if (/[.!?,;]$/.test(text)) return false;

  if (text.endsWith(":")) {
    // "Judul 2026. Rekomendasi:" — sentence + label, leave it alone.
    if (text.lastIndexOf(".") > -1) return false;
    return text.length <= 60;
  }

  if (isFullyBold(el)) return text.length <= 90;
  if (text.includes(" ")) return text.length <= 90;
  // Single word ("Sinopsis") only when clearly word-like and compact.
  return text.length <= 30 && /^[A-Za-z][A-Za-z &/'-]*$/.test(text);
}

function isFullyBold(el: HTMLElement): boolean {
  const strongs = el.querySelectorAll("b, strong");
  if (!strongs.length) return false;
  const covered = strongs.map((s) => s.textContent).join("");
  return collapse(covered) === collapse(el.textContent);
}

function collapse(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
