import { cache } from "react";
import { ENDPOINTS, SITE } from "./config";
import { UpstreamError, wpFetch } from "./http";
import { clamp, decodeEntities, seededShuffle, stripMetaList, stripTags } from "./utils";
import type { Paged, SeoMeta, Term, Title, TitleImage } from "./types";

/**
 * WooCommerce Store API client — the source of truth for titles.
 * (WPGraphQL on this site does not register the `product` post type,
 * so titles come from REST while everything else uses GraphQL.)
 *
 * Reads are wrapped in React `cache()` so a route that needs the same product
 * twice (generateMetadata + page) only hits WordPress once per request.
 */

interface StoreProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  short_description: string;
  description: string;
  average_rating: string;
  review_count: number;
  images: { src: string; srcset?: string; alt: string }[];
  categories: Term[];
  tags: Term[];
}

interface ListParams {
  category?: string;
  tag?: string;
  search?: string;
  page?: number;
  perPage?: number;
  orderby?: string;
  order?: string;
}

export const fetchTitles = cache(
  async (params: ListParams = {}): Promise<Paged<Title>> => {
    const qs = new URLSearchParams();
    if (params.category) qs.set("category", params.category);
    if (params.tag) qs.set("tag", params.tag);
    if (params.search) qs.set("search", params.search);
    qs.set("page", String(params.page ?? 1));
    qs.set("per_page", String(params.perPage ?? 16));
    if (params.orderby) qs.set("orderby", params.orderby);
    if (params.order) qs.set("order", params.order);

    const res = await wpFetch(`${ENDPOINTS.store}/products?${qs}`);
    // A bad filter/param is a programming error, not "no content".
    if (!res.ok) throw new Error(`Store API HTTP ${res.status}`);

    const raw = (await res.json()) as StoreProduct[];
    const total = Number(res.headers.get("x-wp-total") ?? raw.length);
    const totalPages = Number(res.headers.get("x-wp-totalpages") ?? 1);
    return {
      items: raw.map(mapTitle),
      page: params.page ?? 1,
      total,
      totalPages,
    };
  },
);

/**
 * Returns `null` only when WordPress answered and the product genuinely does
 * not exist. A WordPress outage throws instead, so the route fails loudly
 * rather than minting a 404 that ISR would cache for five minutes.
 */
export const fetchTitleBySlug = cache(
  async (slug: string): Promise<Title | null> => {
    const res = await wpFetch(
      `${ENDPOINTS.store}/products?slug=${encodeURIComponent(slug)}&per_page=1`,
    );
    if (!res.ok) {
      throw new UpstreamError(`Store API HTTP ${res.status} for slug=${slug}`);
    }
    const raw = (await res.json()) as StoreProduct[];
    return raw[0] ? mapTitle(raw[0]) : null;
  },
);

/** Latest titles in a category (used by rails / hero). */
export const fetchLatest = cache(
  async (category: string, perPage = 12): Promise<Title[]> => {
    const p = await fetchTitles({
      category,
      perPage,
      orderby: "date",
      order: "desc",
    });
    return p.items;
  },
);

/** Related titles: same-category pool enriched by shared tags, then
 * deterministically shuffled per page (stable across ISR renders). */
export const fetchRelated = cache(
  async (
    categorySlug: string,
    excludeSlug: string,
    perPage = 10,
    tagSlugs: string[] = [],
  ): Promise<Title[]> => {
    // Tag matches first (most topically related), then the latest pool as
    // filler. Newer catalogue entries carry no tags at all, so the category
    // pool — deliberately wider than the old 12 — is the real workhorse.
    const [latest, ...tagged] = await Promise.all([
      fetchTitles({
        category: categorySlug,
        perPage: 30,
        orderby: "date",
        order: "desc",
      }).catch(() => null),
      ...tagSlugs.slice(0, 3).map((tag) =>
        fetchTitles({ category: categorySlug, perPage: 12, tag }).catch(
          () => null,
        ),
      ),
    ]);

    const seen = new Set<string>([excludeSlug]);
    const pool: Title[] = [];
    for (const batch of [...tagged, latest]) {
      for (const t of batch?.items ?? []) {
        if (seen.has(t.slug)) continue;
        seen.add(t.slug);
        pool.push(t);
      }
    }

    return seededShuffle(pool, excludeSlug).slice(0, perPage);
  },
);

function mapTitle(p: StoreProduct): Title {
  const shortDescription = p.short_description ?? "";
  const description = p.description ?? "";
  const { year, ageRating, excerpt } = parseShortDescription(shortDescription);
  const name = decodeEntities(p.name);
  const images: TitleImage[] = p.images.map((i) => ({
    src: i.src,
    srcSet: i.srcset,
    alt: i.alt || "",
  }));
  return {
    id: p.id,
    slug: p.slug,
    name,
    permalink: p.permalink,
    shortDescription,
    description,
    body: resolveBody(description, shortDescription),
    images,
    categories: p.categories ?? [],
    tags: p.tags ?? [],
    averageRating: Number(p.average_rating ?? 0),
    reviewCount: p.review_count ?? 0,
    year,
    ageRating,
    // WP often repeats the title as the "excerpt" — drop the duplicate
    excerpt: excerpt && excerpt !== name ? excerpt : undefined,
  };
}

/**
 * Pick the copy that actually has content.
 *
 * Roughly a third of the catalogue (including most games) publishes the whole
 * article into `short_description` and leaves `description` blank — rendering
 * only `description` is what made those detail pages look empty.
 */
function resolveBody(description: string, shortDescription: string): string {
  const desc = description.trim();
  if (desc) return desc;

  const short = shortDescription.trim();
  if (!short) return "";
  // Short blurbs (year/age list + one hook line) stay in the header, not the body.
  if (stripTags(short).length < 400) return "";
  return stripMetaList(short);
}

/**
 * short_description layout from WP:
 *   <ul><li>2000</li><li>7+</li></ul><p>hook line…</p>
 * Long-form products instead ship a full article here.
 */
function parseShortDescription(html: string): {
  year?: string;
  ageRating?: string;
  excerpt?: string;
} {
  const lis = [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) =>
    stripTags(m[1]).trim(),
  );
  const paragraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) =>
    stripTags(m[1]).trim(),
  );
  const year = lis.find((t) => /^\d{4}$/.test(t));
  const ageRating = lis.find((t) => /\d+\s*\+/.test(t) && t.length <= 6);
  const excerpt =
    paragraphs.find(Boolean) ??
    // Long-form posts have no leading <p> — fall back to the opening sentence.
    firstSentence(stripTags(stripMetaList(html)));
  return { year, ageRating, excerpt };
}

function firstSentence(text: string): string | undefined {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return undefined;
  const match = cleaned.match(/^(.{40,}?[.!?])(\s|$)/);
  return clamp(match ? match[1] : cleaned, 200) || undefined;
}
