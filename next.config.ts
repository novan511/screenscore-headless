import type { NextConfig } from "next";

const WP_SITE = process.env.NEXT_PUBLIC_WP_SITE ?? "https://screenscore.digitalmama.id";

const nextConfig: NextConfig = {
  images: {
    // WebP only: AVIF encodes ~10x slower, and on a cold `/_next/image` hit
    // (fresh deploy, new upload) that encode plus the already-slow upstream
    // fetch pushed variants past the optimizer timeout — retina screens
    // request the larger variants, so posters sat blank for a minute.
    // WebP encodes fast enough that cold hits complete in well under a
    // second once the source is downloaded.
    formats: ["image/webp"],
    // Keep optimised variants warm for a day so repeat views never re-encode.
    minimumCacheTTL: 86400,
    /**
     * Next's default leaves a hole between 1200 and 1920, so a common
     * 1280px-wide hero requested `w=1920` — ~40% more bytes than it needed.
     * 1440/1600 close it. Capped at 1920: poster cards render at ≤340 CSS px
     * (≤680 at DPR 2) so 1600/2048/2560 entries never win the srcset pick —
     * they only added three dead URLs to all 61 `<img>` tags on the homepage
     * (~40KB of HTML that had to be parsed before first paint).
     */
    deviceSizes: [640, 750, 828, 1080, 1200, 1440, 1920],
    // next/image warns for every quality not listed here (required in Next 16).
    // 70 = cards/heroes, 55 = blurred hero backdrop, 75 = detail poster.
    qualities: [55, 70, 75],
    remotePatterns: [
      { protocol: "https", hostname: "screenscore.digitalmama.id" },
      { protocol: "https", hostname: "**.wordpress.com" },
      { protocol: "https", hostname: "i0.wp.com" },
      // Author avatars on article bylines.
      { protocol: "https", hostname: "secure.gravatar.com" },
      { protocol: "https", hostname: "www.gravatar.com" },
      { protocol: "https", hostname: "gravatar.com" },
    ],
  },
  // Keep tracing inside the app even when a parent folder has a lockfile.
  outputFileTracingRoot: process.cwd(),

  /**
   * Archive and search pages read `searchParams`, so Next marks them dynamic
   * and ships `private, no-cache, no-store` — every view became a fresh server
   * render with no edge cache. Their content is public and identical per URL
   * (the CDN keys on the query string), so let it hold them for the same
   * window ISR uses elsewhere.
   *
   * NOTE: the route-level `private` Cache-Control wins over the
   * `Cache-Control` line below (same header name — measured: archives still
   * returned `private, no-cache` with MISS every time). The
   * `Vercel-CDN-Cache-Control` line is the one that actually takes effect: it
   * is a different header so the route does not overwrite it, and the edge
   * honours it for shared caching even on dynamic routes.
   */
  async headers() {
    return [
      {
        source:
          "/:path(films|series|game|e-books|aplikasi|search|blog|idol|pro-player|gadget)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=300, stale-while-revalidate=86400",
          },
          {
            key: "Vercel-CDN-Cache-Control",
            value: "s-maxage=300, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },

  /**
   * Legacy WordPress URL parity for the headless takeover.
   *
   * - `/content-category/<cat>/` is WooCommerce's native term archive; the
   *   headless frontend replaces it with /films, /series, … — 301 them so no
   *   indexed URL dies.
   * - cart/checkout/my-account/register are shop-functional pages whose
   *   shortcodes cannot render headless; send them back to WordPress instead
   *   of serving a broken copy.
   */
  async redirects() {
    const categoryRedirects = [
      { slug: "film", path: "/films" },
      { slug: "series", path: "/series" },
      { slug: "e-books", path: "/e-books" },
      { slug: "game", path: "/game" },
      { slug: "aplikasi", path: "/aplikasi" },
      { slug: "animation", path: "/films" },
      { slug: "anime", path: "/series" },
    ].map(({ slug, path }) => ({
      source: `/content-category/${slug}`,
      destination: path,
      permanent: true,
    }));

    const shopBackToWp = ["cart", "checkout", "my-account", "register"].map(
      (slug) => ({
        source: `/${slug}`,
        destination: `${WP_SITE}/${slug}/`,
        permanent: false,
      }),
    );

    return [...categoryRedirects, ...shopBackToWp];
  },
};

export default nextConfig;
