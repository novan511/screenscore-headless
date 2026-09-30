import type { Metadata } from "next";
import { siteUrl } from "./config";
import { fetchPersonBio } from "./bridge";
import { fetchPerson } from "./graphql";
import type { PersonKind } from "./types";
import { clamp, stripTags } from "./utils";

/**
 * Metadata for /cast/[slug], /creator/[slug], /character/[…], /song/[slug].
 *
 * Reads the same person + biography the page renders (both memoised), so the
 * title and description come from WordPress instead of a slug guess — and the
 * canonical always points at the real hierarchical URL.
 */
export async function personMetadata(
  kind: PersonKind,
  path: string,
  canonicalPath: string,
): Promise<Metadata> {
  const [person, bio] = await Promise.all([
    fetchPerson(kind, path),
    fetchPersonBio(kind, path),
  ]);

  const fallback = path.split("/").pop()?.replace(/-/g, " ") ?? path;
  const name =
    person?.title ||
    bio?.heading.replace(/^Biografi\s+/i, "").trim() ||
    fallback;

  const description =
    bio?.seo?.description?.trim() ||
    (bio?.bioHtml ? clamp(stripTags(bio.bioHtml), 160) : undefined) ||
    undefined;

  const image = person?.featuredImage?.node?.sourceUrl;

  return {
    title: name,
    ...(description && { description }),
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: name,
      ...(description && { description }),
      url: canonicalPath,
      siteName: "ScreenScore",
      ...(image && { images: [{ url: image }] }),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: name,
      ...(description && { description }),
      ...(image && { images: [image] }),
    },
  };
}

/** Canonical path for a person route: /cast/samantha-morton, /character/marvel/carnage */
export function personCanonical(routeBase: string, path: string): string {
  return `/${[routeBase, path].filter(Boolean).join("/")}`;
}

/** Absolute person URL (for JSON-LD `url`). */
export function personUrl(routeBase: string, path: string): string {
  return siteUrl(personCanonical(routeBase, path));
}
