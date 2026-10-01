import type { Metadata } from "next";
import { PeopleArchive } from "@/components/PeopleArchive";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Pro Player",
  description:
    "Atlet esports Indonesia dan dunia: profil pro player favorit anak di ScreenScore.",
  alternates: { canonical: "/pro-player" },
  openGraph: { url: "/pro-player" },
};

export default async function ProPlayerIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ after?: string }>;
}) {
  const { after } = await searchParams;
  return (
    <PeopleArchive
      kind="pro-player"
      routeBase="/pro-player"
      title="Pro Player"
      blurb="Atlet esports yang diidolakan anak — kenali profil dan perjalanannya."
      after={after}
    />
  );
}
