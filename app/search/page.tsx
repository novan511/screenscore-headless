import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PosterCard, TitleGrid } from "@/components/PosterCard";
import { SearchForm } from "@/components/SearchForm";
import { fetchPeople } from "@/lib/graphql";
import { ignoreMissing } from "@/lib/http";
import { fetchTitles } from "@/lib/store";
import type { Person } from "@/lib/types";

export const revalidate = 30;

export const metadata: Metadata = {
  title: "Cari",
  description: "Cari judul dan orang di ScreenScore.",
  // Query-string pages are infinite duplicates of each other.
  robots: { index: false, follow: true },
  alternates: { canonical: "/search" },
  openGraph: { url: "/search" },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();

  const [titleRes, castRes, creatorRes, idolRes, proPlayerRes, gadgetRes] = await Promise.all([
    query
      ? fetchTitles({ search: query, perPage: 24, page: 1 }).catch(ignoreMissing(null))
      : Promise.resolve(null),
    query
      ? fetchPeople("cast", { search: query, first: 8 }).catch(ignoreMissing(null))
      : Promise.resolve(null),
    query
      ? fetchPeople("creator", { search: query, first: 8 }).catch(ignoreMissing(null))
      : Promise.resolve(null),
    query
      ? fetchPeople("idol", { search: query, first: 8 }).catch(ignoreMissing(null))
      : Promise.resolve(null),
    query
      ? fetchPeople("pro-player", { search: query, first: 8 }).catch(ignoreMissing(null))
      : Promise.resolve(null),
    query
      ? fetchPeople("gadget", { search: query, first: 8 }).catch(ignoreMissing(null))
      : Promise.resolve(null),
  ]);

  const people: Person[] = [
    ...(castRes?.items.map((n) => ({
      slug: n.slug,
      title: n.title,
      uri: n.uri,
      image: n.featuredImage?.node?.sourceUrl,
      kind: "cast" as const,
    })) ?? []),
    ...(creatorRes?.items.map((n) => ({
      slug: n.slug,
      title: n.title,
      uri: n.uri,
      image: n.featuredImage?.node?.sourceUrl,
      kind: "creator" as const,
    })) ?? []),
    ...(idolRes?.items.map((n) => ({
      slug: n.slug,
      title: n.title,
      uri: n.uri,
      image: n.featuredImage?.node?.sourceUrl,
      kind: "idol" as const,
    })) ?? []),
    ...(proPlayerRes?.items.map((n) => ({
      slug: n.slug,
      title: n.title,
      uri: n.uri,
      image: n.featuredImage?.node?.sourceUrl,
      kind: "pro-player" as const,
    })) ?? []),
    ...(gadgetRes?.items.map((n) => ({
      slug: n.slug,
      title: n.title,
      uri: n.uri,
      image: n.featuredImage?.node?.sourceUrl,
      kind: "gadget" as const,
    })) ?? []),
  ];

  const hasTitles = (titleRes?.items.length ?? 0) > 0;
  const hasPeople = people.length > 0;

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-extrabold sm:text-3xl">Cari</h1>
      <div className="mt-4 max-w-xl">
        <SearchForm defaultValue={query} />
      </div>

      {!query && (
        <p className="mt-8 text-sm text-muted">
          Ketik judul film, game, e-book, atau nama orang untuk mulai mencari.
        </p>
      )}

      {query && !hasTitles && !hasPeople && (
        <div className="mt-10 rounded-2xl border border-dashed border-line p-12 text-center">
          <p className="font-bold">Tidak ada hasil untuk “{query}”</p>
          <p className="mt-1 text-sm text-muted">
            Coba kata kunci lain, atau periksa ejaan judulnya.
          </p>
        </div>
      )}

      {hasPeople && (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-extrabold">Orang</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {people.map((p) => (
              <Link
                key={`${p.kind}-${p.slug}`}
                /* Hierarchical entries (idol members) live under their group
                   path — trust the WP `uri`, not kind + slug. */
                href={
                  p.uri
                    ? `/${p.uri.replace(/^\/+|\/+$/g, "")}`
                    : `/${p.kind}/${p.slug}`
                }
                className="group text-center"
              >
                <div
                  className="mx-auto h-28 w-28 overflow-hidden rounded-full bg-surface"
                >
                  {p.image && (
                    <Image
                      src={p.image}
                      alt={p.title}
                      width={112}
                      height={112}
                      sizes="112px"
                      quality={70}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-bold group-hover:text-pink">
                  {p.title}
                </p>
                <p className="text-[11px] uppercase tracking-wide text-muted">
                  {p.kind === "creator"
                    ? "Kreator"
                    : p.kind === "idol"
                      ? "Idola"
                      : p.kind === "pro-player"
                        ? "Pro Player"
                        : p.kind === "gadget"
                          ? "Gadget"
                          : "Pemeran"}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {hasTitles && (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-extrabold">
            Judul <span className="text-muted">({titleRes!.total})</span>
          </h2>
          <TitleGrid>
            {titleRes!.items.map((t) => (
              <PosterCard key={t.id} title={t} />
            ))}
          </TitleGrid>
        </section>
      )}
    </div>
  );
}
