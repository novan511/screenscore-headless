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
