import type { Metadata } from "next";
import { ArchiveView } from "@/components/ArchiveView";
import { CATEGORIES } from "@/lib/config";
import { parseArchiveParams } from "@/lib/params";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "E-Books",
  description: CATEGORIES["e-books"].blurb,
};

export default async function EBooksPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; age?: string }>;
}) {
  const { page, age } = await parseArchiveParams(searchParams);
  return <ArchiveView category={CATEGORIES["e-books"]} page={page} age={age} />;
}
