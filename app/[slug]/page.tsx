import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchStaticPage } from "@/lib/graphql";
import { sanitizeWpHtml } from "@/lib/utils";

export const revalidate = 3600;
export const dynamicParams = true;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const page = await fetchStaticPage(slug);
    if (page) return { title: page.title };
  } catch {
    /* fall through */
  }
  return { title: slug.replace(/-/g, " ") };
}

/**
 * Generic resolver for legacy static pages:
 * tentang-kami, contact, ajukan-judul-baru, register,
 * ketentuan-layanan-screenscore, privacy-policy, biography…
 */
export default async function StaticPage({ params }: Props) {
  const { slug } = await params;
  let page = null;
  try {
    page = await fetchStaticPage(slug);
  } catch {
    page = null;
  }
  if (!page) notFound();

  return (
    <div className="mx-auto max-w-[860px] px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-extrabold sm:text-4xl">{page.title}</h1>
      <article
        className="prose-headings:font-bold mt-6 space-y-3 text-[15px] leading-relaxed text-ink/85 [&_a]:text-pink [&_a]:underline [&_b]:font-bold [&_h2]:mt-8 [&_h2]:text-xl [&_li]:ml-5 [&_li]:list-disc [&_p]:my-3"
        dangerouslySetInnerHTML={{ __html: sanitizeWpHtml(page.content) }}
      />
    </div>
  );
}
