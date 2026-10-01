import type { Metadata } from "next";
import { PeopleArchive } from "@/components/PeopleArchive";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Pemeran",
  description: "Daftar pemeran yang terdaftar di ScreenScore.",
  alternates: { canonical: "/cast" },
  openGraph: { url: "/cast" },
};

export default async function CastIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ after?: string }>;
}) {
  const { after } = await searchParams;
  return (
    <PeopleArchive
      kind="cast"
      routeBase="/cast"
      title="Pemeran"
      blurb="Sosok di balik tontonan favorit keluarga."
      after={after}
    />
  );
}
