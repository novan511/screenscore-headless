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

/**
 * Keep trusted WP HTML but strip everything except basic inline formatting.
 * Used for synopses and editor reviews rendered via dangerouslySetInnerHTML.
 */
export function sanitizeWpHtml(html: string, maxLength = 20000): string {
  return decodeEntities(html)
    .replace(/<(?!\/?(b|strong|i|em|br|p|ul|ol|li)\b)[^>]*>/gi, "")
    .slice(0, maxLength);
}

/** Pagination window helper. */
export function pageWindow(page: number, totalPages: number, span = 2): number[] {
  const start = Math.max(1, page - span);
  const end = Math.min(totalPages, page + span);
  const out: number[] = [];
  for (let i = start; i <= end; i++) out.push(i);
  return out;
}
