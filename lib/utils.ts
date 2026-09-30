/** Small shared helpers for formatting and markup. */

export function formatRating(n: number): string {
  if (!n) return "";
  return n % 1 === 0 ? `${n}.0` : n.toFixed(1);
}

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/** Truncate plain text with an ellipsis. */
export function clamp(text: string, max = 180): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}

/** Collapse HTML to plain text. */
export function stripTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;|&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#8211;/g, "–")
    // Curly quotes and other numeric entities stay literal otherwise — the
    // excerpt would render as "&#8220;text&#8221;" once React escapes it.
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

/** Decode the handful of entities WP leaves in review text. */
export function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&#8217;/g, "'")
    .replace(/&#8211;/g, "–")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

/** Tags allowed through to dangerouslySetInnerHTML. Everything else is dropped. */
const SAFE_TAGS = new Set([
  "p", "br", "hr", "b", "strong", "i", "em", "u", "s", "sup", "sub",
  "ul", "ol", "li", "blockquote", "h1", "h2", "h3", "h4", "h5", "h6",
  "span", "div", "figure", "figcaption", "table", "thead", "tbody", "tr", "th", "td",
]);

/**
 * Keep trusted WP HTML but strip everything except basic formatting.
 *
 * Order matters: entities are decoded *before* tag parsing so `&lt;script&gt;`
 * can never become a live tag, and every surviving tag is re-emitted from a
 * whitelist with **all attributes removed** — a `<p onclick=…>` from a
 * compromised or messy post must not reach the browser.
 *
 * Used for synopses and editor reviews rendered via dangerouslySetInnerHTML.
 */
export function sanitizeWpHtml(html: string, maxLength = 20000): string {
  const decoded = decodeEntities(html);

  const cleaned = decoded.replace(/<[^>]*>/g, (tag) => {
    const name = tag.match(/^<\/?([a-z0-9]+)/i)?.[1]?.toLowerCase() ?? "";
    if (!SAFE_TAGS.has(name)) return "";
    if (tag.startsWith("</")) return `</${name}>`;
    if (name === "br") return "<br/>";
    if (name === "hr") return "<hr/>";
    return `<${name}>`;
  });

  return cleaned.length > maxLength
    ? cleaned.slice(0, maxLength) + "…"
    : cleaned;
}

/* ---------------------------------------------------------------------------
 * Article body sanitizer — blog posts keep links and images, everything else
 * follows the same whitelist philosophy as sanitizeWpHtml.
 * ------------------------------------------------------------------------- */

const ARTICLE_TAGS = new Set([
  ...SAFE_TAGS,
  "a", "img", "code", "pre", "figure", "figcaption",
]);

const SAFE_URL = /^(https?:\/\/|\/(?!\/)|#)/i;
const IMG_URL = /^https?:\/\//i;

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function safeHref(raw: string): string | null {
  const v = raw.trim();
  // Reject javascript:, data:, protocol-relative //host, and control chars.
  if (!SAFE_URL.test(v) || /[\u0000-\u001f]/.test(v)) return null;
  return v;
}

function safeImgSrc(raw: string): string | null {
  const v = raw.trim();
  if (!IMG_URL.test(v) || /[\u0000-\u001f]/.test(v)) return null;
  return v;
}

/**
 * Sanitized HTML for long-form articles: like sanitizeWpHtml, but `a[href]`
 * and `img[src|alt|loading]` survive with protocol-checked values so the
 * whitelisted tags are still safe against XSS.
 */
export function sanitizeArticleHtml(html: string, maxLength = 120000): string {
  const decoded = decodeEntities(html);

  const cleaned = decoded.replace(/<[^>]*>/g, (tag) => {
    const m = tag.match(/^<\/?([a-z0-9]+)((?:[^>"']|"[^"]*"|'[^']*')*)(\/?)>$/i);
    if (!m) return "";
    const name = m[1].toLowerCase();
    if (!ARTICLE_TAGS.has(name)) return "";
    if (tag.startsWith("</")) return `</${name}>`;
    if (name === "br") return "<br/>";
    if (name === "hr") return "<hr/>";

    // Collect attributes (values may be quoted or bare).
    const attrs: Record<string, string> = {};
    const attrRe = /([a-zA-Z][a-zA-Z0-9-]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
    let am: RegExpExecArray | null;
    while ((am = attrRe.exec(m[2] ?? "")) !== null) {
      const key = am[1].toLowerCase();
      const value = am[3] ?? am[4] ?? am[5] ?? "";
      attrs[key] = value;
    }

    if (name === "a") {
      const href = attrs.href ? safeHref(attrs.href) : null;
      if (!href) return ""; // drop the tag, keep inner text
      const external = /^https?:\/\//i.test(href);
      const rel = external ? ' rel="noopener noreferrer"' : "";
      return `<a href="${escapeAttr(href)}"${rel}>`;
    }

    if (name === "img") {
      const src = attrs.src ? safeImgSrc(attrs.src) : null;
      if (!src) return "";
      const alt = attrs.alt ? ` alt="${escapeAttr(attrs.alt)}"` : ' alt=""';
      const loading =
        attrs.loading === "eager" ? "eager" : "lazy";
      return `<img src="${escapeAttr(src)}"${alt} loading="${loading}"/>`;
    }

    return `<${name}>`;
  });

  return cleaned.length > maxLength
    ? cleaned.slice(0, maxLength) + "…"
    : cleaned;
}

/**
 * Drop a leading year/age metadata list (`<ul><li>2020</li><li>7+</li></ul>`)
 * so it is not re-rendered as the first bullet of the body copy.
 */
export function stripMetaList(html: string): string {
  return html.replace(/^\s*<ul[^>]*>[\s\S]*?<\/ul>/i, (block) => {
    const items = [...block.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) =>
      stripTags(m[1]).trim(),
    );
    const isMeta =
      items.length > 0 &&
      items.every(
        (t) =>
          /^\d{4}$/.test(t) ||
          /^\d{1,2}\+$/.test(t) ||
          /^\d{1,2}$/.test(t) ||
          /\d+\s*(tahun|thn|bulan|\+)/i.test(t),
      );
    return isMeta ? "" : block;
  });
}

/** Pagination window helper. */
export function pageWindow(page: number, totalPages: number, span = 2): number[] {
  const start = Math.max(1, page - span);
  const end = Math.min(totalPages, page + span);
  const out: number[] = [];
  for (let i = start; i <= end; i++) out.push(i);
  return out;
}
