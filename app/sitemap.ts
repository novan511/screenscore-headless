import type { MetadataRoute } from "next";
import { CATEGORY_LIST, WP_SITE, AGE_TAGS } from "@/lib/config";

export const revalidate = 86400;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const statics = [
    "",
    "/tentang-kami",
    "/contact",
    "/ajukan-judul-baru",
    "/ketentuan-layanan-screenscore",
    "/privacy-policy",
    "/cast",
    "/characters",
  ].map((p) => ({
    url: `${WP_SITE}${p}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.6,
  }));

  const categories = CATEGORY_LIST.map((c) => ({
    url: `${WP_SITE}${c.path}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.9,
  }));

  const ageFilters = AGE_TAGS.filter((a) => a.slug !== "semua-umur").map((a) => ({
    url: `${WP_SITE}/films?age=${encodeURIComponent(a.slug)}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.4,
  }));

  return [...statics, ...categories, ...ageFilters];
}
