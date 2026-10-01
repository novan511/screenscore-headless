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
export function generateStaticParams(): { slug: string }[] {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return personMetadata(
    "pro-player",
    slug,
    personCanonical("pro-player", slug),
  );
}

export default async function ProPlayerDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const view = await PersonDetail({ kind: "pro-player", path: slug });
  if (!view) notFound();
  return (
    <>
      {view}
      <RelatedPeopleBlock kind="pro-player" path={slug} />
    </>
  );
}
