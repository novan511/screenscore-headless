import type { MetadataRoute } from "next";
import { SITE, siteUrl } from "@/lib/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: `${SITE.name} — ${SITE.tagline}`,
    short_name: SITE.name,
    description:
      "Review, rating usia, dan kurasi konten film, serial, game, e-book, dan aplikasi terbaik untuk anak.",
    start_url: siteUrl("/"),
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#17141a",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
