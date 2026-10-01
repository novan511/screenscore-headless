import { cache } from "react";
import { parse, type HTMLElement } from "node-html-parser";
import { WP_SITE, productPermalink } from "./config";
import { UpstreamError, loadWpHtml, wpFetch } from "./http";

/**
 * Client for the reviewflow plugin's user-review flow:
 *  - gate/form state is parsed from the rendered WordPress product page
 *    (the plugin renders either `.rf-form-login-required` or the form itself
 *    depending on the member's cookies),
 *  - submissions proxy through admin-ajax (`reviewflow_submit`) with the
 *    member's per-user nonce,
 *  - approved reviews read from `rf/v1` REST (added to the plugin by us).
 *
 * Every cookie-dependent read uses `revalidate: 0` so the gate/nonce of one
 * visitor can never be cached and served to another.
 */

export type ReviewField =
  | { kind: "text"; name: string; label: string }
  | { kind: "textarea"; name: string; label: string }
  | { kind: "stars"; name: string; label: string };

export interface ReviewGate {
  loggedIn: boolean;
  /** member has already submitted a review for this title */
  alreadyReviewed: boolean;
  nonce: string | null;
  fields: ReviewField[];
}

export interface ReviewSubmission {
  title: string;
  content: string;
  /** keys are the full field names, e.g. `ratings[kekerasan]` */
  ratings: Record<string, number>;
}

export interface SubmitResult {
  success: boolean;
  message: string;
}

export interface MemberReview {
  id: number;
  author: string;
  rating: number | null;
  title: string;
  content: string;
  date: string;
  helpfulCount: number;
  dimensions: { label: string; stars: number }[];
}

/** Parse gate + form fields + nonce out of the WP product page. */
export function parseReviewPage(html: string): ReviewGate {
  const nonceMatch = html.match(/reviewflowAjax\s*=\s*(\{[\s\S]*?\});/);
  let nonce: string | null = null;
  if (nonceMatch) {
    try {
      const cfg: unknown = JSON.parse(nonceMatch[1]);
      const value = (cfg as { nonce?: unknown }).nonce;
      if (typeof value === "string" && value) nonce = value;
    } catch {
      // config absent/malformed — submit will surface a clear error
    }
  }

  const root = parse(html);
  const loginGate = !!root.querySelector(".rf-form-login-required");
  if (loginGate) {
    return { loggedIn: false, alreadyReviewed: false, nonce, fields: [] };
  }
  if (root.querySelector(".rf-form-already")) {
    return { loggedIn: true, alreadyReviewed: true, nonce, fields: [] };
  }
  const form = root.querySelector(".reviewflow-form");
  if (!form) return { loggedIn: false, alreadyReviewed: false, nonce, fields: [] };

  return {
    loggedIn: true,
    alreadyReviewed: false,
    nonce,
    fields: extractFields(form),
  };
}

/**
 * Read the gate for a product as the current visitor.
 * `cookie` is the incoming browser Cookie header — forwarded verbatim so the
 * plugin renders the same state the visitor would see on WordPress itself.
 */
export async function fetchReviewGate(
  slug: string,
  cookie: string | null,
): Promise<ReviewGate> {
  const html = await fetchProductHtml(slug, cookie);
  return html
    ? parseReviewPage(html)
    : { loggedIn: false, alreadyReviewed: false, nonce: null, fields: [] };
}

/**
 * POST the review to admin-ajax as the member: fetch a fresh per-user nonce
 * from the product page, then replay the submission with forwarded cookies.
 */
