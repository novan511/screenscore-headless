import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { fetchPeople } from "@/lib/graphql";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Pemeran",
  description: "Daftar pemeran yang terdaftar di ScreenScore.",
};

export default async function CastIndexPage() {
  const data = await fetchPeople("cast", { first: 48 }).catch(() => null);
  const people = data?.items ?? [];

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-extrabold sm:text-4xl">Pemeran</h1>
      <p className="mt-1.5 text-sm text-muted">
        Sosok di balik tontonan favorit keluarga.
      </p>

      {people.length === 0 ? (
        <p className="mt-8 text-sm text-muted">Belum ada data.</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {people.map((p) => (
            <Link key={p.databaseId} href={`/cast/${p.slug}`} className="group text-center">
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
          ))}
        </div>
      )}
    </div>
  );
}
