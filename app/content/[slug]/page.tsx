import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Rail } from "@/components/Rail";
import { ScorePanel } from "@/components/ScorePanel";
import { TrailerPlayer } from "@/components/TrailerPlayer";
import { ReviewWriter } from "@/components/ReviewWriter";
import { MemberReviews, ReviewsSkeleton } from "@/components/MemberReviews";
import { JsonLd } from "@/components/JsonLd";
import { renderArticle } from "@/lib/article";
import {
  fetchScreenScore,
  fetchTitleSeo,
  fetchTrailer,
} from "@/lib/bridge";
import { CATEGORIES, SITE, WP_SITE, AGE_TAGS, productPermalink, siteUrl } from "@/lib/config";
import { fetchRelated, fetchTitleBySlug } from "@/lib/store";
import { stripTags, clamp, metaDescription } from "@/lib/utils";

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
  // Yoast ships an empty description for most products, and for the rest it
  // tends to repeat the title or open with a raw WP block label ("Sinopsis
  // Lengkap  Mayor Tom Loftis…"). Clean the label, clamp to a SERP-sized
  // snippet, and fall back to the excerpt.
  const description =
    metaDescription(seo?.description, name) ||
    (title?.excerpt ? clamp(title.excerpt, 155) : undefined);
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

/** Trailer lives on film/series pages only — other categories skip the section. */
const TRAILER_CATEGORIES = new Set(["film", "series"]);