export async function submitReview(
  slug: string,
  postId: number,
  cookie: string | null,
  submission: ReviewSubmission,
): Promise<SubmitResult> {
  const gate = await fetchReviewGate(slug, cookie);
  if (!gate.loggedIn) {
    return { success: false, message: "Silakan login untuk memberikan review." };
  }
  if (!gate.nonce) {
    return {
      success: false,
      message: "Sesi review tidak ditemukan. Muat ulang halaman lalu coba lagi.",
    };
  }

  const fd = new FormData();
  fd.set("action", "reviewflow_submit");
  fd.set("nonce", gate.nonce);
  fd.set("post_id", String(postId));
  fd.set("title", submission.title);
  fd.set("content", submission.content);
  for (const [name, value] of Object.entries(submission.ratings)) {
    if (name.startsWith("ratings[")) fd.set(name, String(value));
  }

  const res = await wpFetch(`${WP_SITE}/wp-admin/admin-ajax.php`, {
    revalidate: 0,
    init: {
      method: "POST",
      body: fd,
      headers: cookie ? { Cookie: cookie } : undefined,
    },
  });

  const text = await res.text();
  type AjaxResponse = { success?: boolean; data?: { message?: string } };
  let payload: AjaxResponse | null = null;
  try {
    payload = JSON.parse(text) as AjaxResponse;
  } catch {
    // admin-ajax answers `0`/`-1` for a bad nonce or expired session.
    const trimmed = text.trim();
    return {
      success: false,
      message:
        trimmed === "0" || trimmed === "-1"
          ? "Sesi review kedaluwarsa. Muat ulang halaman lalu coba lagi."
          : "WordPress tidak merespons dengan benar. Coba lagi sebentar lagi.",
    };
  }

  return {
    success: payload?.success === true,
    message:
      payload?.data?.message ||
      (payload?.success
        ? "Review berhasil dikirim! Menunggu persetujuan admin."
        : "Terjadi kesalahan. Silakan coba lagi."),
  };
}

/**
 * Approved member reviews via the rf/v1 REST route (our plugin snippet).
 * Returns null when the endpoint does not exist yet — the section then
 * shows its empty state instead of failing the page.
 *
 * When a permalink is supplied and rf/v1 yields nothing, falls back to the
 * HTML bridge: reviewflow server-renders approved reviews into
 * `.rf-list-reviews .rf-review-card[data-review-id]` on the product page
 * itself, so no plugin change is needed to display them. The HTML download
 * is shared (React-cached) with the SEO/score/trailer bridges.
 */
export const fetchMemberReviews = cache(
  async (postId: number, permalink?: string): Promise<MemberReview[] | null> => {
    try {
      const res = await wpFetch(
        `${WP_SITE}/wp-json/rf/v1/reviews?post_id=${postId}`,
      );
      if (res.status !== 404 && res.ok) {
        const data = (await res.json()) as { reviews?: unknown[] };
        if (Array.isArray(data.reviews)) {
          return data.reviews
            .map(mapMemberReview)
            .filter((r): r is MemberReview => r !== null);
        }
      } else if (res.status !== 404 && !res.ok) {
        throw new UpstreamError(`rf/v1 HTTP ${res.status}`);
      }
    } catch (err) {
      if (err instanceof UpstreamError) throw err;
    }

    // No REST source — scrape the server-rendered review list instead.
    if (!permalink) return null;
    try {
      const html = await loadWpHtml(permalink);
      if (!html) return null;
      return parseMemberReviews(html);
    } catch (err) {
      if (err instanceof UpstreamError) throw err;
      return null;
    }
  },
);

/**
 * Parse approved member reviews out of a rendered WordPress product page.
 *
 * The editor card and member cards share the `.rf-review-card` class, but
 * only member cards carry `data-review-id` — and each review appears twice
 * (list + grid), so ids are de-duplicated. Verified against
 * /content/mission-impossible-dead-reckoning-part-one/ (3 reviews).
 */
