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
  productPermalink,
  siteUrl,
} from "@/lib/config";
import { fetchRelated, fetchTitleBySlug } from "@/lib/store";
import {
  stripTags,
  clamp,
  metaDescription,
  sanitizeArticleHtml,
  imageDims,
} from "@/lib/utils";
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

/**
 * The legacy site ships two single-product templates:
 *
 *  - **watch** (film/series): a 330px poster column on the left, the H1 and
 *    breadcrumb in the right column, then trailer, teaser, Q&A, the
 *    reviewflow gate and the "Full Review" toggle. The legacy markup prints
 *    the H1 twice (desktop + mobile variant toggled by `elementor-hidden`);
 *    we mirror that so the phone layout reads H1 → breadcrumb → full-bleed
 *    poster exactly like the reference.
 *  - **full width** (game/e-books/aplikasi): everything stacked full width
 *    with the whole gallery rendered above the copy, no Q&A / Full Review.
 *
 * Both render the short description *raw* — the same HTML WordPress serves —
 * so "Sinopsis:", the fact list and the section headings inside it land where
 * the legacy page puts them.
 */
const WATCH_CATEGORIES = new Set(["film", "series"]);

/** Long-form WP HTML with `<h1>` demoted — the document already owns the H1. */
function proseHtml(html: string): string {
  return sanitizeArticleHtml(html).replace(
    /<\/?h1>/g,
    (tag) => (tag === "</h1>" ? "</h2>" : "<h2>"),
  );
}

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
  const categoryPath = category
    ? CATEGORIES[category.slug]?.path ?? "/films"
    : null;
  const isWatch = !!category && WATCH_CATEGORIES.has(category.slug);
  const showTrailer = isWatch && !!trailer;
  const posterDims = poster
    ? imageDims(poster.srcSet, poster.src)
    : null;

  // The teaser is the product short description exactly as WP prints it —
  // intro, "Genre:" bullet list, "Sinopsis:" label and every section after.
  const teaserHtml = title.shortDescription
    ? proseHtml(title.shortDescription)
    : "";
  const descriptionHtml = title.description
    ? proseHtml(title.description)
    : "";

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

  const breadcrumb = (
    <nav
      aria-label="Breadcrumb"
      className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[15px] leading-[1.6] text-muted"
    >
      <Link href="/" className="transition hover:text-pink-600">
        Beranda
      </Link>
      <span aria-hidden>/</span>
      {category && categoryPath && (
        <>
          <Link href={categoryPath} className="transition hover:text-pink-600">
            {category.name}
          </Link>
          <span aria-hidden>/</span>
        </>
      )}
      <span>{title.name}</span>
    </nav>
  );

  const adSlot = (
    <AdSlot
      slot={ADSENSE.slots.topProduct}
      label="Screenscore_top_product"
      className="mt-3"
    />
  );

  const teaser = teaserHtml ? (
    <div className="teaser" dangerouslySetInnerHTML={{ __html: teaserHtml }} />
  ) : null;

  const scorePanel = score ? (
    <div className="mt-10">
      <ScorePanel score={score} title={title} />
    </div>
  ) : null;

  const reviewGate = (
    <ReviewWriter
      slug={slug}
      postId={title.id}
      wpSite={WP_SITE}
      returnPath={siteUrl(`/content/${slug}`)}
    />
  );

  const description = descriptionHtml ? (
    <div
      className="article-prose"
      dangerouslySetInnerHTML={{ __html: descriptionHtml }}
    />
  ) : null;

  // "Konten Lainnya" sits further away from About Writer on the watch
  // template than on the full-width one — measured off the reference.
  const relatedGap = isWatch ? "mt-[140px]" : "mt-[72px]";

  return (
    <>
      <JsonLd data={structuredData} />

      <div className="bg-surface">
        <div className="ss-container pb-16 pt-8 sm:pt-[70px]">
          {isWatch ? (
            <>
              {/* phone: H1 + breadcrumb first, poster below them */}
              <div className="sm:hidden">
                <h1 className="text-[2rem] font-normal leading-[1.4] text-ink">
                  {title.name}
                </h1>
                {breadcrumb}
              </div>

              <div className="flex flex-col gap-6 sm:flex-row sm:gap-x-[30px]">
                {/* Poster — full-bleed on phones, filling the 330px column
                    from `sm` up.

                    This used to be capped at a 184px "gallery thumb", which
                    left 146px of dead space beside it and threw away most of
                    the source resolution: sampling the catalogue, 11 of 12
                    titles ship a 460–739px wide image, all of which were being
                    shrunk to 184px. At full column width those render
                    downscaled and crisp. The aspect ratio still comes from the
                    real image, so the handful of portrait uploads (e.g. Anora,
                    184×273) simply come out taller rather than being cropped. */}
                {poster && (
                  /* self-start: hug the poster instead of stretching to the
                     full row height (the box would otherwise match the whole
                     right column). */
                  <div className="mt-5 shrink-0 self-start sm:mt-0 sm:w-[330px]">
                    <div
                      className="relative w-full overflow-hidden rounded bg-white"
                      style={{
                        aspectRatio: posterDims
                          ? `${posterDims.w} / ${posterDims.h}`
                          : "2 / 3",
                      }}
                    >
                      <Image
                        src={poster.src}
                        alt={poster.alt || title.name}
                        fill
                        priority
                        /* Must describe the real slot — the browser picks the
                           srcset entry from this, and at 184px it could never
                           choose anything below w=640. */
                        sizes="(max-width: 640px) 100vw, 330px"
                        quality={75}
                        className="object-cover"
                      />
                    </div>
                  </div>
                )}

                <div className="min-w-0 flex-1 sm:pl-2.5">
                  <h1 className="hidden text-[2rem] font-normal leading-[1.4] text-ink sm:block sm:text-[47px]">
                    {title.name}
                  </h1>
                  <div className="hidden sm:block">{breadcrumb}</div>

                  {adSlot}

                  {showTrailer && trailer && (
                    <div className="mt-6">
                      <TrailerPlayer
                        youtubeId={trailer.id}
                        title={title.name}
                      />
                    </div>
                  )}

                  {teaser && <div className="mt-4">{teaser}</div>}

                  {scorePanel}

                  {/* Questions & Answers — static reviewflow markup, the
                      legacy widget has no guest ask form either. */}
                  <div className="mt-10 max-w-[640px]">
                    <h3 className="inline-block border-b-[3px] border-[#f8ff00] pb-3 text-[20px] font-bold leading-[1.2] text-ink">
                      Questions &amp; Answers
                    </h3>
                    <p className="mt-5 rounded-lg bg-[#f8f8f8] p-4 text-center text-sm text-[#666]">
                      Please log in to ask a question.
                    </p>
                    <div className="mt-4">
                      <p className="rounded-xl border-2 border-dashed border-[#e0e0e0] bg-[#f8f8f8] p-8 text-center text-sm text-[#666]">
                        No questions yet. Be the first to ask!
                      </p>
                    </div>
                  </div>

                  <div className="mt-10">{reviewGate}</div>

                  {/* Full Review — the legacy popup becomes a native inline
                      disclosure carrying the member reviews. */}
                  <details id="review-member" className="mt-5 scroll-mt-[var(--ss-header-h)]">
                    <summary className="press inline-flex cursor-pointer list-none items-center rounded-lg border-2 border-[#f8ff00] bg-[#f8ff00] px-6 py-2.5 text-sm font-semibold leading-[25.6px] text-[#1a1a1a] hover:border-[#d4db00] hover:bg-[#d4db00]">
                      Full Review
                    </summary>
                    <Suspense fallback={<ReviewsSkeleton />}>
                      <MemberReviews
                        postId={title.id}
                        permalink={title.permalink}
                      />
                    </Suspense>
                  </details>

                  {description && <div className="mt-10">{description}</div>}

                  <AboutWriter className="mt-5" />
                </div>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-[30px] font-normal leading-[1.3] text-ink">
                {title.name}
              </h1>
              {breadcrumb}
              {adSlot}

              {/* whole gallery stacked, natural size capped at the column */}
              {title.images.length > 0 && (
                <div className="mt-6 space-y-5">
                  {title.images.map((img, i) => {
                    const dims = imageDims(img.srcSet, img.src);
                    return (
                      <Image
                        key={img.src}
                        src={img.src}
                        alt={img.alt || title.name}
                        width={dims?.w ?? 1200}
                        height={dims?.h ?? 800}
                        priority={i === 0}
                        sizes="(max-width: 1200px) 100vw, 1180px"
                        quality={75}
                        className="h-auto max-w-full rounded-lg"
                      />
                    );
                  })}
                </div>
              )}

              {teaser && <div className="mt-6">{teaser}</div>}

              {scorePanel}

              <div className="mt-5">{reviewGate}</div>

              {description && <div className="mt-28">{description}</div>}

              <AboutWriter className="mt-12" />
            </>
          )}

          {/* Konten Lainnya — related titles cost a second Store API round
              trip (~2.8s cold), so they stream in behind the copy. */}
          {category && (
            <Suspense
              fallback={<RelatedGridSkeleton gapClass={relatedGap} />}
            >
              <RelatedGrid
                categorySlug={category.slug}
                excludeSlug={title.slug}
                tagSlugs={title.tags.map((t) => t.slug)}
                gapClass={relatedGap}
              />
            </Suspense>
          )}
        </div>
      </div>
    </>
  );
}

