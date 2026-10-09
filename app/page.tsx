import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { HomeFaq } from "@/components/HomeFaq";
import { SearchForm } from "@/components/SearchForm";
import { SliderSkeleton } from "@/components/SliderSkeleton";
import { TitleRail } from "@/components/TitleRail";
import { PosterSlider } from "@/components/PosterSlider";
import { VideoFacade } from "@/components/VideoFacade";
import { CATEGORIES, SITE, siteUrl } from "@/lib/config";
import { fetchLatest, fetchTitles } from "@/lib/store";
import { catchUpstreamBuild } from "@/lib/http";
import { toCard } from "@/lib/utils";
import type { Title } from "@/lib/types";

export const revalidate = 300;

const siteSearchAction = {
  "@type": "SearchAction",
  target: {
    "@type": "EntryPoint",
    urlTemplate: `${siteUrl("/search")}?q={search_term_string}`,
  },
  "query-input": "required name=search_term_string",
};

/**
 * The legacy homepage's textured band: a stock desk photo washed out to
 * near-white (95% overlay, exactly as the Elementor kit does it) so the
 * charcoal headings keep their contrast.
 */
const BAND_IMAGE =
  "https://screenscore.digitalmama.id/wp-content/uploads/2024/01/services9.jpg";

/** The promo video the reference embeds under the search band. */
const YT_RECOMMEND = "RUM5Ffp9WOA";

/** Carousel column counts, straight from the reference widget. */
const HEAD_COLS = { desktop: 5, tablet: 2, mobile: 2 };

/**
 * Streaming layout — the page itself never awaits WordPress.
 *
 * `HomePage` renders synchronously so the shell (header, headings, CTAs,
 * search band) flushes on the first byte; each data-backed block sits in its
 * own `<Suspense>` and streams in behind a skeleton with identical geometry.
 * Before this, one top-level `await Promise.all(...)` held the entire
 * document hostage: PageSpeed measured first paint at 8.1s on mobile because
 * nothing painted until all four upstream fetches finished.
 */

/** Legacy outline button: pink hairline, 4px radius, 15px medium. */
function OutlineLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      /*
        `pink` measures 3.69:1 on the surface field — fine for a 3px border,
        short of AA for the 15px label itself. The label therefore uses
        `pink-600` (4.80:1) while the hairline and the hover fill keep the
        brighter brand pink.
      */
      className="press inline-flex min-h-11 items-center justify-center rounded-[4px] border border-pink px-6 py-[13px] text-[15px] font-medium text-pink-600 transition hover:bg-pink hover:text-white"
    >
      {children}
    </Link>
  );
}

/** Section heading + blurb + centred button (the two CTA blocks). */
function CenteredCta({
  id,
  heading,
  blurb,
  href,
  cta,
  className = "py-14 sm:py-16",
}: {
  id: string;
  heading: string;
  blurb: string;
  href: string;
  cta: string;
  className?: string;
}) {
  return (
    <section
      className={`text-center ss-reveal ${className}`}
      ss-reveal=""
      aria-labelledby={id}
      /* ScrollReveal writes data-ss-reveal after SSR but before this
         streamed segment hydrates — tell React not to diff it. */
      suppressHydrationWarning
    >
      <h2
        id={id}
        className="text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink sm:text-[2.6rem] lg:text-[3rem]"
      >
        {heading}
      </h2>
      <p className="mx-auto mt-2 max-w-[44rem] text-base text-muted">{blurb}</p>
      <div className="mt-6">
        <OutlineLink href={href}>{cta}</OutlineLink>
      </div>
    </section>
  );
}

/** The head carousel: newest titles across the whole catalogue. */
async function HeadCarousel() {
  const latest = await fetchTitles({
    perPage: 12,
    orderby: "date",
    order: "desc",
  })
    .then((p) => p.items)
    .catch(catchUpstreamBuild<Title[]>([]));

  if (!latest.length) return null;
  return (
    <PosterSlider
      items={latest.slice(0, 6).map(toCard)}
      cols={HEAD_COLS}
      label="Terbaru"
      autoplay
    />
  );
}

