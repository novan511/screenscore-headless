import Link from "next/link";
import { AgeChips } from "@/components/AgeChips";
import { ArticleCard } from "@/components/ArticleCard";
import { Hero } from "@/components/Hero";
import { JsonLd } from "@/components/JsonLd";
import { PosterCard, TitleGrid } from "@/components/PosterCard";
import { Rail } from "@/components/Rail";
import { SearchForm } from "@/components/SearchForm";
import { CATEGORIES, CATEGORY_LIST, SITE, siteUrl } from "@/lib/config";
import { fetchScreenScore } from "@/lib/bridge";
import { fetchHomeArticles } from "@/lib/blog";
import { fetchLatest } from "@/lib/store";
import type { ScreenScore, Title } from "@/lib/types";

export const revalidate = 300;

const siteSearchAction = {
  "@type": "SearchAction",
  target: {
    "@type": "EntryPoint",
    urlTemplate: `${siteUrl("/search")}?q={search_term_string}`,
  },
  "query-input": "required name=search_term_string",
};

/** Parent-facing trust signals shown as pills under the hero. */
const TRUST_PILLS = [
  { emoji: "⭐", label: "Skor ahli di setiap judul" },
  { emoji: "🎂", label: "Rating usia yang jelas" },
  { emoji: "👨‍👩‍👧", label: "Kurasi oleh orang tua" },
] as const;

/** Pastel patch + emoji per category door. */
const CATEGORY_TILES: Record<
  string,
  { bg: string; hover: string; emoji: string }
> = {
  film: { bg: "bg-blush", hover: "hover:border-pink", emoji: "🎬" },
  series: { bg: "bg-cream", hover: "hover:border-yellow-600", emoji: "📺" },
  game: { bg: "bg-sky", hover: "hover:border-sky-600", emoji: "🎮" },
  "e-books": { bg: "bg-mint", hover: "hover:border-mint-600", emoji: "📚" },
  aplikasi: { bg: "bg-lav", hover: "hover:border-lav-600", emoji: "📱" },
};

/** The six reviewflow safety dimensions shown in the methodology band. */
const SCORE_DIMENSIONS = [
  "Pesan Positif",
  "Kekerasan",
  "Merokok / Alkohol / Narkoba",
  "Dialog Kasar",
  "Adegan Seksual",
  "Keberagaman",
] as const;

