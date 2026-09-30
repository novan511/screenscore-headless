import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Rail } from "@/components/Rail";
import { ScorePanel } from "@/components/ScorePanel";
import { JsonLd } from "@/components/JsonLd";
import { fetchScreenScore, fetchTitleSeo } from "@/lib/bridge";
import { CATEGORIES, SITE, productPermalink, siteUrl } from "@/lib/config";
import { fetchRelated, fetchTitleBySlug } from "@/lib/store";
import { sanitizeWpHtml, stripTags } from "@/lib/utils";

export const revalidate = 300;
export const dynamicParams = true;

export function generateStaticParams(): { slug: string }[] {
  return [];
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  // Both start together: the Store API carries the structured fields (2.4s),
  // the rendered page carries Yoast (0.2s) — serialising them made every cold
  // render pay for both. The page component reuses both via React `cache`.
  const [title, seo] = await Promise.all([
    fetchTitleBySlug(slug),
    fetchTitleSeo(productPermalink(slug)),
  ]);

  if (!title && !seo) {
    return { title: "Judul tidak ditemukan", robots: { index: false } };
  }

  const path = `/content/${slug}`;
  const name = seo?.title || title?.name || slug;
  // Yoast ships an empty description for most products — fall back to the hook line.
  const description = seo?.description || title?.excerpt || undefined;
  const image = seo?.image || title?.images[0]?.src;

  return {
    // Yoast already appends the brand ("- Screen Score") — applying the
    // `%s · ScreenScore` template on top produced "…- Screen Score · ScreenScore".
    title: seo?.title ? { absolute: seo.title } : title?.name || slug,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: name,
      description,
      url: path,
      siteName: SITE.name,
      type: "article",
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: name,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function TitlePage({ params }: Props) {
  const { slug } = await params;
  const title = await fetchTitleBySlug(slug);
  if (!title) notFound();

  // Score comes from the same HTML the metadata scrape already downloaded.
  const score = await fetchScreenScore(title.permalink).catch(() => null);

  const category = title.categories[0];
  const poster = title.images[0];
  const categoryPath = category ? CATEGORIES[category.slug]?.path ?? "/films" : null;

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Beranda", item: siteUrl("/") },
          ...(categoryPath && category
            ? [
                {
                  "@type": "ListItem",
                  position: 2,
                  name: category.name,
                  item: siteUrl(categoryPath),
                },
              ]
            : []),
          {
            "@type": "ListItem",
            position: categoryPath ? 3 : 2,
            name: title.name,
            item: siteUrl(`/content/${title.slug}`),
          },
        ],
      },
      {
        "@type": "Product",
        name: title.name,
        image: title.images.map((i) => i.src),
        description: title.excerpt ?? (stripTags(title.body).slice(0, 500) || undefined),
        ...(category && { category: category.name }),
        // Only publish ratings WordPress actually collected.
        ...(title.reviewCount > 0 && {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: title.averageRating,
            bestRating: 5,
            worstRating: 0,
            reviewCount: title.reviewCount,
          },
        }),
        ...(score?.score != null && {
          review: {
            "@type": "Review",
            name: score.label,
            ...(stripTags(score.review) && {
              reviewBody: stripTags(score.review).slice(0, 2000),
            }),
            reviewRating: {
              "@type": "Rating",
              ratingValue: score.score,
              bestRating: 5,
              worstRating: 0,
            },
            author: { "@type": "Organization", name: SITE.name },
          },
        }),
      },
    ],
  };

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6">
      <JsonLd data={structuredData} />
      {/* breadcrumb */}
      <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-muted">
        <Link href="/" className="hover:text-pink">Beranda</Link>
        <span>/</span>
        {category && categoryPath && (
          <>
            <Link href={categoryPath} className="hover:text-pink">
              {category.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-ink">{title.name}</span>
      </nav>

      {/* header band */}
      <div className="rounded-2xl bg-surface p-5 sm:p-7">
        <div className="flex flex-col gap-6 sm:flex-row">
          <div
            className="relative mx-auto w-44 shrink-0 overflow-hidden rounded-xl bg-line sm:mx-0 sm:w-52"
            style={{ aspectRatio: "2 / 3" }}
          >
            {poster && (
              <Image
                src={poster.src}
                alt={poster.alt || title.name}
                fill
                priority
                sizes="208px"
                quality={70}
                className="object-cover"
              />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-2 text-xs font-bold">
              {category && (
                <span className="rounded bg-ink px-2 py-1 uppercase tracking-wide text-white">
                  {category.name}
                </span>
              )}
              {title.year && (
                <span className="rounded bg-white px-2 py-1 text-ink">{title.year}</span>
              )}
              {title.ageRating && (
                <span className="rounded bg-yellow px-2 py-1 text-ink tabular">
                  {title.ageRating}
                </span>
              )}
            </div>

            <h1 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">
              {title.name}
            </h1>

            {/* Lead line — also fills the header band on titles that ship no year/age/rating. */}
            {title.excerpt && (
              <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-ink/80 sm:text-base">
                {title.excerpt}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-muted">
              {title.year && <span>Tahun {title.year}</span>}
              {title.reviewCount > 0 && (
                <span className="tabular">
                  ★ {title.averageRating.toFixed(1)} · {title.reviewCount} review orang tua
                </span>
              )}
              {title.tags.slice(0, 5).map((t) => (
                <span key={t.id} className="rounded-full bg-line px-2 py-0.5">
                  {t.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* signature score block */}
        <div className="mt-6">
          <ScorePanel score={score} title={title} />
        </div>
      </div>

      {/* synopsis — falls back to short_description when description is empty */}
      {title.body && (
        <section className="mt-10">
          <h2 className="mb-3 text-xl font-extrabold sm:text-2xl">
            {title.description ? "Sinopsis Lengkap" : "Tentang Judul Ini"}
          </h2>
          <div
            className="max-w-3xl space-y-3 text-[15px] leading-relaxed text-ink/85 [&_b]:font-bold [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-extrabold [&_h3]:mt-5 [&_h3]:text-base [&_h3]:font-bold [&_h4]:mt-4 [&_h4]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_p]:my-2 [&_table]:w-full [&_td]:border [&_td]:border-line [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-line [&_th]:px-2 [&_th]:py-1 [&_th]:text-left"
            dangerouslySetInnerHTML={{
              __html: sanitizeWpHtml(title.body),
            }}
          />
        </section>
      )}

      {/* Related titles cost a second Store API round trip (~2.8s cold), so
          they stream in behind the article instead of holding up first paint. */}
      {category && (
        <Suspense fallback={<RelatedRailSkeleton />}>
          <RelatedRail
            categorySlug={category.slug}
            excludeSlug={title.slug}
            label={category.name}
          />
        </Suspense>
      )}
    </div>
  );
}

async function RelatedRail({
  categorySlug,
  excludeSlug,
  label,
}: {
  categorySlug: string;
  excludeSlug: string;
  label: string;
}) {
  const related = await fetchRelated(categorySlug, excludeSlug, 8).catch(
    () => [],
  );
  if (!related.length) return null;
  return (
    <Rail
      heading="Mirip dengan ini"
      blurb={`Lebih banyak ${label} pilihan`}
      href={CATEGORIES[categorySlug]?.path ?? "/films"}
      items={related}
    />
  );
}

/** Matches a Rail's footprint so the streamed-in cards do not shift the page. */
function RelatedRailSkeleton() {
  return (
    <section className="mt-12" aria-busy="true">
      <div className="mb-4 h-7 w-52 rounded skeleton" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="w-[156px] shrink-0">
            <div className="skeleton aspect-[2/3] w-full rounded-lg" />
            <div className="skeleton mt-2.5 h-4 w-4/5 rounded" />
          </div>
        ))}
      </div>
    </section>
  );
}
