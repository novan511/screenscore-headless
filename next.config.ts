import type { NextConfig } from "next";

const WP_SITE = process.env.NEXT_PUBLIC_WP_SITE ?? "https://screenscore.digitalmama.id";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "screenscore.digitalmama.id" },
      { protocol: "https", hostname: "**.wordpress.com" },
      { protocol: "https", hostname: "i0.wp.com" },
    ],
  },
  // Keep tracing inside the app even when a parent folder has a lockfile.
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
