import type { Metadata } from "next";
import type { CategoryConfig } from "./config";

/** Normalise ?page / ?age from archive searchParams. */
export async function parseArchiveParams(
  sp: Promise<{ page?: string; age?: string }>,
): Promise<{ page: number; age?: string }> {
  const params = await sp;
  const page = Math.max(1, Number(params.page) || 1);
  const age = params.age?.trim() || undefined;
  return { page, age };
}

/**
 * Metadata for /films, /series, /e-books, /game, /aplikasi.
 *
 * Paginated pages are real content, so they self-canonicalise and stay
 * indexable. Age-filtered URLs are faceted variants of the same list, so they
 * canonicalise back to the plain archive and drop out of the index instead of
 * competing with it.
 */
export function archiveMetadata(
  category: CategoryConfig,
  { page, age }: { page: number; age?: string },
): Metadata {
  const filtered = Boolean(age);
  const canonical = filtered
    ? category.path
    : page > 1
      ? `${category.path}?page=${page}`
      : category.path;

  const title =
    page > 1 ? `${category.name} — Halaman ${page}` : category.name;
  const description = filtered
    ? `${category.blurb} Hasil untuk filter usia yang dipilih.`
    : page > 1
      ? `${category.blurb} Halaman ${page} dari daftar ${category.name.toLowerCase()}.`
      : category.blurb;

  return {
    title,
    description,
    alternates: { canonical },
    robots: filtered
      ? { index: false, follow: true }
      : { index: true, follow: true },
    openGraph: { title, description, url: canonical },
  };
}
