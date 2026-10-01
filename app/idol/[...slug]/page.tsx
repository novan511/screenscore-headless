import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PersonDetail, RelatedPeopleBlock } from "@/components/PersonDetail";
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
  return personMetadata("idol", path, personCanonical("idol", path));
}

/**
 * Hierarchical idol URLs: groups (/idol/bts) and members
 * (/idol/bts/jung-kook) share one catch-all, like character.
 */
export default async function IdolDetailPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  if (!slug.length) notFound();
  const path = slug.join("/");
  const view = await PersonDetail({ kind: "idol", path });
  if (!view) notFound();
  return (
    <>
      {view}
      <RelatedPeopleBlock kind="idol" path={path} />
    </>
  );
}
