import type { NextConfig } from "next";

const WP_SITE = process.env.NEXT_PUBLIC_WP_SITE ?? "https://screenscore.digitalmama.id";

const nextConfig: NextConfig = {
  images: {
    // AVIF first: ~35% smaller than WebP at the same quality. WebP is the
    // fallback for browsers that cannot decode it.
    formats: ["image/avif", "image/webp"],
    // Keep optimised variants warm for a day so repeat views never re-encode.
    minimumCacheTTL: 86400,
    /**
     * Next's default leaves a hole between 1200 and 1920, so a common
     * 1280px-wide hero requested `w=1920` — ~40% more bytes than it needed.
     * 1440/1600 close it, and capping at 2560 avoids multi-second AVIF
     * encodes of 3840px sources on first view.
     */
    deviceSizes: [640, 750, 828, 1080, 1200, 1440, 1600, 1920, 2048, 2560],
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
   */
  async headers() {
    return [
      {
        source: "/:path(films|series|game|e-books|aplikasi|search|blog)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=300, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