/** "About Writer" — name + bio on the gray card the legacy author box prints. */
function AboutWriter({ className = "" }: { className?: string }) {
  return (
    <section className={className}>
      <h3 className="text-[32px] font-semibold leading-[1.2] text-ink">
        About Writer
      </h3>
      <div className="mt-5 rounded-xl bg-[#f1f1f1] px-6 py-4 sm:pl-[72px]">
        <p className="text-base font-bold leading-[1.5] text-ink">
          {SITE_AUTHOR.name}
        </p>
        <p className="mt-1.5 text-base leading-[1.75] text-muted">
          {SITE_AUTHOR.bio}
        </p>
      </div>
    </section>
  );
}

/**
 * "Konten Lainnya" — the legacy page closes with a four-up card grid of
 * sibling titles. Card anatomy mirrors the Elementor post card: image on
 * top, 21px title, then a small caps READ MORE.
 */
async function RelatedGrid({
  categorySlug,
  excludeSlug,
  tagSlugs,
  gapClass,
}: {
  categorySlug: string;
  excludeSlug: string;
  tagSlugs: string[];
  gapClass: string;
}) {
  const related = await fetchRelated(
    categorySlug,
    excludeSlug,
    8,
    tagSlugs,
  ).catch(() => []);
  if (!related.length) return null;

  return (
    <section className={gapClass}>
      <h2 className="text-[2rem] font-semibold leading-[1.25] text-ink sm:text-[3rem]">
        Konten Lainnya
      </h2>
      <div className="mt-5 grid grid-cols-2 gap-x-[30px] gap-y-[30px] lg:grid-cols-4">
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
      <div className="flex flex-1 flex-col px-[30px] pb-[30px] pt-5">
        <h3 className="text-[21px] font-semibold leading-[1.2] text-ink group-hover:text-pink-600">
          {title.name}
        </h3>
        <span className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted transition group-hover:text-pink-600">
          Read More
        </span>
      </div>
    </Link>
  );
}

/** Four white card shells — the same footprint as the streamed-in grid. */
function RelatedGridSkeleton({ gapClass }: { gapClass: string }) {
  return (
    <section className={gapClass} aria-busy="true">
      <div className="h-9 w-56 rounded skeleton" />
      <div className="mt-5 grid grid-cols-2 gap-x-[30px] gap-y-[30px] lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-lg bg-white shadow-sm">
            <div className="skeleton w-full" style={{ aspectRatio: "4 / 5" }} />
            <div className="px-[30px] pb-[30px] pt-5">
              <div className="skeleton h-6 w-4/5 rounded" />
              <div className="skeleton mt-3 h-3 w-20 rounded" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
