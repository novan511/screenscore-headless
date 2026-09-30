import type { MetadataRoute } from "next";
import { CATEGORY_LIST, ENDPOINTS, siteUrl } from "@/lib/config";
import { wpFetch } from "@/lib/http";

export const revalidate = 86400;

/**
 * WordPress reads made *by the sitemap itself* live a day. Left at the
 * default 300s they would drag the whole route's revalidate down to 5 minutes
 * and re-read the entire catalogue 288 times a day.
 */
const SITEMAP_FETCH_TTL = 86400;

const STATIC_PATHS = [
  "",
  "/blog",
  "/tentang-kami",
  "/contact",
  "/ajukan-judul-baru",
  "/ketentuan-layanan-screenscore",
  "/privacy-policy",
  "/cast",
  "/characters",
];

/** How many URLs per WordPress batch (Store API caps at 100). */
const BATCH = 100;

/**
 * Every product URL in the catalogue, read straight from the Store API so the
 * sitemap stays in sync with WordPress instead of a hand-maintained list.
 * Failures degrade to an empty list — a partial sitemap beats no sitemap.
 */
async function fetchProductPaths(): Promise<string[]> {
  const paths: string[] = [];
  for (let page = 1; page <= 40; page++) {
    try {
      const res = await wpFetch(
        `${ENDPOINTS.store}/products?per_page=${BATCH}&page=${page}&_fields=slug&orderby=id&order=asc`,
        { revalidate: SITEMAP_FETCH_TTL },
      );
      if (!res.ok) break;
      const rows = (await res.json()) as { slug: string }[];
      if (!rows.length) break;
      paths.push(...rows.map((r) => `/content/${r.slug}`));
      if (rows.length < BATCH) break;
    } catch {
      break;
    }
  }
  return paths;
}

const PEOPLE_FIELD = {
  cast: "allCast",
  creator: "allCreator",
  character: "characters",
  song: "songs",
} as const;

/**
 * Newest articles (two batches of 100) — the deep archive stays reachable
 * through /blog pagination, so the sitemap only advertises the fresh head.
 */
async function fetchBlogPosts(): Promise<{ path: string; modified: string }[]> {
  const out: { path: string; modified: string }[] = [];
  for (let page = 1; page <= 2; page++) {
    try {
      const res = await wpFetch(
        `${ENDPOINTS.wp}/posts?per_page=${BATCH}&page=${page}&orderby=date&order=desc&_fields=slug,modified`,
        { revalidate: SITEMAP_FETCH_TTL },
      );
      if (!res.ok) break;
      const rows = (await res.json()) as { slug: string; modified: string }[];
      if (!rows.length) break;
      out.push(
        ...rows.map((r) => ({
          path: `/blog/${r.slug}`,
          modified: r.modified,
        })),
      );
      if (rows.length < BATCH) break;
    } catch {
      break;
    }
  }
  return out;
}

/** Cursor-paginated people/characters/songs — `uri` carries the real path. */
async function fetchPeoplePaths(
  field: (typeof PEOPLE_FIELD)[keyof typeof PEOPLE_FIELD],
): Promise<string[]> {
  const paths: string[] = [];
  let after: string | null = null;

  for (let guard = 0; guard < 50; guard++) {
    try {
      const res = await wpFetch(ENDPOINTS.graphql, {
        revalidate: SITEMAP_FETCH_TTL,
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `{
              ${field}(first: ${BATCH}${after ? `, after: "${after}"` : ""}) {
                edges { node { uri } }
                pageInfo { endCursor hasNextPage }
              }
            }`,
          }),
        },
      });
      if (!res.ok) break;

      const json = (await res.json()) as {
        data?: Record<
          string,
          {
            edges: { node: { uri: string } }[];
            pageInfo: { endCursor: string | null; hasNextPage: boolean };
          }
        >;
        errors?: unknown[];
      };

      const conn = json.data?.[field];
      if (!conn) break;

      paths.push(
        ...conn.edges
          .map((e) => e.node.uri)
          .filter(Boolean)
          .map((uri) => `/${uri.replace(/^\/+|\/+$/g, "")}`),
      );

      if (!conn.pageInfo.hasNextPage) break;
      after = conn.pageInfo.endCursor;
    } catch {
      break;
    }
  }
  return paths;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const [productPaths, castPaths, creatorPaths, characterPaths, songPaths, blogPosts] =
    await Promise.all([
      fetchProductPaths(),
      fetchPeoplePaths(PEOPLE_FIELD.cast),
      fetchPeoplePaths(PEOPLE_FIELD.creator),
      fetchPeoplePaths(PEOPLE_FIELD.character),
      fetchPeoplePaths(PEOPLE_FIELD.song),
      fetchBlogPosts(),
    ]);

  const statics: MetadataRoute.Sitemap = STATIC_PATHS.map((p) => ({
    url: siteUrl(p),
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.6,
  }));

  const categories: MetadataRoute.Sitemap = CATEGORY_LIST.map((c) => ({
    url: siteUrl(c.path),
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.9,
  }));

  // Age chips are faceted URLs (marked noindex in archiveMetadata) — they are
  // deliberately absent so the sitemap only advertises indexable pages.

  const content: MetadataRoute.Sitemap = productPaths.map((path) => ({
    url: siteUrl(path),
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const people = [...castPaths, ...creatorPaths, ...characterPaths, ...songPaths];
  const peopleEntries: MetadataRoute.Sitemap = people.map((path) => ({
    url: siteUrl(path),
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.4,
  }));

  const articles: MetadataRoute.Sitemap = blogPosts.map(({ path, modified }) => ({
    url: siteUrl(path),
    lastModified: new Date(modified),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...statics, ...categories, ...content, ...peopleEntries, ...articles];
}