export default async function TitlePage({ params }: Props) {
  const { slug } = await params;
  const title = await fetchTitleBySlug(slug);
  if (!title) notFound();

  // Score + trailer come from the same rendered WordPress page, so the
  // cached HTML download is shared with the SEO scrape above.
  const [score, trailer] = await Promise.all([
    fetchScreenScore(title.permalink).catch(() => null),
    fetchTrailer(title.permalink),
  ]);

  const category = title.categories[0];
  const poster = title.images[0];
  const categoryPath = category ? CATEGORIES[category.slug]?.path ?? "/films" : null;

  /*
   * Common Sense Media-style cross-link: when the product carries a "Kelompok
   * Umur" tag, the age chip becomes a door to the same archive pre-filtered
   * for that age band — parents deciding "is this for my kid?" get one tap to
   * "show me more like this for this age". Pure server-rendered link, no JS.
   */
  const ageTag = title.tags.find((t) =>
    AGE_TAGS.some((a) => a.slug === t.slug),
  );
  const ageHref =
    ageTag && categoryPath
      ? `${categoryPath}?age=${encodeURIComponent(ageTag.slug)}`
      : null;

  const showTrailer = !!(
    trailer &&
    category &&
    TRAILER_CATEGORIES.has(category.slug)
  );
  const article = renderArticle(title.body);
  const showScore = !!score || title.averageRating > 0;

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
    <>
      <JsonLd data={structuredData} />

      {/* ================= hero — cinematic ink band ================= */}
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="absolute inset-0">
          {poster && (
            <Image
              src={poster.src}
              alt=""
              fill
              priority
              sizes="100vw"
              quality={55}
              className="scale-110 object-cover opacity-45 blur-2xl"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-br from-ink via-ink/92 to-ink/55" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-ink to-transparent" />
        </div>

        <div className="relative mx-auto max-w-[1280px] px-4 pb-16 pt-5 sm:px-6 sm:pb-24">
          {/* breadcrumb */}
          <nav className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-white/45">
            <Link href="/" className="transition hover:text-yellow">
              Beranda
            </Link>
            <span aria-hidden>/</span>
            {category && categoryPath && (
              <>
                <Link href={categoryPath} className="transition hover:text-yellow">
                  {category.name}
                </Link>
                <span aria-hidden>/</span>
              </>
            )}
            <span className="text-white/85">{title.name}</span>
          </nav>

          <div className="mt-6 flex flex-col gap-7 sm:flex-row sm:gap-9">
            {/* poster */}
            <div
              className="relative mx-auto w-40 shrink-0 overflow-hidden rounded-2xl bg-white/10 shadow-[0_28px_70px_-24px_rgb(0_0_0/0.7)] ring-1 ring-white/20 sm:mx-0 sm:w-48 lg:w-56"
              style={{ aspectRatio: "2 / 3" }}
            >
              {poster && (
                <Image
                  src={poster.src}
                  alt={poster.alt || title.name}
                  fill
                  priority
                  sizes="(max-width: 640px) 160px, 224px"
                  quality={75}
                  className="object-cover"
                />
              )}
            </div>

            {/* title block */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-2 text-[11px] font-extrabold uppercase tracking-wide">
                {category && (
                  <span className="rounded bg-pink px-2.5 py-1 text-white">
                    {category.name}
                  </span>
                )}
                {title.year && (
                  <span className="rounded bg-white/15 px-2.5 py-1 text-white backdrop-blur-sm">
                    {title.year}
                  </span>
                )}
                {title.ageRating &&
                  (ageHref ? (
                    <Link
                      href={ageHref}
                      title={`Lihat ${category?.name ?? "judul"} lain untuk usia ini`}
                      className="tabular rounded bg-yellow px-2.5 py-1 text-ink transition hover:bg-yellow-600 hover:underline"
                    >
                      {title.ageRating}
                    </Link>
                  ) : (
                    <span className="tabular rounded bg-yellow px-2.5 py-1 text-ink">
                      {title.ageRating}
                    </span>
                  ))}
              </div>

              <h1 className="mt-3.5 text-3xl font-extrabold leading-[1.08] tracking-tight sm:text-4xl lg:text-5xl">
                {title.name}
              </h1>

              {title.excerpt && (
                <p className="mt-4 max-w-2xl text-sm font-medium leading-relaxed text-white/75 sm:text-base">
                  {title.excerpt}
                </p>
              )}

              {/* score chip + community rating */}
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2.5">
                {score?.score != null && (
                  <span className="flex items-center gap-2.5 rounded-lg bg-yellow px-3.5 py-2 text-ink">
                    <b className="tabular text-xl font-extrabold leading-none">
                      {score.score.toFixed(1)}
                    </b>
                    <span className="text-[9px] font-extrabold uppercase leading-[1.15] tracking-wider">
                      Screen
                      <br />
                      Score
                    </span>
                  </span>
                )}
                {title.reviewCount > 0 && (
                  <span className="tabular text-sm font-semibold text-white/75">
                    ★ {title.averageRating.toFixed(1)} · {title.reviewCount} review
                    orang tua
                  </span>
                )}
              </div>

              {title.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {title.tags.slice(0, 5).map((t) => (
                    <span
                      key={t.id}
                      className="rounded-full border border-white/20 px-2.5 py-0.5 text-xs font-semibold text-white/70"
                    >
                      {t.name}
                    </span>
                  ))}
                </div>
              )}

              {/* CTAs */}
              {(showTrailer || article.html) && (
                <div className="mt-6 flex flex-wrap gap-3">
                  {showTrailer && (
                    <a
                      href="#trailer"
                      className="press inline-flex items-center gap-2 rounded-full bg-yellow px-5 py-2.5 text-sm font-extrabold text-ink hover:bg-yellow-600"
                    >
                      <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden>
                        <path fill="currentColor" d="M8 5.5v13l11-6.5z" />
                      </svg>
                      Putar Trailer
                    </a>
                  )}
                  {article.html && (
                    <a
                      href="#ulasan"
                      className="press inline-flex items-center rounded-full border border-white/25 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/10"
                    >
                      Baca Review
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
        {/* signature score box — overlaps the hero so the yellow hinge
            bridges the dark band and the reading surface below */}
        {showScore && (
          <div className="relative z-10 -mt-10 sm:-mt-14">
            <ScorePanel score={score} title={title} />
          </div>
        )}

        {/* ================= trailer ================= */}
        {showTrailer && trailer && (
          <section id="trailer" className="mt-12 scroll-mt-24 sm:mt-16">
            <div className="mx-auto max-w-4xl">
              <header className="mb-4">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-pink">
                  Video
                </p>
                <h2 className="mt-1.5 text-xl font-extrabold sm:text-2xl">
                  Tonton Trailer Resmi
                </h2>
              </header>
              <TrailerPlayer youtubeId={trailer.id} title={title.name} />
            </div>
          </section>
        )}

        {/* ================= article ================= */}
        {article.html && (
          <section
            id="ulasan"
            className="mt-14 flex justify-center scroll-mt-24 sm:mt-16"
          >
            <div className="w-full max-w-[46rem]">
              {article.toc.length >= 3 ? (
                <nav
                  aria-label="Daftar isi"
                  className="mb-9 rounded-2xl border border-line bg-surface p-5 sm:p-6"
                >
                  <p className="mb-3.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-pink">
                    Daftar Isi
                  </p>
                  <ol className="grid gap-1 sm:grid-cols-2">
                    {article.toc.map((item, i) => (
                      <li key={item.id}>
                        <a
                          href={`#${item.id}`}
                          className="press flex items-baseline gap-2.5 rounded-md px-1.5 py-1 text-sm font-semibold text-ink hover:text-pink"
                        >
                          <span className="tabular text-xs font-extrabold text-muted">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          {item.text}
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>
              ) : (
                <header className="mb-7">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-pink">
                    Ulasan
                  </p>
                  <h2 className="mt-1.5 text-2xl font-extrabold sm:text-3xl">
                    Review Lengkap &amp; Sinopsis
                  </h2>
                </header>
              )}

              <div
                className="article-prose"
                dangerouslySetInnerHTML={{ __html: article.html }}
              />
            </div>
          </section>
        )}

        {/* ================= member reviews ================= */}
        <section id="review-member" className="mt-14 scroll-mt-24 sm:mt-16">
          <div className="mx-auto max-w-[46rem]">
            <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-pink">
                  Komunitas
                </p>
                <h2 className="mt-1.5 text-xl font-extrabold sm:text-2xl">
                  Review Member
                </h2>
              </div>
              <p className="text-xs font-semibold text-muted">
                Wajib login · Ditinjau admin sebelum tampil
              </p>
            </header>

            <div className="mt-5">
              <ReviewWriter
                slug={slug}
                postId={title.id}
                wpSite={WP_SITE}
                returnPath={siteUrl(`/content/${slug}`)}
              />
              <Suspense fallback={<ReviewsSkeleton />}>
                <MemberReviews postId={title.id} permalink={title.permalink} />
              </Suspense>
            </div>
          </div>
        </section>

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
    </>
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
