import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { fetchStaticPage } from "@/lib/graphql";
import { ignoreMissing, isUpstreamError } from "@/lib/http";
import { fetchPageSeo } from "@/lib/bridge";
import { fetchPostDetail } from "@/lib/blog";
import { sanitizeWpHtml, metaDescription } from "@/lib/utils";
import { SITE } from "@/lib/config";

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

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [seo, page] = await Promise.all([
    fetchPageSeo(slug),
    fetchStaticPage(slug).catch(ignoreMissing(null)),
  ]);

  const plainTitle = page?.title || slug.replace(/-/g, " ");
  const path = `/${slug}`;
  // Yoast descriptions for static pages usually begin with the page title
  // itself; strip that repeat and clamp so the SERP snippet stays readable.
  const description = metaDescription(seo?.description, plainTitle);

  return {
    // Yoast already appends the brand — don't stack the site template on top.
    title: seo?.title ? { absolute: seo.title } : plainTitle,
    ...(description && { description }),
    alternates: { canonical: path },
    openGraph: {
      title: seo?.title || plainTitle,
      ...(description && { description }),
      url: path,
      siteName: SITE.name,
    },
    twitter: {
      card: "summary",
      title: seo?.title || plainTitle,
      ...(description && { description }),
    },
  };
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
  } catch (err) {
    // WordPress being down is not proof that the page doesn't exist.
    if (isUpstreamError(err)) throw err;
    page = null;
  }
  if (!page) {
    // Legacy post permalinks live at the WP root — keep those URLs working
    // (308) by sending them to their new home under /blog.
    const post = await fetchPostDetail(slug).catch((err) => {
      if (isUpstreamError(err)) throw err;
      return null;
    });
    if (post) permanentRedirect(post.path);
    notFound();
  }

  return (
    <div className="mx-auto max-w-[860px] px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-[2rem] font-bold leading-[1.15] tracking-tight sm:text-[2.5rem]">
        {page.title}
      </h1>
      <nav className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-muted">
        <Link href="/" className="transition hover:text-pink">
          Beranda
        </Link>
        <span aria-hidden>/</span>
        <span className="font-medium text-ink">{page.title}</span>
      </nav>
      <hr className="mt-6 w-16 border-t-2 border-ink/70" />
      <article
        className="article-prose mt-7"
        dangerouslySetInnerHTML={{ __html: sanitizeWpHtml(page.content) }}
      />
    </div>
  );
}
