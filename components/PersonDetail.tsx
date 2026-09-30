import Image from "next/image";
import Link from "next/link";
import { fetchPersonBio } from "@/lib/bridge";
import { fetchPerson } from "@/lib/graphql";
import { sanitizeWpHtml } from "@/lib/utils";
import type { PersonKind } from "@/lib/types";

const KIND_LABEL: Record<PersonKind, string> = {
  cast: "Pemeran",
  creator: "Kreator",
  character: "Karakter",
  song: "Lagu",
  idol: "Idola",
};

const KIND_HOME: Record<PersonKind, string> = {
  cast: "/cast",
  creator: "/cast",
  character: "/characters",
  song: "/song",
  idol: "/cast",
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
    <div className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6">
      <nav className="mb-6 text-xs font-semibold text-muted">
        <Link href="/" className="hover:text-pink">Beranda</Link>
        <span> / </span>
        <Link href={KIND_HOME[kind]} className="hover:text-pink">
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
