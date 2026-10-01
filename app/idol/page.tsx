import type { Metadata } from "next";
import { PeopleArchive } from "@/components/PeopleArchive";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Idola",
  description:
    "Idola K-pop dan favorit anak: profil dan fakta aman untuk keluarga di ScreenScore.",
  alternates: { canonical: "/idol" },
  openGraph: { url: "/idol" },
};

export default async function IdolIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ after?: string }>;
}) {
  const { after } = await searchParams;
  return (
    <PeopleArchive
      kind="idol"
      routeBase="/idol"
      title="Idola"
      blurb="Idola favorit anak — kenali profilnya, pastikan idolanya aman."
      after={after}
    />
  );
}