/**
 * Dark promo band. `fetchLatest("film")` is React `cache()`d per request, so
 * this shares its upstream call with the "Top Picks Film" row even though the
 * two run in separate Suspense boundaries.
 */
async function PromoBand() {
  const film = await fetchLatest("film", 8).catch(
    catchUpstreamBuild<Title[]>([]),
  );

  // The promo band promotes one title with a written hook, like the legacy
  // "Best Recommend On YouTube" block.
  const promo = film.find((t) => t.excerpt) ?? film[0];
  if (!promo) return null;
  // The wide slot wants the backdrop when the product has one; otherwise the
  // poster cropped to 16:9 is still the best frame we have.
  const promoImage = promo.images[1]?.src ?? promo.images[0]?.src;

  return (
    <section className="bg-ink" aria-labelledby="promo-heading">
      <div className="ss-container grid items-center gap-8 py-14 sm:py-16 lg:grid-cols-2 lg:gap-12 lg:py-20">
        <Link
          href={`/content/${promo.slug}`}
          className="press group relative block aspect-video w-full overflow-hidden rounded-xl bg-ink-3"
          aria-label={`Buka ${promo.name}`}
        >
          {promoImage && (
            <Image
              src={promoImage}
              alt=""
              fill
              loading="lazy"
              quality={70}
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover opacity-70 transition duration-500 group-hover:scale-[1.03] group-hover:opacity-90"
            />
          )}
          <span
            aria-hidden
            className="absolute inset-0 bg-gradient-to-tr from-ink/70 via-ink/25 to-transparent"
          />
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid h-16 w-16 place-items-center rounded-full border border-white/80 text-white transition duration-300 group-hover:scale-110 group-hover:border-pink group-hover:bg-pink/90">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5.5v13l11-6.5-11-6.5z" />
              </svg>
            </span>
          </span>
        </Link>

        <div className="max-w-xl">
          <p className="flex items-center gap-2.5 text-[1.15rem] font-semibold text-white">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              aria-hidden
              className="shrink-0 text-[#ff0000]"
            >
              <path
                fill="currentColor"
                d="M23.5 6.9a3 3 0 0 0-2.1-2.1C19.6 4.3 12 4.3 12 4.3s-7.6 0-9.4.5A3 3 0 0 0 .5 6.9C0 8.7 0 12 0 12s0 3.3.5 5.1a3 3 0 0 0 2.1 2.1c1.8.5 9.4.5 9.4.5s7.6 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.8.5-5.1.5-5.1s0-3.3-.5-5.1zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z"
              />
            </svg>
            Best Recommend On YouTube
          </p>

          <h2
            id="promo-heading"
            className="mt-4 text-[1.85rem] font-semibold leading-[1.12] tracking-tight text-[#f2f5f7] sm:text-[2.4rem]"
          >
            {promo.name}
          </h2>
          <p className="mt-3 text-base leading-relaxed text-white/80">
            {promo.excerpt}
          </p>

          <Link
            href={`/content/${promo.slug}`}
            className="press mt-6 inline-flex min-h-11 items-center rounded-[4px] border border-white/40 px-6 py-[13px] text-[15px] font-medium text-white transition hover:border-pink hover:bg-pink"
          >
            Baca review lengkap
          </Link>
        </div>
      </div>
    </section>
  );
}

