import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PersonDetail } from "@/components/PersonDetail";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: slug.replace(/-/g, " ") };
}

export default async function CreatorDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const view = await PersonDetail({ kind: "creator", path: slug });
  if (!view) notFound();
  return view;
}
