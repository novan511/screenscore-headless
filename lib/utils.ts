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

/**
 * Deterministic shuffle (mulberry32 over a string hash): the same seed
 * always yields the same order, so ISR output stays stable while different
 * pages get different mixes. Used for "related" rails — pure recency made
 * every rail look identical.
 */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rand = () => {
    h |= 0;
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Turn a scraped Yoast description into a usable meta description.
 *
 * Yoast often auto-generates these by concatenating the page's own opening
 * blocks, so `/tentang-kami` shipped "Tentang Kami Tentang Screen Score Screen
 * time menjadi…" — the H1 twice in a row. Search engines truncate that into a
 * meaningless snippet, so drop a leading repeat of the title and clamp to the
 * ~155 characters a SERP actually shows.
 */
export function metaDescription(
  raw: string | undefined,
  title: string,
  max = 155,
): string | undefined {
  if (!raw) return undefined;

  let text = raw.replace(/\s+/g, " ").trim();
  if (!text) return undefined;

  // Tolerate Yoast separating the repeated title with a pipe or dash.
  const titleRe = new RegExp(
    `^${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[|\\-–—:]?\\s*`,
    "i",
  );
  if (titleRe.test(text)) {
    text = text.replace(titleRe, "").trim();
  }

  /*
   * Yoast builds descriptions out of the post's first blocks, so a lead
   * paragraph that is really a section heading ("Sinopsis Lengkap",
   * "Review Lengkap") becomes the opening words of the meta description.
   * Drop that label so the snippet starts on the actual sentence.
   */
  text = text.replace(
    /^(?:sinopsis(?:\s+lengkap)?|review(?:\s+lengkap)?|ulasan(?:\s+lengkap)?|ringkasan|deskripsi|tentang)\s*[:\-–—]?\s*/i,
    "",
  );

  /*
   * "Tentang" is often followed by the brand itself, so stripping just the
   * label leaves "Tentang Screen Score Screen time…" — the site name twice in
   * a row before the real sentence starts. Drop the brand mention too.
   */
  text = text.replace(
    /^(?:screen\s?score|screenscore)\s*[:\-–—]?\s*/i,
    "",
  );

  if (!text) return undefined;

  // Capitalise the first letter left behind by the strip above.
  text = text.charAt(0).toUpperCase() + text.slice(1);
  return clamp(text, max);
}


/**
 * Project a full `Title` down to the card fields before it crosses into a
 * client component — see `TitleCard`. Keeps article bodies and tag lists out
 * of the RSC payload on every page that renders a poster card from a client
 * boundary (today: the homepage carousel rows).
 */
export function toCard(t: import("./types").Title): import("./types").TitleCard {
  return {
    id: t.id,
    slug: t.slug,
    name: t.name,
    images: t.images.slice(0, 1),
    categories: t.categories.slice(0, 1),
    averageRating: t.averageRating,
    reviewCount: t.reviewCount,
    year: t.year,
    ageRating: t.ageRating,
  };
}
