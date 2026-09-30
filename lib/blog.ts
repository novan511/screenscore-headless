import { cache } from "react";
import { ENDPOINTS, siteUrl } from "./config";
import { wpFetch } from "./http";
import { decodeEntities, stripTags } from "./utils";

/**
 * WordPress posts (`/blog` archive on the legacy site, root permalinks for
 * single posts). Standard WP REST — no Store API involvement here.
 *
 * Posts carry no featured/inline images, so cards are typographic; the author
 * comes from `_embed=author`, which needs `_links` in `_fields` to survive.
 */

export interface BlogCategory {
  id: number;
  slug: string;
  name: string;
}

export interface BlogAuthor {
  name: string;
  avatar?: string;
}

export interface BlogPost {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  modified: string;
  author: BlogAuthor;
  category: BlogCategory | null;
  categories: BlogCategory[];
  path: string;
  /** Populated by fetchPostDetail only. */
  content?: string;
  readingMinutes?: number;
}

export interface PagedPosts {
  items: BlogPost[];
  page: number;
  totalPages: number;
  total: number;
}

interface RawPost {
  id: number;
  slug: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content?: { rendered: string };
  date: string;
  modified: string;
  categories: number[];
  author: number;
  _links?: { "wp:term"?: { embeddable?: boolean; href: string }[] };
  _embedded?: {
    author?: {
      name?: string;
      avatar_urls?: Record<string, string>;
    }[];
    "wp:term"?: { id: number; slug: string; name: string; taxonomy: string }[][];
  };
}

const POSTS = `${ENDPOINTS.wp}/posts`;
const LIST_FIELDS =
  "id,slug,title,excerpt,date,modified,categories,author,_links,_embedded";

/** Reading pace used across the site (words per minute, Indonesian prose). */
const WPM = 200;

function plain(html: string): string {
  return stripTags(decodeEntities(html))
    .replace(/\s+/g, " ")
    .trim();
}

function mapPost(raw: RawPost): BlogPost {
  const terms = raw._embedded?.["wp:term"] ?? [];
  const cats = (terms.flat() ?? []).filter(
    (t) => t.taxonomy === "category" && t.slug !== "uncategorized",
  );
  const mapped: BlogCategory[] = cats.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
  }));
  const author = raw._embedded?.author?.[0];
  return {
    id: raw.id,
    slug: raw.slug,
    title: plain(raw.title.rendered),
    excerpt: plain(raw.excerpt.rendered),
    date: raw.date,
    modified: raw.modified,
    author: {
      name: author?.name ?? "Redaksi ScreenScore",
      avatar: author?.avatar_urls?.["48"] ?? author?.avatar_urls?.["96"],
    },
    category: mapped[0] ?? null,
    categories: mapped,
    path: `/blog/${raw.slug}`,
  };
}

function readingMinutes(contentHtml: string): number {
  const words = plain(contentHtml).split(" ").filter(Boolean).length;
  return Math.max(1, Math.round(words / WPM));
}

/** Category lookup (news/tips/ulasan) — four rows, memoised per request. */
export const fetchBlogCategories = cache(async (): Promise<BlogCategory[]> => {
  const res = await wpFetch(
    `${ENDPOINTS.wp}/categories?per_page=20&hide_empty=true&_fields=id,slug,name`,
    { revalidate: 3600 },
  );
  if (!res.ok) return [];
  const raw = (await res.json()) as { id: number; slug: string; name: string }[];
  return raw;
});

export interface PostListParams {
  page?: number;
  perPage?: number;
  /** Category slug filter (news | tips | ulasan). */
  cat?: string;
}

export const fetchPosts = cache(
  async (params: PostListParams = {}): Promise<PagedPosts> => {
    const qs = new URLSearchParams();
    qs.set("page", String(params.page ?? 1));
    qs.set("per_page", String(params.perPage ?? 12));
    qs.set("orderby", "date");
    qs.set("order", "desc");
    qs.set("_embed", "author");
    qs.set("_fields", LIST_FIELDS);

    if (params.cat && params.cat !== "semua") {
      const cats = await fetchBlogCategories();
      const match = cats.find((c) => c.slug === params.cat);
      if (match) qs.set("categories", String(match.id));
    }

    const res = await wpFetch(`${POSTS}?${qs}`);
    if (!res.ok) throw new Error(`posts HTTP ${res.status}`);

    const raw = (await res.json()) as RawPost[];
    const total = Number(res.headers.get("x-wp-total") ?? raw.length);
    const totalPages = Number(res.headers.get("x-wp-totalpages") ?? 1);

    return {
      items: raw.map(mapPost),
      page: params.page ?? 1,
      totalPages,
      total,
    };
  },
);

export const fetchPostDetail = cache(
  async (slug: string): Promise<BlogPost | null> => {
    const qs = new URLSearchParams();
    qs.set("slug", slug);
    qs.set("_embed", "author");
    qs.set("_fields", `${LIST_FIELDS},content,excerpt`);

    const res = await wpFetch(`${POSTS}?${qs}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`post HTTP ${res.status}`);

    const raw = (await res.json()) as RawPost[];
    if (!raw.length) return null;

    const post = mapPost(raw[0]);
    const content = raw[0].content?.rendered ?? "";
    post.content = content;
    post.readingMinutes = readingMinutes(content);
    return post;
  },
);

/** Same-category picks for "Baca juga"; falls back to the newest posts. */
export const fetchRelatedPosts = cache(
  async (current: BlogPost, limit = 3): Promise<BlogPost[]> => {
    const qs = new URLSearchParams();
    qs.set("per_page", String(limit + 1));
    qs.set("orderby", "date");
    qs.set("order", "desc");
    qs.set("exclude", String(current.id));
    qs.set("_embed", "author");
    qs.set("_fields", LIST_FIELDS);
    if (current.category) qs.set("categories", String(current.category.id));

    const res = await wpFetch(`${POSTS}?${qs}`);
    if (!res.ok) return [];
    const raw = (await res.json()) as RawPost[];
    const items = raw.map(mapPost).slice(0, limit);
    if (items.length >= limit || current.category) return items;

    // Uncategorized post → top up with the newest articles overall.
    const fallback = await fetchPosts({ perPage: limit });
    return [...items, ...fallback.items.filter((p) => p.id !== current.id)].slice(0, limit);
  },
);

/**
 * Parenting-relevant picks for the homepage: Tips + Ulasan first,
 * newest overall as a fallback so the section never renders empty
 * when the curated categories are quiet.
 */
export const fetchHomeArticles = cache(
  async (limit = 4): Promise<BlogPost[]> => {
    try {
      const qs = new URLSearchParams();
      qs.set("per_page", String(limit));
      qs.set("orderby", "date");
      qs.set("order", "desc");
      qs.set("_embed", "author");
      qs.set("_fields", LIST_FIELDS);
      const cats = await fetchBlogCategories();
      const ids = cats
        .filter((c) => c.slug === "tips" || c.slug === "ulasan")
        .map((c) => c.id);
      if (ids.length) qs.set("categories", ids.join(","));

      const res = await wpFetch(`${POSTS}?${qs}`);
      if (res.ok) {
        const raw = (await res.json()) as RawPost[];
        if (raw.length) return raw.map(mapPost).slice(0, limit);
      }
    } catch {
      // fall through to the newest-of-everything list
    }
    const fallback = await fetchPosts({ perPage: limit });
    return fallback.items;
  },
);

/** Absolute URL helper for JSON-LD and Open Graph. */
export function postUrl(slug: string): string {
  return siteUrl(`/blog/${slug}`);
}
