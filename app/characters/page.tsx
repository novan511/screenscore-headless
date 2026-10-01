import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { fetchPeople } from "@/lib/graphql";
import { catchUpstreamBuild } from "@/lib/http";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Karakter",
  description: "Karakter film, serial, dan game di ScreenScore.",
  alternates: { canonical: "/characters" },
  openGraph: { url: "/characters" },
};

export default async function CharactersPage() {
  const data = await fetchPeople("character", { first: 48 }).catch(catchUpstreamBuild(null));
  const people = data?.items ?? [];

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-extrabold sm:text-4xl">Karakter</h1>
      <p className="mt-1.5 text-sm text-muted">
        Tokoh-tokoh yang dikenal anak-anak.
      </p>

      {people.length === 0 ? (
        <p className="mt-8 text-sm text-muted">Belum ada data.</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {people.map((p) => {
            const segments = p.uri.replace(/^\/+|\/+$/g, "").split("/");
            return (
              <Link
                key={p.databaseId}
                href={`/${segments.join("/")}`}
                className="group text-center"
              >
                <div className="mx-auto h-28 w-28 overflow-hidden rounded-full bg-surface">
                  {p.featuredImage?.node?.sourceUrl && (
                    <Image
                      src={p.featuredImage.node.sourceUrl}
                      alt={p.title}
                      width={112}
                      height={112}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-bold group-hover:text-pink">
                  {p.title}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
