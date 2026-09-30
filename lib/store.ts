import { ENDPOINTS, SITE } from "./config";
import { decodeEntities } from "./utils";
import type { Paged, SeoMeta, Term, Title, TitleImage } from "./types";

/**
 * WooCommerce Store API client — the source of truth for titles.
 * (WPGraphQL on this site does not register the `product` post type,
 * so titles come from REST while everything else uses GraphQL.)
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

export async function fetchTitles(params: ListParams = {}): Promise<Paged<Title>> {
  const qs = new URLSearchParams();
  if (params.category) qs.set("category", params.category);
  if (params.tag) qs.set("tag", params.tag);
  if (params.search) qs.set("search", params.search);
  qs.set("page", String(params.page ?? 1));
  qs.set("per_page", String(params.perPage ?? 16));
  if (params.orderby) qs.set("orderby", params.orderby);
  if (params.order) qs.set("order", params.order);

  const res = await fetch(`${ENDPOINTS.store}/products?${qs}`, {
    next: { revalidate: SITE.revalidate },
  });
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
}

export async function fetchTitleBySlug(slug: string): Promise<Title | null> {
  const res = await fetch(
    `${ENDPOINTS.store}/products?slug=${encodeURIComponent(slug)}&per_page=1`,
    { next: { revalidate: SITE.revalidate } },
  );
  if (!res.ok) return null;
  const raw = (await res.json()) as StoreProduct[];
  return raw[0] ? mapTitle(raw[0]) : null;
}

/** Latest titles in a category (used by rails / hero). */
export async function fetchLatest(
  category: string,
  perPage = 12,
): Promise<Title[]> {
  const p = await fetchTitles({
    category,
    perPage,
    orderby: "date",
    order: "desc",
  });
  return p.items;
}

/** SEO (Yoast) metadata for a title — wp/v2 carries yoast_head_json. */
export async function fetchTitleSeo(slug: string): Promise<SeoMeta | null> {
  try {
    const res = await fetch(
      `${ENDPOINTS.wp}/product?slug=${encodeURIComponent(slug)}&_fields=yoast_head_json,title,excerpt&per_page=1`,
      { next: { revalidate: SITE.revalidate } },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as {
      yoast_head_json?: {
        title?: string;
        description?: string;
        og_image?: { url: string }[];
      };
    }[];
    const y = rows[0]?.yoast_head_json;
    if (!y) return null;
    return {
      title: y.title ?? "",
      description: y.description ?? "",
      image: y.og_image?.[0]?.url,
    };
  } catch {
    return null;
  }
}

/** Related titles from the same category, excluding the current slug. */
export async function fetchRelated(
  categorySlug: string,
  excludeSlug: string,
  perPage = 8,
): Promise<Title[]> {
  const p = await fetchTitles({
    category: categorySlug,
    perPage: perPage + 4,
    orderby: "date",
    order: "desc",
  });
  return p.items.filter((t) => t.slug !== excludeSlug).slice(0, perPage);
}

function mapTitle(p: StoreProduct): Title {
  const { year, ageRating, excerpt } = parseShortDescription(p.short_description);
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
    shortDescription: p.short_description ?? "",
    description: p.description ?? "",
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
 * short_description layout from WP:
 *   <ul><li>2000</li><li>7+</li></ul><p>hook line…</p>
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
  const excerpt = paragraphs.find(Boolean);
  return { year, ageRating, excerpt };
}

export function stripTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;|&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#8211;/g, "–")
    .replace(/\s+/g, " ")
    .trim();
}