export default async function HomePage() {
  const [film, game, series, ebooks, apps, articles] = await Promise.all([
    fetchLatest("film", 7),
    fetchLatest("game", 12),
    fetchLatest("series", 12),
    fetchLatest("e-books", 12),
    fetchLatest("aplikasi", 12),
    fetchHomeArticles(4),
  ]);

  const heroItems = film.slice(0, 7);
  const scores = await loadScores(heroItems);

  // Prefer a title with an editor score for the hero slot.
  const withScore = heroItems.find((t) => scores[t.slug]?.score != null);
  const featured = withScore ?? heroItems[0];
  const rest = heroItems.filter((t) => t.slug !== featured?.slug).slice(0, 6);

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
      {featured && (
        <Hero
          featured={featured}
          rest={rest}
          scores={scores}
        />
      )}

      <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
        {/* parent trust strip — the Common Sense Media promise, kid-sized */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {TRUST_PILLS.map((p) => (
            <span
              key={p.label}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-xs font-bold text-ink shadow-sm sm:text-sm"
            >
              <span aria-hidden>{p.emoji}</span> {p.label}
            </span>
          ))}
        </div>

        {/* age-band entry — the kid-safety promise of the product */}
        <section className="mt-8 rounded-3xl border border-pink/15 bg-blush p-5 sm:p-6 ss-reveal" ss-reveal="">
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-extrabold text-ink">
              🎂 Pilih sesuai usia anak
            </h2>
            <span className="text-sm text-muted">
              Setiap judul punya rating usia &amp; poin keamanan
            </span>
          </div>
          <div className="mt-4">
            <AgeChips basePath="/films" />
          </div>
        </section>

        <Rail
          heading="🎬 Film Terbaru"
          blurb="Review film pilihan untuk keluarga"
          href={CATEGORIES.film.path}
          items={film.slice(0, 12)}
        />

        {/* parenting articles — fresh picks from the Tips & Ulasan desk */}
        {articles.length > 0 && (
          <section className="mt-12 ss-reveal" ss-reveal="" aria-labelledby="articles-heading">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h2 id="articles-heading" className="text-xl font-extrabold sm:text-2xl">
                  💡 Tips & Artikel untuk Orang Tua
                </h2>
                <p className="mt-0.5 text-sm text-muted">
                  Panduan digital, ulasan, dan kabar pilihan dari redaksi
                </p>
              </div>
              <Link
                href="/blog"
                className="shrink-0 text-sm font-bold text-pink hover:underline"
              >
                Lihat semua artikel →
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {articles.map((post, i) => (
                <ArticleCard key={post.id} post={post} index={i} />
              ))}
            </div>
          </section>
        )}

        <Rail
          heading="🎮 Game & Aplikasi"
          blurb="Main dengan nilai positif"
          href={CATEGORIES.game.path}
          items={[...game.slice(0, 6), ...apps.slice(0, 6)]}
        />
        <Rail
          heading="📺 Serial Terbaru"
          blurb="Episode yang aman ditonton bersama"
          href={CATEGORIES.series.path}
          items={series}
        />
        <Rail
          heading="📚 E-Books"
          blurb="Tumbuhkan minat baca sejak dini"
          href={CATEGORIES["e-books"].path}
          items={ebooks}
        />

        {/* methodology — the E-E-A-T "how we review" band */}
        <section
          className="mt-14 rounded-3xl border border-sky-600/20 bg-sky p-6 sm:p-8 ss-reveal"
          ss-reveal=""
          aria-labelledby="method-heading"
        >
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-xl">
              <h2 id="method-heading" className="text-xl font-extrabold text-ink sm:text-2xl">
                🛡️ Bagaimana ScreenScore menilai
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink/75">
                Setiap judul ditinjau editor kami pada 6 dimensi keamanan untuk
                anak, lalu diberi Skor ScreenScore 0–5 — supaya orang tua bisa
                memutuskan dengan tenang sebelum menekan play.
              </p>
              <Link
                href="/tentang-kami"
                className="press mt-4 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-extrabold text-ink border border-line hover:border-pink hover:text-pink"
              >
                Pelajari metodologi kami →
              </Link>
            </div>
            <ul className="flex flex-wrap gap-2" aria-label="Dimensi penilaian">
              {SCORE_DIMENSIONS.map((d) => (
                <li
                  key={d}
                  className="rounded-full border border-sky-600/25 bg-white px-3.5 py-1.5 text-xs font-bold text-ink"
                >
                  {d}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* category doors */}
        <section className="mt-14 ss-reveal" ss-reveal="">
          <h2 className="mb-4 text-xl font-extrabold sm:text-2xl">
            🚪 Jelajahi Semua
          </h2>
          <TitleGrid className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {CATEGORY_LIST.map((c) => {
              const tile = CATEGORY_TILES[c.slug] ?? CATEGORY_TILES.film;
              return (
                <Link
                  key={c.slug}
                  href={c.path}
                  className={`press group rounded-2xl border border-white p-5 ${tile.bg} ${tile.hover}`}
                >
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-2xl shadow-sm transition-transform duration-300 ease-out group-hover:-rotate-6 group-hover:scale-125">
                    {tile.emoji}
                  </span>
                  <p className="mt-3 font-extrabold text-ink">{c.name}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    {c.blurb}
                  </p>
                </Link>
              );
            })}
          </TitleGrid>
        </section>

        {/* search CTA — pink band replaces the old black block */}
        <section className="relative mt-14 overflow-hidden rounded-3xl bg-pink p-8 text-center text-white sm:p-10 ss-reveal" ss-reveal="">
          <div
            aria-hidden
            className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-yellow/30 blur-2xl"
          />
          <div
            aria-hidden
            className="absolute -bottom-12 -right-6 h-44 w-44 rounded-full bg-white/15 blur-2xl"
          />
          <div className="relative">
            <h2 className="text-2xl font-extrabold sm:text-3xl">
              ✨ Cari review tontonan favoritmu
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/90">
              Ketik judul film, serial, game, atau e-book — kami tunjukkan skor
              keamanannya untuk anak.
            </p>
            <div className="mx-auto mt-5 max-w-lg">
              <SearchForm />
            </div>
          </div>
        </section>

        {/* latest reviewed grid */}
        <section className="mt-14 ss-reveal" ss-reveal="">
          <h2 className="mb-4 text-xl font-extrabold sm:text-2xl">
            🆕 Baru Ditambahkan
          </h2>
          <TitleGrid>
            {film.slice(0, 6).map((t) => (
              <PosterCard key={t.id} title={t} />
            ))}
          </TitleGrid>
        </section>
      </div>
    </>
  );
}

/** Editor scores for hero items only (bounded bridge fetches). */async function loadScores(items: Title[]): Promise<Record<string, ScreenScore | null>> {
  const entries = await Promise.all(
    items.slice(0, 7).map(async (t) => {
      try {
        return [t.slug, await fetchScreenScore(t.permalink)] as const;
      } catch {
        return [t.slug, null] as const;
      }
    }),
  );
  return Object.fromEntries(entries);
}
