import type { Metadata } from "next";
import { ArchiveView } from "@/components/ArchiveView";
import { CATEGORIES } from "@/lib/config";
import { parseArchiveParams } from "@/lib/params";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Aplikasi",
  description: CATEGORIES.aplikasi.blurb,
};

export default async function AplikasiPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; age?: string }>;
}) {
  const { page, age } = await parseArchiveParams(searchParams);
  return <ArchiveView category={CATEGORIES.aplikasi} page={page} age={age} />;
}
