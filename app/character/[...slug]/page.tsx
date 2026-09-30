import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PersonDetail } from "@/components/PersonDetail";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: slug[slug.length - 1].replace(/-/g, " ") };
}

/** Hierarchical character URLs: /character/marvel/carnage */
export default async function CharacterDetailPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  if (!slug.length) notFound();
  const view = await PersonDetail({ kind: "character", path: slug.join("/") });
  if (!view) notFound();
  return view;
}
