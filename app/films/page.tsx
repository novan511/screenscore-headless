import type { Metadata } from "next";
import { ArchiveView } from "@/components/ArchiveView";
import { CATEGORIES } from "@/lib/config";
import { archiveMetadata, parseArchiveParams } from "@/lib/params";

export const revalidate = 300;

interface Props {
  searchParams: Promise<{ page?: string; age?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await parseArchiveParams(searchParams);
  return archiveMetadata(CATEGORIES.film, params);
}

export default async function FilmsPage({ searchParams }: Props) {
  const { page, age } = await parseArchiveParams(searchParams);
  return <ArchiveView category={CATEGORIES.film} page={page} age={age} />;
}
