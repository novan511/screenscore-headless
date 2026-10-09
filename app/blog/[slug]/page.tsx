import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdSlot } from "@/components/AdSlot";
import { JsonLd } from "@/components/JsonLd";
import { ADSENSE, SITE, siteUrl } from "@/lib/config";
import { fetchPostDetail, fetchRelatedPosts, postUrl, type BlogPost } from "@/lib/blog";
import { sanitizeArticleHtml } from "@/lib/utils";

export const revalidate = 300;
export const dynamicParams = true;

/**
 * Empty on purpose — 1,400+ posts would make the build crawl WordPress.
 * The first hit renders on demand and ISR keeps it warm for 5 minutes.
 * An explicit array is still required so Next registers the dynamic route.
 */
export function generateStaticParams(): { slug: string }[] {
  return [];
}

interface Props {
  params: Promise<{ slug: string }>;
}

const DATE_FMT = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function published(post: BlogPost): string {
  return DATE_FMT.format(new Date(post.date));
}

function modified(post: BlogPost): string {
  return DATE_FMT.format(new Date(post.modified));
}

function wasUpdated(post: BlogPost): boolean {
  return (
    new Date(post.modified).getTime() - new Date(post.date).getTime() >
    1000 * 60 * 60 * 24
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchPostDetail(slug);
  if (!post) return { title: "Artikel tidak ditemukan" };

  const description =
    post.excerpt ||
    post.content?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
  const path = post.path;

  return {
    title: post.title,
    ...(description && { description }),
    alternates: { canonical: path },
    authors: [{ name: post.author.name }],
    openGraph: {
      type: "article",
      title: post.title,
      ...(description && { description }),
      url: path,
      siteName: SITE.name,
      locale: "id_ID",
      publishedTime: post.date,
      modifiedTime: post.modified,
      authors: [post.author.name],
      ...(post.category && { tags: [post.category.name] }),
    },
    twitter: {
      card: "summary",
      title: post.title,
      ...(description && { description }),
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await fetchPostDetail(slug);
  if (!post) notFound();

  const related = await fetchRelatedPosts(post);
  const updated = wasUpdated(post);
  const description = post.excerpt || post.title;

  return (
    <div className="ss-container py-10 sm:py-14">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description,
            datePublished: post.date,
            dateModified: post.modified,
            inLanguage: "id",
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": postUrl(post.slug),
            },
            author: {
              "@type": "Person",
              name: post.author.name,
            },
            publisher: {
              "@type": "Organization",
              name: SITE.name,
              url: siteUrl("/"),
            },
            ...(post.category && { articleSection: post.category.name }),
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Beranda", item: siteUrl("/") },
              { "@type": "ListItem", position: 2, name: "Artikel", item: siteUrl("/blog") },
              {
                "@type": "ListItem",
                position: 3,
                name: post.title,
                item: postUrl(post.slug),
              },
            ],
          },
        ]}
      />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <h1 className="text-[2rem] font-bold leading-[1.15] tracking-tight text-ink sm:text-[2.5rem]">
            {post.title}
          </h1>

          <nav aria-label="Breadcrumb" className="mt-3 text-sm text-muted">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link href="/" className="hover:text-pink-600">
                  Home
                </Link>
              </li>
              <li aria-hidden>»</li>
              <li>
                <Link href="/blog" className="hover:text-pink-600">
                  Blog
                </Link>
              </li>
              <li aria-hidden>»</li>
              <li className="line-clamp-1 text-ink" aria-current="page">
                {post.title}
              </li>
            </ol>
          </nav>

          <hr className="mt-6 w-16 border-t-2 border-ink/70" />

          {/* byline — author + publish date, the way the legacy post prints it */}
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
            <span className="inline-flex items-center gap-2">
              <svg
                viewBox="0 0 16 16"
                width="15"
                height="15"
                aria-hidden
                className="shrink-0"
              >
                <path
                  fill="currentColor"
                  d="M2 12.5 11.5 3l1.5 1.5-9.5 9.5H2v-1.5Zm9.7-7.7 1-1a1 1 0 0 0 0-1.4l-.9-.9a1 1 0 0 0-1.4 0l-1 1 2.3 2.3Z"
                />
              </svg>
              Penulis :{" "}
              <strong className="font-semibold text-ink">
                {post.author.name}
              </strong>
            </span>
            <span aria-hidden className="text-line">
              |
            </span>
            <span className="inline-flex items-center gap-2">
              <svg
                viewBox="0 0 16 16"
                width="15"
                height="15"
                aria-hidden
                className="shrink-0"
              >
                <path
                  fill="currentColor"
                  d="M4 1.5V3H2.5A1.5 1.5 0 0 0 1 4.5V13a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 15 13V4.5A1.5 1.5 0 0 0 13.5 3H12V1.5h-1.5V3h-5V1.5H4ZM2.5 6h11v6.5h-11V6Z"
                />
              </svg>
              <time dateTime={post.date}>{published(post)}</time>
            </span>
            {updated && (
              <span className="text-xs">
                · Diperbarui <time dateTime={post.modified}>{modified(post)}</time>
              </span>
            )}
            {post.readingMinutes && (
              <span className="text-xs">· {post.readingMinutes} menit baca</span>
            )}
          </div>

          {/* Screenscore_top_article */}
          <AdSlot
            slot={ADSENSE.slots.topArticle}
            label="Screenscore_top_article"
            className="mt-7"
          />

          <div
            className="article-prose mt-7"
            dangerouslySetInnerHTML={{
              __html: sanitizeArticleHtml(post.content ?? ""),
            }}
          />

          {/* Screenscore_after_article */}
          <AdSlot
            slot={ADSENSE.slots.afterArticle}
            label="Screenscore_after_article"
            className="mt-9"
          />

          {post.category && (
            <p className="mt-8 text-sm text-muted">
              Kategori :{" "}
              <Link
                href={`/blog?cat=${post.category.slug}`}
                className="font-semibold text-ink hover:text-pink-600"
              >
                {post.category.name}
              </Link>
            </p>
          )}

          {/* Editorial provenance — who stands behind the copy */}
          <section className="mt-10">
            <h2 className="text-[1.5rem] font-bold tracking-tight text-ink">
              About Writer
            </h2>
            <div className="mt-4 flex gap-4 rounded-xl bg-surface p-5 sm:gap-5 sm:p-6">
              {post.author.avatar ? (
                <Image
                  src={post.author.avatar}
                  alt={post.author.name}
                  width={56}
                  height={56}
                  className="h-14 w-14 shrink-0 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span
                  aria-hidden
                  className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-yellow text-xl font-bold text-ink"
                >
                  {post.author.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="text-base font-bold text-ink">
                  {post.author.name}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  {SITE.tagline} — ulasan dan panduan usia untuk film, serial,
                  game, e-book, dan aplikasi pilihan keluarga.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* ================= sidebar ================= */}
        <aside className="space-y-6 lg:pt-4">
          <div className="rounded-lg bg-surface p-5 text-sm leading-relaxed text-muted">
            digitalMamaID menghadirkan Screen Score sebagai wadah bagi orang tua
            untuk mereview konten digital anak. Ulasan dan penilaian ini akan
            menjadi panduan yang berharga bagi orangtua lainnya dalam
            menciptakan ruang digital yang aman bagi anak.
          </div>

          {/* Screenscore_sidebar_article */}
          <AdSlot
            slot={ADSENSE.slots.sidebarArticle}
            label="Screenscore_sidebar_article"
          />

          {related.length > 0 && (
            <section className="rounded-lg border border-line bg-white p-5">
              <h2 className="text-xl font-bold text-ink">Artikel Terpopuler</h2>
              <ul className="mt-4 space-y-5">
                {related.slice(0, 4).map((p) => (
                  <li key={p.id}>
                    <Link href={p.path} className="group block">
                      <p className="text-[15px] font-bold leading-snug text-ink transition group-hover:text-pink-600">
                        {p.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm text-muted">
                        {p.excerpt}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
