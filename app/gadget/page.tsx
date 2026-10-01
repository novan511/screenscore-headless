import type { Metadata } from "next";
import { PeopleArchive } from "@/components/PeopleArchive";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Gadget",
  description:
    "Review gadget untuk anak: spesifikasi, performa gaming, dan keamanan perangkat di ScreenScore.",
  alternates: { canonical: "/gadget" },
  openGraph: { url: "/gadget" },
};

export default async function GadgetIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ after?: string }>;
}) {
  const { after } = await searchParams;
  return (
    <PeopleArchive
      kind="gadget"
      routeBase="/gadget"
      title="Gadget"
      blurb="Review HP dan perangkat untuk anak — cocok untuk gaming dan aman dipakai."
      after={after}
    />
  );
}
