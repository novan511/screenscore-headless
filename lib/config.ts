/**
 * Single place that knows where WordPress lives.
 * Override with NEXT_PUBLIC_WP_SITE for local/staging targets.
 */
export const WP_SITE = (
  process.env.NEXT_PUBLIC_WP_SITE ?? "https://screenscore.digitalmama.id"
).replace(/\/$/, "");

/**
 * Public origin of *this* frontend — canonical URLs, Open Graph and the
 * sitemap must point at the site users actually read, not the WordPress
 * backend. Defaults to WP_SITE because the headless frontend is meant to
 * take over that domain; set NEXT_PUBLIC_SITE_URL while it lives elsewhere.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? WP_SITE
).replace(/\/$/, "");

/** Absolute URL for a path on this frontend (canonical / og:url / sitemap). */
export function siteUrl(path = ""): string {
  if (!path) return SITE_URL;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Canonical WordPress URL for a product slug — every product is served at
 * `/content/<slug>/` (verified across the whole catalogue), which lets the
 * SEO scrape start in parallel with the Store API lookup instead of waiting
 * for the permalink to come back. A miss degrades to no SEO tag, never a 404.
 */
export function productPermalink(slug: string): string {
  return `${WP_SITE}/content/${encodeURIComponent(slug)}/`;
}

export const ENDPOINTS = {
  graphql: `${WP_SITE}/graphql`,
  store: `${WP_SITE}/wp-json/wc/store/v1`,
  wp: `${WP_SITE}/wp-json/wp/v2`,
} as const;

export const SITE = {
  name: "ScreenScore",
  tagline: "Review konten terbaik untuk anak",
  // ISR freshness for all WordPress reads
  revalidate: 300,
} as const;

/**
 * Google AdSense — mirrors the tag set live on the legacy WordPress site.
 * The loader runs on every page (Auto Ads is on for the account); the
 * explicit units below are the same named widgets the theme prints:
 *
 *   Screenscore_top_product     product detail, under the breadcrumb
 *   Screenscore_top_article     archive, above the grid
 *   Screenscore_after_article   article/archive, below the content
 *   Screenscore_sidebar_article article sidebar
 *
 * Swap the client here if the site ever moves to its own publisher ID —
 * every placement reads it from this one constant.
 */
export const ADSENSE = {
  client: "ca-pub-8322068530935403",
  slots: {
    topProduct: "9565334215",
    topArticle: "9767248840",
    afterArticle: "4175106853",
    sidebarArticle: "7813630232",
  },
} as const;

/**
 * The "About Writer" box every legacy detail page closes with. Products are
 * authored by the editorial account, so the biography comes from the site
 * rather than from the product payload.
 */
export const SITE_AUTHOR = {
  name: "Rachmadwipa Novandri",
  bio: "Seorang pecinta anime, manga, dan animasi sejak 2016 seperti Naruto, Onepiece, Bleach, Hunter X Hunter dan anime lain serta pecinta game dengan berbagai tema baik mobile maupun PC.",
} as const;

export interface CategoryConfig {
  slug: string;
  name: string;
  path: string;
  blurb: string;
}

/** product_cat slugs mirrored to the legacy WP archive paths (SEO-safe). */
export const CATEGORIES: Record<string, CategoryConfig> = {
  film: {
    slug: "film",
    name: "Film",
    path: "/films",
    blurb: "Rating usia & review kurasi untuk film pilihan anak.",
  },
  series: {
    slug: "series",
    name: "Serial",
    path: "/series",
    blurb: "Serial TV & streaming yang aman ditonton keluarga.",
  },
  "e-books": {
    slug: "e-books",
    name: "E-Books",
    path: "/e-books",
    blurb: "Bacaan digital untuk memancing minat baca anak.",
  },
  game: {
    slug: "game",
    name: "Game",
    path: "/game",
    blurb: "Game dengan nilai positif, aman dimainkan anak.",
  },
  aplikasi: {
    slug: "aplikasi",
    name: "Aplikasi",
    path: "/aplikasi",
    blurb: "Aplikasi edukatif yang sudah diuji untuk si kecil.",
  },
};

export const CATEGORY_LIST = Object.values(CATEGORIES);

/** product_tag slugs — the "Kelompok Umur" taxonomy from the WP menu. */
export const AGE_TAGS = [
  { slug: "semua-umur", name: "Semua Umur" },
  { slug: "baru-lahir-0-3-bulan", name: "0–3 Bulan" },
  { slug: "bayi-3-12-bulan", name: "3–12 Bulan" },
  { slug: "balita-1-5-tahun", name: "1–5 Tahun" },
  { slug: "anak-anak-5-13-tahun", name: "5–13 Tahun" },
  { slug: "pra-remaja-13", name: "13+" },
  { slug: "remaja-17", name: "17+" },
  { slug: "dewasa-21", name: "21+" },
] as const;
