import type { Metadata } from "next";
import { ArchiveView } from "@/components/ArchiveView";
import { CATEGORIES } from "@/lib/config";
import { parseArchiveParams } from "@/lib/params";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Film",
  description: CATEGORIES.film.blurb,
};

export default async function FilmsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; age?: string }>;
}) {
  const { page, age } = await parseArchiveParams(searchParams);
  return <ArchiveView category={CATEGORIES.film} page={page} age={age} />;
}
