import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdSlot } from "@/components/AdSlot";
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
import {
  ADSENSE,
  CATEGORIES,
  SITE,
  SITE_AUTHOR,
  WP_SITE,
  AGE_TAGS,
  productPermalink,
  siteUrl,
} from "@/lib/config";
import { fetchRelated, fetchTitleBySlug } from "@/lib/store";
import { stripTags, clamp, metaDescription } from "@/lib/utils";
import type { Title } from "@/lib/types";

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

      {/* ============ head — the legacy page opens with the H1, then the
           breadcrumb, then the top ad slot, then the media row ============ */}
      <div className="bg-surface">
        <div className="mx-auto max-w-[1200px] px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
          <h1 className="text-[2rem] font-bold leading-[1.1] tracking-tight text-ink sm:text-[2.6rem]">
            {title.name}
          </h1>

          <nav className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-muted">
            <Link href="/" className="transition hover:text-pink">
              Beranda
            </Link>
            <span aria-hidden>/</span>
            {category && categoryPath && (
              <>
                <Link href={categoryPath} className="transition hover:text-pink">
                  {category.name}
                </Link>
                <span aria-hidden>/</span>
              </>
            )}
            <span className="font-medium text-ink">{title.name}</span>
          </nav>

          {/* Screenscore_top_product */}
          <AdSlot
            slot={ADSENSE.slots.topProduct}
            label="Screenscore_top_product"
            className="mt-6"
          />

          <div className="mt-7 flex flex-col gap-7 sm:flex-row sm:gap-9">
            {/* poster — the legacy gallery frame: plain white card, no halo.
                Full-bleed on phones (the column is only ~360px wide there),
                then the fixed 46/56 thumb widths from sm up. */}
            <div
              className="relative w-full shrink-0 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-line sm:w-48 lg:w-56"
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

            {/* summary block — chips, short description, score, tags */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-2 text-[11px] font-extrabold uppercase tracking-wide">
                {category && (
                  <span className="rounded bg-pink px-2.5 py-1 text-white">
                    {category.name}
                  </span>
                )}
                {title.year && (
                  <span className="rounded border border-line bg-white px-2.5 py-1 text-muted">
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

              {title.excerpt && (
                <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted sm:text-base">
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
                  <span className="tabular text-sm font-semibold text-muted">
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
                      className="rounded-full border border-line bg-white px-2.5 py-0.5 text-xs font-semibold text-muted"
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
                      className="press inline-flex items-center gap-2 rounded bg-yellow px-5 py-2.5 text-sm font-bold text-ink hover:bg-yellow-600"
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
                      className="press inline-flex items-center rounded border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink hover:border-ink"
                    >
                      Baca Review
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* signature score box — sits on the page field instead of
              straddling a dark hero band */}
          {showScore && (
            <div className="mt-8">
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

        {/* ================= review gate — the legacy page prints the
            "login atau daftar" box above the article ================= */}
        <section className="mt-10">
          <div className="mx-auto max-w-[46rem]">
            <ReviewWriter
              slug={slug}
              postId={title.id}
              wpSite={WP_SITE}
              returnPath={siteUrl(`/content/${slug}`)}
            />
          </div>
        </section>

        {/* ================= article ================= */}
        {article.html && (
          <section id="ulasan" className="mt-12 scroll-mt-24 sm:mt-14">
            <div className="w-full max-w-[62rem]">
              {article.toc.length >= 3 ? (
                <nav
                  aria-label="Daftar isi"
                  className="mb-9 rounded-xl border border-line bg-white p-5 sm:p-6"
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
                  <h2 className="mt-1.5 text-2xl font-bold sm:text-3xl">
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

        {/* ================= about writer ================= */}
        <section className="mt-14 max-w-[62rem]">
          <h2 className="text-[1.6rem] font-bold tracking-tight text-ink">
            About Writer
          </h2>
          <div className="mt-4 flex gap-4 rounded-xl bg-[#f7f5f2] p-5 sm:gap-5 sm:p-6">
            <span
              aria-hidden
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-yellow text-lg font-bold text-ink"
            >
              {SITE_AUTHOR.name.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="text-base font-bold text-ink">{SITE_AUTHOR.name}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                {SITE_AUTHOR.bio}
              </p>
            </div>
          </div>
        </section>

        {/* ================= member reviews ================= */}
        <section id="review-member" className="mt-14 scroll-mt-24 sm:mt-16">
          <div className="max-w-[62rem]">
            <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-pink">
                  Komunitas
                </p>
                <h2 className="mt-1.5 text-xl font-bold sm:text-2xl">
                  Review Member
                </h2>
              </div>
              <p className="text-xs font-semibold text-muted">
                Wajib login · Ditinjau admin sebelum tampil
              </p>
            </header>

            <div className="mt-5">
              <Suspense fallback={<ReviewsSkeleton />}>
                <MemberReviews postId={title.id} permalink={title.permalink} />
              </Suspense>
            </div>
          </div>
        </section>

        {/* Konten Lainnya — related titles cost a second Store API round trip
            (~2.8s cold), so they stream in behind the article. */}
        {category && (
          <Suspense fallback={<RelatedGridSkeleton />}>
            <RelatedGrid
              categorySlug={category.slug}
              excludeSlug={title.slug}
              tagSlugs={title.tags.map((t) => t.slug)}
            />
          </Suspense>
        )}
        </div>
      </div>
    </>
  );
}

/**
 * "Konten Lainnya" — the legacy page closes with a four-up card grid of
 * sibling titles. Card anatomy mirrors the Elementor post card: image on
 * top, title, then a small caps READ MORE.
 */
async function RelatedGrid({
  categorySlug,
  excludeSlug,
  tagSlugs,
}: {
  categorySlug: string;
  excludeSlug: string;
  tagSlugs: string[];
}) {
  const related = await fetchRelated(
    categorySlug,
    excludeSlug,
    8,
    tagSlugs,
  ).catch(() => []);
  if (!related.length) return null;

  return (
    <section className="mt-14">
      <h2 className="text-[1.9rem] font-bold tracking-tight text-ink sm:text-[2.1rem]">
        Konten Lainnya
      </h2>
      <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-[35px] lg:grid-cols-4">
        {related.slice(0, 4).map((t) => (
          <RelatedCard key={t.id} title={t} />
        ))}
      </div>
    </section>
  );
}

function RelatedCard({ title }: { title: Title }) {
  const poster = title.images[0];
  return (
    <Link
      href={`/content/${title.slug}`}
      className="press group flex h-full flex-col overflow-hidden rounded-lg bg-white shadow-sm hover:shadow-md"
    >
      <div
        className="relative w-full overflow-hidden bg-surface"
        style={{ aspectRatio: "4 / 5" }}
      >
        {poster ? (
          <Image
            src={poster.src}
            alt={poster.alt || title.name}
            fill
            sizes="(min-width: 1024px) 25vw, 50vw"
            quality={70}
            className="object-cover"
          />
        ) : (
          <div className="grid h-full place-items-center p-3 text-center text-xs font-semibold text-muted">
            {title.name}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="line-clamp-2 text-[15px] font-bold leading-snug text-ink group-hover:text-pink">
          {title.name}
        </p>
        <span className="mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted transition group-hover:text-pink">
          Read More
        </span>
      </div>
    </Link>
  );
}

/** Four white card shells — the same footprint as the streamed-in grid. */
function RelatedGridSkeleton() {
  return (
    <section className="mt-14" aria-busy="true">
      <div className="h-9 w-56 rounded skeleton" />
      <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-[35px] lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-lg bg-white shadow-sm">
            <div className="skeleton w-full" style={{ aspectRatio: "4 / 5" }} />
            <div className="p-4">
              <div className="skeleton h-4 w-4/5 rounded" />
              <div className="skeleton mt-3 h-3 w-20 rounded" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