export function parseMemberReviews(html: string): MemberReview[] {
  const root = parse(html);
  const list = root.querySelector(".rf-list-reviews") ?? root;
  const out: MemberReview[] = [];
  const seen = new Set<number>();

  for (const card of list.querySelectorAll(
    ".rf-review-card[data-review-id]",
  )) {
    const id = Number(card.getAttribute("data-review-id"));
    if (!Number.isFinite(id) || seen.has(id)) continue;
    seen.add(id);

    const text = (sel: string) =>
      card.querySelector(sel)?.text?.trim() ?? "";
    const num = (sel: string): number | null => {
      const raw = text(sel).replace(",", ".");
      const v = Number(raw);
      return raw !== "" && Number.isFinite(v) ? v : null;
    };

    const dimensions: { label: string; stars: number }[] = [];
    for (const row of card.querySelectorAll(".rf-detail-row")) {
      const label = row.querySelector(".rf-detail-label")?.text?.trim() ?? "";
      const stars = row.querySelectorAll(".rf-star.filled").length;
      if (label) dimensions.push({ label, stars });
    }

    const helpfulText = text(".rf-card-helpful");
    const helpful = Number(helpfulText.replace(/[^0-9]/g, ""));
    out.push({
      id,
      author: text(".rf-card-author") || "Member ScreenScore",
      rating: num(".rf-card-avg"),
      title: text(".rf-card-title"),
      content: text(".rf-card-content"),
      date: text(".rf-card-date"),
      helpfulCount: Number.isFinite(helpful) ? helpful : 0,
      dimensions,
    });
  }

  return out;
}

/* ---------------- internals ---------------- */

async function fetchProductHtml(
  slug: string,
  cookie: string | null,
): Promise<string | null> {
  const res = await wpFetch(productPermalink(slug), {
    revalidate: 0,
    accept: "text/html",
    init: { headers: cookie ? { Cookie: cookie } : undefined },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new UpstreamError(`Unexpected HTML status ${res.status} for ${slug}`);
  }
  return res.text();
}

function extractFields(form: HTMLElement | null): ReviewField[] {
  if (!form) return [];
  const fields: ReviewField[] = [];

  if (form.querySelector('input[name="title"]')) {
    fields.push({ kind: "text", name: "title", label: "Judul review" });
  }
  if (form.querySelector('textarea[name="content"]')) {
    fields.push({ kind: "textarea", name: "content", label: "Tulis review kamu" });
  }

  const seen = new Set<string>();
  for (const input of form.querySelectorAll("input")) {
    const name = input.getAttribute("name") ?? "";
    if (!name.startsWith("ratings[") || seen.has(name)) continue;
    seen.add(name);
    const row = input.closest(".rf-rating-row");
    const rowLabel = row?.querySelector("label")?.text?.trim();
    fields.push({
      kind: "stars",
      name,
      label: rowLabel || labelFromSlug(name),
    });
  }

  // Defensive fallback so a member never faces a completely empty form.
  if (!fields.length) {
    fields.push(
      { kind: "text", name: "title", label: "Judul review" },
      { kind: "textarea", name: "content", label: "Tulis review kamu" },
    );
  }
  return fields;
}

function labelFromSlug(name: string): string {
  const slug = name.replace(/^ratings\[/, "").replace(/\]$/, "");
  const words = slug.replace(/[-_]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function mapMemberReview(raw: unknown): MemberReview | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const num = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v)
      ? v
      : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))
        ? Number(v)
        : null;
  const str = (v: unknown): string => (typeof v === "string" ? v : "");

  const dimensions: { label: string; stars: number }[] = [];
  const dims = r.dimensions ?? r.ratings;
  if (Array.isArray(dims)) {
    for (const d of dims) {
      if (d && typeof d === "object") {
        const item = d as Record<string, unknown>;
        const stars = num(item.stars ?? item.value ?? item.rating);
        const label = str(item.label ?? item.name);
        if (stars !== null && label) dimensions.push({ label, stars });
      }
    }
  } else if (dims && typeof dims === "object") {
    for (const [label, value] of Object.entries(dims as Record<string, unknown>)) {
      const stars = num(value);
      if (stars !== null) dimensions.push({ label, stars });
    }
  }

  const id = num(r.id);
  if (id === null) return null;
  return {
    id,
    author: str(r.author ?? r.author_name) || "Member ScreenScore",
    rating: num(r.rating ?? r.stars ?? r.average_rating),
    title: str(r.title),
    content: str(r.content ?? r.comment ?? r.body),
    date: str(r.date ?? r.created_at ?? r.comment_date) || "",
    helpfulCount: num(r.helpful_count ?? r.votes) ?? 0,
    dimensions,
  };
}
