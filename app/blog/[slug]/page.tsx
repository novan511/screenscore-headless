import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleCard } from "@/components/ArticleCard";
import { JsonLd } from "@/components/JsonLd";
import { SITE, siteUrl } from "@/lib/config";
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
    <div className="mx-auto max-w-[860px] px-4 py-10 sm:px-6 sm:py-14">
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

      <nav aria-label="Breadcrumb" className="text-sm font-semibold text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-pink">
              Beranda
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li>
            <Link href="/blog" className="hover:text-pink">
              Artikel
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li className="line-clamp-1 text-ink" aria-current="page">
            {post.title}
          </li>
        </ol>
      </nav>

      <article className="mt-6">
        <header>
          {post.category && (
            <Link
              href={`/blog?cat=${post.category.slug}`}
              className="inline-flex rounded-full bg-mint px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-ink hover:bg-mint-600 hover:text-white"
            >
              {post.category.name}
            </Link>
          )}
          <h1 className="mt-4 text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
            {post.title}
          </h1>

          {/* E-E-A-T: byline, avatar, publish + updated dates, reading time */}
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-line bg-surface px-4 py-3">
            {post.author.avatar ? (
              <Image
                src={post.author.avatar}
                alt={post.author.name}
                width={40}
                height={40}
                className="rounded-full ring-2 ring-white"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span
                aria-hidden
                className="grid h-10 w-10 place-items-center rounded-full bg-pink text-sm font-extrabold text-white"
              >
                {post.author.name.slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="text-sm">
              <p className="font-extrabold text-ink">{post.author.name}</p>
              <p className="text-xs text-muted">
                <time dateTime={post.date}>Dipublikasikan {published(post)}</time>
                {updated && (
                  <>
                    {" · "}
                    <time dateTime={post.modified}>Diperbarui {modified(post)}</time>
                  </>
                )}
                {post.readingMinutes && <> · {post.readingMinutes} menit baca</>}
              </p>
            </div>
          </div>
        </header>

        <div
          className="article-prose mt-8"
          dangerouslySetInnerHTML={{
            __html: sanitizeArticleHtml(post.content ?? ""),
          }}
        />

        {/* Editorial provenance — who stands behind the copy */}
        <aside className="mt-10 rounded-3xl border border-pink/15 bg-blush p-5 sm:p-6">
          <h2 className="text-base font-extrabold text-ink">
            🛡️ Tentang artikel ini
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink/80">
            Ditulis oleh <strong>{post.author.name}</strong> untuk {SITE.name} —
            redaksi yang meninjau konten anak berdasarkan rating usia dan skor
            keamanan 6 dimensi kami. Selalu cocokkan panduan usia di artikel ini
            dengan kebutuhan keluarga Anda.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/tentang-kami"
              className="press rounded-full bg-white px-4 py-2 text-xs font-extrabold text-ink border border-line hover:border-pink hover:text-pink"
            >
              Cara kami menilai →
            </Link>
            <Link
              href="/films"
              className="press rounded-full bg-pink px-4 py-2 text-xs font-extrabold text-white hover:bg-pink-600"
            >
              Cari tontonan aman
            </Link>
          </div>
        </aside>
      </article>

      {related.length > 0 && (
        <section className="mt-14" aria-labelledby="related-heading">
          <h2 id="related-heading" className="mb-4 text-xl font-extrabold sm:text-2xl">
            📖 Baca Juga
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {related.map((p, i) => (
              <ArticleCard key={p.id} post={p} index={i} showExcerpt={false} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
