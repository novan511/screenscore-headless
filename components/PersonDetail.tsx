import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { fetchPersonBio } from "@/lib/bridge";
import { fetchPerson, fetchPeople } from "@/lib/graphql";
import { ignoreMissing } from "@/lib/http";
import { sanitizeWpHtml } from "@/lib/utils";
import type { PersonKind } from "@/lib/types";

const KIND_LABEL: Record<PersonKind, string> = {
  cast: "Pemeran",
  creator: "Kreator",
  character: "Karakter",
  song: "Lagu",
  idol: "Idola",
  "pro-player": "Pro Player",
  gadget: "Gadget",
};

const KIND_HOME: Record<PersonKind, string> = {
  cast: "/cast",
  creator: "/cast",
  character: "/characters",
  song: "/song",
  idol: "/idol",
  "pro-player": "/pro-player",
  gadget: "/gadget",
};

/**
 * Shared person/character/song detail layout.
 * `path` may be hierarchical (character/marvel/carnage).
 */
export async function PersonDetail({
  kind,
  path,
}: {
  kind: PersonKind;
  path: string;
}) {
  // Deliberately un-caught: an unreachable WordPress must reach the error
  // boundary rather than be reported as a missing person.
  const [person, bio] = await Promise.all([
    fetchPerson(kind, path),
    fetchPersonBio(kind, path),
  ]);

  if (!person && !bio) return null;

  const name = person?.title || bio?.heading.replace(/^Biografi\s+/i, "") || path;
  const image = person?.featuredImage?.node?.sourceUrl;
  const bioHtml = bio?.bioHtml ?? "";

  return (
    <div className="ss-container py-10">
      <nav className="mb-6 text-xs font-semibold text-muted">
        <Link href="/" className="hover:text-pink-600">Beranda</Link>
        <span> / </span>
        <Link href={KIND_HOME[kind]} className="hover:text-pink-600">
          {KIND_LABEL[kind]}
        </Link>
        <span> / </span>
        <span className="text-ink">{name}</span>
      </nav>

      <div className="flex flex-col gap-7 sm:flex-row">
        <div className="shrink-0 text-center sm:text-left">
          <div
            className="relative mx-auto h-44 w-44 overflow-hidden rounded-2xl bg-surface sm:mx-0"
            style={{ aspectRatio: "1 / 1" }}
          >
            {image && (
              <Image
                src={image}
                alt={name}
                fill
                sizes="176px"
                quality={70}
                className="object-cover"
              />
            )}
          </div>
          <span className="mt-3 inline-block rounded-full bg-ink px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
            {KIND_LABEL[kind]}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-extrabold sm:text-4xl">{name}</h1>
          {bioHtml ? (
            <div
              className="prose-headings:font-bold mt-4 max-w-3xl space-y-3 text-[15px] leading-relaxed text-ink/85 [&_b]:font-bold [&_p]:my-2"
              dangerouslySetInnerHTML={{ __html: sanitizeWpHtml(bioHtml) }}
            />
          ) : (
            <p className="mt-4 text-sm text-muted">
              Biografi sedang disiapkan. Datanya akan muncul otomatis begitu
              diperbarui di WordPress.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Same-kind neighbour rail ("Idol Lainnya"), exported as a wrapper so pages
 * can place the `<Suspense>` boundary in JSX. (A boundary created inside the
 * awaited `PersonDetail()` call never streams — it prerenders as fallback
 * into the ISR cache. At page level it resolves after first paint, exactly
 * like the "Mirip dengan ini" rail on content pages.)
 */
export function RelatedPeopleBlock({
  kind,
  path,
}: {
  kind: PersonKind;
  path: string;
}) {
  const excludeSlug = path.split("/").filter(Boolean).pop() ?? path;
  return (
    <div className="ss-container pb-10">
      <Suspense fallback={<RelatedSkeleton />}>
        <RelatedPeople kind={kind} excludeSlug={excludeSlug} />
      </Suspense>
    </div>
  );
}

/** Same-kind neighbours (BTS → other idols), excluding the current page. */
async function RelatedPeople({
  kind,
  excludeSlug,
}: {
  kind: PersonKind;
  excludeSlug: string;
}) {
  const data = await fetchPeople(kind, { first: 9 }).catch(ignoreMissing(null));
  const items = (data?.items ?? [])
    .filter((p) => p.slug !== excludeSlug)
    .slice(0, 8);
  if (items.length === 0) return null;

  const base = KIND_HOME[kind];
  return (
    <section className="mt-12" aria-label={`${KIND_LABEL[kind]} lainnya`}>
      <h2 className="mb-4 text-xl font-extrabold sm:text-2xl">
        {KIND_LABEL[kind]} Lainnya
      </h2>
      <div className="rail ss-stagger">
        {items.map((p) => (
          <Link
            key={p.databaseId}
            /* Hierarchical entries (idol members, sub-characters) live under
               their group path — the GraphQL `uri` is the source of truth,
               not base + slug. */
            href={
              p.uri
                ? `/${p.uri.replace(/^\/+|\/+$/g, "")}`
                : `${base}/${p.slug}`
            }
            className="group w-28 shrink-0 text-center"
          >
            <div className="mx-auto h-24 w-24 overflow-hidden rounded-full bg-surface">
              {p.featuredImage?.node?.sourceUrl && (
                <Image
                  src={p.featuredImage.node.sourceUrl}
                  alt={p.title}
                  width={96}
                  height={96}
                  sizes="96px"
                  quality={70}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <p className="mt-2 line-clamp-2 text-xs font-bold group-hover:text-pink-600">
              {p.title}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function RelatedSkeleton() {
  return (
    <section className="mt-12" aria-busy="true" aria-label="Memuat konten terkait">
      <div className="skeleton mb-4 h-7 w-48 rounded" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="w-28 shrink-0 text-center">
            <div className="skeleton mx-auto h-24 w-24 rounded-full" />
            <div className="skeleton mx-auto mt-2 h-3.5 w-4/5 rounded" />
          </div>
        ))}
      </div>
    </section>
  );
}
