import type { Metadata } from "next";
import { ArchiveView } from "@/components/ArchiveView";
import { CATEGORIES } from "@/lib/config";
import { parseArchiveParams } from "@/lib/params";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Serial",
  description: CATEGORIES.series.blurb,
};

export default async function SeriesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; age?: string }>;
}) {
  const { page, age } = await parseArchiveParams(searchParams);
  return <ArchiveView category={CATEGORIES.series} page={page} age={age} />;
}
