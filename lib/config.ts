/**
 * Single place that knows where WordPress lives.
 * Override with NEXT_PUBLIC_WP_SITE for local/staging targets.
 */
export const WP_SITE = (
  process.env.NEXT_PUBLIC_WP_SITE ?? "https://screenscore.digitalmama.id"
).replace(/\/$/, "");

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
    blurb: "Game & aplikasi bermain dengan nilai positif.",
  },
  aplikasi: {
    slug: "aplikasi",
    name: "Aplikasi",
    path: "/aplikasi",
    blurb: "Aplikasi edukatif yang teruji untuk si kecil.",
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
