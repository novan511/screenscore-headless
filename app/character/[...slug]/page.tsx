import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PersonDetail } from "@/components/PersonDetail";
import { personCanonical, personMetadata } from "@/lib/person";

export const revalidate = 3600;
export const dynamicParams = true;

/**
 * Must exist (even empty) for Next to register this dynamic segment in
 * `prerender-manifest.dynamicRoutes` — without it every hit renders with
 * `Cache-Control: no-store` and ISR never kicks in.
 */
export function generateStaticParams(): { slug: string[] }[] {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!slug.length) notFound();
  const path = slug.join("/");
  return personMetadata("character", path, personCanonical("character", path));
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
