import Image from "next/image";
import Link from "next/link";
import { fetchPeople } from "@/lib/graphql";
import { ignoreMissing } from "@/lib/http";
import type { PersonKind } from "@/lib/types";

/**
 * Shared index for the CPT archives: /idol, /pro-player, /gadget.
 * Same card grid as /cast, plus cursor pagination — gadget alone holds
 * 1.100+ entries, so a fixed first:48 would strand the whole tail.
 * Pure server-rendered links (`?after=`), no client JavaScript.
 */
export async function PeopleArchive({
  kind,
  routeBase,
  title,
  blurb,
  after,
  perPage = 48,
}: {
  kind: PersonKind;
  routeBase: string;
  title: string;
  blurb: string;
  after?: string;
  perPage?: number;
}) {
  const data = await fetchPeople(kind, { first: perPage, after }).catch(
    ignoreMissing(null),
  );
  const people = data?.items ?? [];

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-extrabold sm:text-4xl">{title}</h1>
      <p className="mt-1.5 max-w-2xl text-sm text-muted">{blurb}</p>

      {people.length === 0 ? (
        <p className="mt-8 text-sm text-muted">Belum ada data.</p>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6 ss-stagger">
            {people.map((p) => (
              <Link
                key={p.databaseId}
                href={`${routeBase}/${p.slug}`}
                className="group text-center"
              >
                <div className="mx-auto h-28 w-28 overflow-hidden rounded-full bg-surface">
                  {p.featuredImage?.node?.sourceUrl && (
                    <Image
                      src={p.featuredImage.node.sourceUrl}
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
              </Link>
            ))}
          </div>

          {data?.hasNext && data.endCursor && (
            <nav className="mt-10 flex justify-center" aria-label="Paginasi">
              <Link
                href={`${routeBase}?after=${encodeURIComponent(data.endCursor)}`}
                className="press inline-flex min-h-11 items-center rounded-full border border-line bg-white px-6 text-sm font-extrabold text-ink hover:border-pink hover:text-pink"
              >
                Muat lebih banyak →
              </Link>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