/** Placeholder band matching `PromoBand`'s box so the swap shifts nothing. */
function PromoSkeleton() {
  return (
    <div className="bg-ink" aria-hidden>
      <div className="ss-container grid items-center gap-8 py-14 sm:py-16 lg:grid-cols-2 lg:gap-12 lg:py-20">
        <div
          className="w-full animate-pulse rounded-xl bg-ink-3"
          style={{ aspectRatio: "16 / 9" }}
        />
        <div className="max-w-xl">
          <div className="h-6 w-56 animate-pulse rounded bg-ink-3" />
          <div className="mt-4 h-9 w-3/4 animate-pulse rounded bg-ink-3" />
          <div className="mt-3 h-4 w-full animate-pulse rounded bg-ink-3" />
          <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-ink-3" />
          <div className="mt-6 h-11 w-56 animate-pulse rounded bg-ink-3" />
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              name: SITE.name,
              url: siteUrl("/"),
              inLanguage: "id",
              potentialAction: siteSearchAction,
            },
            {
              "@type": "Organization",
              name: SITE.name,
              url: siteUrl("/"),
              description: SITE.tagline,
            },
          ],
        }}
      />

      <div className="bg-surface">
        {/* ============ newest across the catalogue — the head carousel ============ */}
        <div className="ss-container pt-8 sm:pt-10">
          {/* suppressHydrationWarning: ScrollReveal marks this wrapper
              visible before its streamed content hydrates. */}
          <div className="ss-reveal" ss-reveal="" suppressHydrationWarning>
            <Suspense fallback={<SliderSkeleton cols={HEAD_COLS} label="Terbaru" />}>
              <HeadCarousel />
            </Suspense>
          </div>

          <TitleRail
            id="top-picks-film"
            heading="Top Picks Film"
            blurb="Pilihan film dan series buat kamu"
            category="film"
          />
          <TitleRail
            id="top-picks-game"
            heading="Top Picks Game"
            blurb="Pilihan game buat kamu"
            category="game"
          />
          <TitleRail
            id="top-picks-ebooks"
            heading="Top Picks E-books"
            blurb="Pilihan E-book buat kamu"
            category="e-books"
          />
        </div>

        {/* ============ CTA #1 ============ */}
        <div className="ss-container">
          <CenteredCta
            id="film-anak"
            heading="Film Terbaik untuk Anak"
            blurb="Lihat hasil review dari tontonan anak berikut"
            href={CATEGORIES.film.path}
            cta="Lihat Semua Film"
          />
        </div>

        {/* ============ search band + the promo video riding its lower edge ============ */}
        <section
          className="ss-reveal"
          ss-reveal=""
          aria-labelledby="home-search"
          suppressHydrationWarning
          style={{
            backgroundColor: "#f3f5f7",
            backgroundImage: `linear-gradient(rgba(245, 245, 245, 0.95), rgba(245, 245, 245, 0.95)), url(${BAND_IMAGE})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="ss-container pb-0 pt-16 sm:pt-24">
            <div className="mx-auto max-w-[760px] text-center">
              <h1
                id="home-search"
                className="text-[2rem] font-medium leading-[1.3] tracking-tight text-ink sm:text-[2.45rem]"
              >
                Cari Review Film Favoritmu Sekarang
              </h1>
              <p className="mx-auto mt-3 max-w-[36rem] text-base text-muted">
                Cari tontonan terbaik untuk anak sekarang juga
              </p>
              <div className="mx-auto mt-7 max-w-[750px]">
                <SearchForm variant="boxed" />
              </div>
            </div>

            <div className="mx-auto -mb-16 mt-8 w-full max-w-[760px] overflow-hidden rounded-[20px] shadow-[0_55px_50px_-40px_#212121] sm:-mb-24 sm:mt-12">
              <div className="relative aspect-video w-full bg-ink">
                <VideoFacade
                  youtubeId={YT_RECOMMEND}
                  title="Rekomendasi ScreenScore di YouTube"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ============ CTA #2 ============ */}
        <div className="ss-container">
          <CenteredCta
            id="game-anak"
            heading="Game"
            blurb="Lihat hasil review dari game anak berikut"
            href={CATEGORIES.game.path}
            cta="Lihat Semua Game"
            /* the promo video above overhangs this section by ~96px */
            className="pt-36 pb-14 sm:pt-48 sm:pb-16"
          />
        </div>

        {/* ============ YouTube promo — dark editorial band (streams) ============
            The reveal marker lives on this static wrapper — a streamed section
            would otherwise miss ScrollReveal's hydration scan and stay stuck
            at opacity 0. */}
        <div className="ss-reveal" ss-reveal="" suppressHydrationWarning>
          <Suspense fallback={<PromoSkeleton />}>
            <PromoBand />
          </Suspense>
        </div>

        {/* ============ FAQ ============ */}
        <HomeFaq />
      </div>
    </>
  );
}
